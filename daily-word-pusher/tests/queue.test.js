const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// 必须在加载 config 之前指定临时数据目录
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-test-'));
process.env.DEEPSEEK_API_KEY = '';
process.env.ADMIN_PASSWORD = 'test';

const store = require('../src/store');

function names(words) {
  return words.map((w) => w.word);
}

// 1. 解析与去重
const parsed = store.parseWordList('API\na,b\n1. embedding\nAPI\nmachine learning\n');
assert.deepStrictEqual(parsed, ['API', 'a', 'b', 'embedding', 'API', 'machine learning'], '解析结果不符合预期');

const { added, skipped } = store.addWords('API\nembedding\nlatency\nthroughput\nvector\ntoken\nprompt\n');
assert.strictEqual(added.length, 7);
assert.strictEqual(skipped.length, 0);

const dup = store.addWords('API\napi\n');
assert.deepStrictEqual(dup.added.map((w) => w.word), [], '大小写不同的重复词应被跳过');
assert.strictEqual(dup.skipped.length, 2);

// 2. 第一轮：前 5 个词
let p = store.preview(5);
assert.strictEqual(p.round, 1);
assert.deepStrictEqual(names(p.words), ['API', 'embedding', 'latency', 'throughput', 'vector']);
store.commit(p.words, p.round);

// 3. 第二轮：本轮剩 2 个 + 下一轮补齐 3 个
p = store.preview(5);
assert.strictEqual(p.round, 2);
assert.deepStrictEqual(names(p.words), ['token', 'prompt', 'API', 'embedding', 'latency']);
store.commit(p.words, p.round);

// 4. 新词优先：新上传的词应排在最前
store.addWords('gradient');
p = store.preview(5);
assert.strictEqual(p.words[0].word, 'gradient', '新词应优先推送');
assert.strictEqual(p.round, 3);

// 5. 词库不足一批时不应重复
const singleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-test2-'));
delete require.cache[require.resolve('../src/config')];
delete require.cache[require.resolve('../src/store')];
process.env.DATA_DIR = singleDir;
const store2 = require('../src/store');
store2.addWords('alpha\nbeta\n');
let q = store2.preview(5);
assert.strictEqual(q.words.length, 2, '词库不足时只推送已有单词');
assert.deepStrictEqual(q.words.map((w) => w.word), ['alpha', 'beta']);

// 6. 消息分块不超过企业微信字节上限
const wecom = require('../src/wecom');
const blocks = Array.from(
  { length: 40 },
  (_, i) => `**${i + 1}. word${i}**\n这是一条比较长的释义，用于测试分块逻辑是否会把内容切成多条消息。\n> example sentence here for testing the chunking behaviour of the wecom message.`
);
const parts = wecom.splitBlocks('### 每日单词 · 测试', blocks);
assert.ok(parts.length > 1, '超长内容应被拆分为多条消息');
for (const part of parts) {
  assert.ok(Buffer.byteLength(part, 'utf8') <= 4096, '单条消息超过企业微信限制');
}
assert.ok(parts.join('').includes('word0') && parts.join('').includes('word11'), '分块后不应丢词');

// 7. 推送设置：网页保存的值优先生效，非法值被拒绝
const eff = store.updateSettings({ wordsPerPush: 3, pushTime: '21:05' });
assert.strictEqual(eff.wordsPerPush, 3);
assert.strictEqual(eff.pushCron, '5 21 * * *');
assert.strictEqual(store.effectiveSettings().pushCron, '5 21 * * *');
assert.throws(() => store.updateSettings({ wordsPerPush: 0 }), RangeError);
assert.throws(() => store.updateSettings({ wordsPerPush: 16 }), RangeError);
assert.throws(() => store.updateSettings({ pushTime: '25:00' }), RangeError);
assert.throws(() => store.updateSettings({ pushTime: '8:5x' }), RangeError);

// 8. 生效设置影响预览条数
const p3 = store.preview(store.effectiveSettings().wordsPerPush);
assert.strictEqual(p3.words.length, 3, '设置 3 个/次后预览应只取 3 个词');

// 9. PushPlus 按字符上限分块
const pushplus = require('../src/pushplus');
const longBlocks = Array.from(
  { length: 30 },
  (_, i) => `**${i + 1}. word${i}**\n这是一条比较长的释义，用于验证 PushPlus 的字符分块逻辑，确保单条消息不会超过平台限制。`
);
const ppParts = pushplus.splitBlocks(longBlocks);
assert.ok(ppParts.length > 1, '超出字符上限应拆分');
for (const part of ppParts) {
  assert.ok(part.length <= pushplus.MAX_CHARS, '单条消息超过字符上限');
}
assert.ok(ppParts.join('').includes('word0') && ppParts.join('').includes('word29'), '分块后不应丢词');

// 10. 推送快照：凭 token 可读取当次推送内容
store.commit(p3.words, p3.round, { token: 'token-test' });
const daily = store.getDailyByToken('token-test');
assert.ok(daily, '应能按 token 取到推送快照');
assert.strictEqual(daily.words.length, 3);
assert.deepStrictEqual(daily.words.map((w) => w.word), p3.words.map((w) => w.word));
assert.strictEqual(store.getDailyByToken('missing'), null);

// 11. 飞书折叠卡片：每个单词一个面板、默认收起，无需公网链接
const feishu = require('../src/feishu');
const card = feishu.buildCard({
  title: '每日单词 · 测试',
  words: [
    { word: 'API', phonetic: '/eɪ piː aɪ/', customMeaning: 'n.（编程）应用程序编程接口', entries: [], example: 'Call the API.' },
    { word: 'diff', entries: [{ pos: 'n.', field: '编程', zh: '版本差异' }] },
  ],
  link: '',
});
assert.strictEqual(card.schema, '2.0');
assert.strictEqual(card.body.elements.length, 2, '每个单词一个折叠面板');
for (const panel of card.body.elements) {
  assert.strictEqual(panel.tag, 'collapsible_panel');
  assert.strictEqual(panel.expanded, false, '默认应为收起状态');
  assert.ok(panel.header.title.content.includes('**'), '面板标题使用 markdown');
  assert.ok(panel.elements[0].content.length > 0, '面板内容应有释义');
}
assert.ok(card.body.elements[0].elements[0].content.includes('应用程序编程接口'));
assert.ok(card.body.elements[1].elements[0].content.includes('版本差异'), 'AI 义项应包含词性与领域');
assert.ok(!card.body.elements.some((e) => e.tag === 'button'), '无公网地址时不应有跳转按钮');

const cardWithLink = feishu.buildCard({
  title: 't',
  words: [{ word: 'API', customMeaning: 'x' }],
  link: 'https://example.com/d/abc',
});
const btn = cardWithLink.body.elements.find((e) => e.tag === 'button');
assert.ok(btn && btn.url === 'https://example.com/d/abc', '配置公网地址后应附带跳转按钮');

console.log('✓ 全部测试通过');
