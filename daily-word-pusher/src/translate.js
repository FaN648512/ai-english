const config = require('./config');
const store = require('./store');

const SYSTEM_PROMPT = `你是专注互联网、人工智能、编程领域的技术英语词典编辑。用户给出英文单词或术语，你给出它在技术语境下的常用释义。

规则：
1. 若该词在互联网 / AI / 编程领域存在专业含义，必须优先给出这些领域的释义，并按技术场景中的常用度从高到低排序；技术义之后再补充通用义。
2. 每个义项标注词性与适用领域（field 可选值：AI、编程、互联网、通用）。
3. 中文释义精炼准确，单个义项不超过 30 个汉字，不要堆砌同义词。
4. 最多 4 个义项，去重；不确定的内容不要编造。
5. 例句优先技术语境，长度 8-20 个英文单词，并给出对应中文翻译。
6. 音标使用 IPA，不确定则留空字符串。
7. 只输出 JSON 对象，不要输出任何解释文字，格式如下：
{"word":"原词","phonetic":"/.../","entries":[{"pos":"n.","field":"AI","zh":"释义"}],"example":"英文例句","exampleZh":"中文翻译","note":""}
若拼写疑似有误，仍给出最接近的解释，并在 note 中简要提示。`;

function normalizeResult(raw, original) {
  const entries = Array.isArray(raw.entries)
    ? raw.entries
        .filter((e) => e && typeof e.zh === 'string' && e.zh.trim())
        .slice(0, 4)
        .map((e) => ({
          pos: typeof e.pos === 'string' ? e.pos.trim() : '',
          field: typeof e.field === 'string' ? e.field.trim() : '',
          zh: e.zh.trim(),
        }))
    : [];

  if (!entries.length) throw new Error('模型未返回有效释义');

  return {
    word: typeof raw.word === 'string' && raw.word.trim() ? raw.word.trim() : original,
    phonetic: typeof raw.phonetic === 'string' ? raw.phonetic.trim() : '',
    entries,
    example: typeof raw.example === 'string' ? raw.example.trim() : '',
    exampleZh: typeof raw.exampleZh === 'string' ? raw.exampleZh.trim() : '',
  };
}

function parseContent(content) {
  const text = String(content || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(text);
}

async function requestTranslation(word) {
  if (!config.deepseekKey) throw new Error('未配置 DEEPSEEK_API_KEY');

  const res = await fetch(`${config.deepseekBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseekKey}`,
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `单词：${word}` },
      ],
      temperature: 0.3,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`DeepSeek 请求失败 (${res.status})：${detail}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek 返回内容为空');
  return normalizeResult(parseContent(content), word);
}

const CONCURRENCY = 3;
const queue = [];
const queued = new Set();
let running = 0;

async function translateWordById(id) {
  const word = store.getWord(id);
  if (!word) return;
  store.updateWord(id, { translationStatus: 'pending', translationError: '' });
  try {
    const result = await requestTranslation(word.word);
    store.updateWord(id, {
      phonetic: result.phonetic,
      entries: result.entries,
      example: result.example,
      exampleZh: result.exampleZh,
      translationStatus: 'done',
      translationError: '',
    });
  } catch (err) {
    store.updateWord(id, {
      translationStatus: 'error',
      translationError: String(err.message || err).slice(0, 300),
    });
  }
}

function drain() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift();
    running += 1;
    translateWordById(id)
      .catch((err) => console.error('[translate] 未捕获异常：', err))
      .finally(() => {
        running -= 1;
        queued.delete(id);
        drain();
      });
  }
}

function schedule(ids) {
  for (const id of ids) {
    if (queued.has(id)) continue;
    queued.add(id);
    queue.push(id);
  }
  drain();
}

/** 等待指定单词翻译完成（用于推送前补齐释义），超时后返回已完成的进度 */
async function waitFor(ids, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  const targets = new Set(ids);
  while (Date.now() < deadline) {
    const remaining = [...targets].filter((id) => {
      const w = store.getWord(id);
      return w && (w.translationStatus === 'pending' || w.translationStatus === 'error');
    });
    if (!remaining.length) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

module.exports = {
  requestTranslation,
  translateWordById,
  schedule,
  waitFor,
};
