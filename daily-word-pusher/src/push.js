const crypto = require('crypto');
const config = require('./config');
const store = require('./store');
const translate = require('./translate');
const wecom = require('./wecom');
const pushplus = require('./pushplus');
const feishu = require('./feishu');
const { wordHeading, meaningLines } = require('./format');

function dateLabel(tz) {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: tz, month: 'long', day: 'numeric' }).format(new Date());
}

/** 当前生效的推送通道：飞书优先，其次 PushPlus、企业微信 */
function channelName() {
  if (config.feishuWebhook) return 'feishu';
  if (config.pushplusToken) return 'pushplus';
  if (config.wecomWebhook) return 'wecom';
  return null;
}

function headerLine(round, tz) {
  return `### 每日单词 · ${dateLabel(tz)}（第 ${round} 轮）`;
}

function blockOf(word, index) {
  const lines = [wordHeading(word, index), ...meaningLines(word)];

  if (word.example) lines.push(`> ${word.example}`);
  if (word.exampleZh) lines.push(`> ${word.exampleZh}`);
  return lines.join('\n');
}

function buildContent(words, round) {
  const header = headerLine(round, config.pushTimezone);
  return { header, blocks: words.map((w, i) => blockOf(w, i + 1)) };
}

function buildMessage(words, round, token) {
  const { header, blocks } = buildContent(words, round);
  const channel = channelName();
  const title = `每日单词 · ${dateLabel(config.pushTimezone)}（第 ${round} 轮）`;
  const link = token && config.publicBaseUrl ? `${config.publicBaseUrl}/d/${token}` : '';

  // 飞书：一张可折叠卡片，点单词才展开释义，无需公网地址
  if (channel === 'feishu') {
    const text = [header, ...blocks].join('\n\n');
    return {
      channel,
      title,
      card: feishu.buildCard({ title, words, link }),
      parts: [link ? `${text}\n\n[打开互动版 · 点词看释义](${link})` : text],
    };
  }

  // PushPlus 标题单独承载日期与轮次，正文只放单词块
  if (channel === 'pushplus') {
    const parts = pushplus.splitBlocks(blocks);
    if (link) parts[parts.length - 1] += `\n\n[打开互动版 · 点单词看释义](${link})`;
    return { channel, title, parts };
  }

  const parts = wecom.splitBlocks(header, blocks);
  if (link) parts[parts.length - 1] += `\n\n[打开互动版 · 点单词看释义](${link})`;
  return { channel: channel || 'wecom', title, parts };
}

async function ensureTranslations(words) {
  const needs = words
    .filter((w) => !w.customMeaning && w.translationStatus !== 'done' && w.translationStatus !== 'disabled')
    .map((w) => w.id);
  if (!needs.length) return;
  translate.schedule(needs);
  await translate.waitFor(needs, 45000);
}

async function previewPayload() {
  const { wordsPerPush } = store.effectiveSettings();
  const { words, round } = store.preview(wordsPerPush);
  if (!words.length) {
    return { ok: false, reason: 'empty_library', message: '词库为空，请先上传单词' };
  }
  const built = buildMessage(words, round);
  return {
    ok: true,
    round,
    channel: built.channel,
    words: words.map((w) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      entries: w.entries,
      customMeaning: w.customMeaning,
      example: w.example,
      exampleZh: w.exampleZh,
      translationStatus: w.translationStatus,
    })),
    parts: built.parts,
  };
}

let pushing = false;

async function runPush({ auto = false } = {}) {
  if (pushing) return { ok: false, reason: 'busy', message: '上一次推送仍在进行中，请稍后重试' };
  pushing = true;
  try {
    const { wordsPerPush } = store.effectiveSettings();
    const { words, round } = store.preview(wordsPerPush);
    if (!words.length) {
      return { ok: false, reason: 'empty_library', message: '词库为空，请先上传单词' };
    }

    if (auto && store.stats().lastPushDate === store.todayInTz(config.pushTimezone)) {
      return { ok: false, reason: 'already_pushed', message: '今天已自动推送过，跳过本次' };
    }

    await ensureTranslations(words);
    const fresh = words.map((w) => store.getWord(w.id)).filter(Boolean);

    const channel = channelName();
    if (!channel) throw new Error('未配置推送渠道：请设置 FEISHU_WEBHOOK_URL、PUSHPLUS_TOKEN 或 WECOM_WEBHOOK_URL');

    const token = config.publicBaseUrl ? crypto.randomBytes(10).toString('hex') : '';
    const built = buildMessage(fresh, round, token);
    if (built.channel === 'feishu') {
      await feishu.sendCard(built.card);
    } else if (built.channel === 'pushplus') {
      await pushplus.sendParts(built.parts, built.title);
    } else {
      await wecom.sendParts(built.parts);
    }
    store.commit(fresh, round, { token });

    return {
      ok: true,
      round,
      channel: built.channel,
      count: fresh.length,
      words: fresh.map((w) => w.word),
      parts: built.parts.length,
      link: token ? `${config.publicBaseUrl}/d/${token}` : '',
    };
  } finally {
    pushing = false;
  }
}

module.exports = { previewPayload, runPush, buildMessage };
