const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

const FILE = path.join(config.dataDir, 'db.json');

function emptyState() {
  return {
    meta: {
      currentRound: 1,
      lastPushAt: null,
      lastPushDate: null,
      totalPushes: 0,
      createdAt: new Date().toISOString(),
    },
    settings: {},
    words: [],
    history: [],
  };
}

const CRON_DAILY = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/;

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const base = emptyState();
    return {
      meta: { ...base.meta, ...(parsed.meta || {}) },
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
      words: Array.isArray(parsed.words) ? parsed.words : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[store] 词库读取失败，已使用空词库：', err.message);
    return emptyState();
  }
}

let state = load();

function persist() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

function normalizeWord(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function keyOf(word) {
  return normalizeWord(word).toLowerCase();
}

/** 支持换行、逗号、分号、制表符分隔；自动忽略编号前缀与非法字符 */
function parseWordList(text) {
  return String(text || '')
    .split(/[\n,;，；\t|]+/)
    .map((s) => s.replace(/^\s*\d+\s*[.)、]\s*/, '').replace(/^[\s\-•*·]+/, '').trim())
    .filter(Boolean)
    .filter((s) => s.length <= 120)
    .filter((s) => /^[A-Za-z][A-Za-z\s'’.\-/&()+]*$/.test(s))
    .map(normalizeWord);
}

function addWords(input) {
  const list = Array.isArray(input) ? input.map(normalizeWord) : parseWordList(input);
  const existing = new Set(state.words.map((w) => w.key));
  const added = [];
  const skipped = [];

  for (const word of list) {
    if (!word) continue;
    const key = keyOf(word);
    if (existing.has(key)) {
      skipped.push(word);
      continue;
    }
    existing.add(key);
    const item = {
      id: crypto.randomUUID(),
      word,
      key,
      phonetic: '',
      entries: [],
      example: '',
      exampleZh: '',
      customMeaning: '',
      translationStatus: config.deepseekKey ? 'pending' : 'disabled',
      translationError: '',
      createdAt: new Date().toISOString(),
      lastRound: 0,
      pushCount: 0,
      lastPushedAt: null,
      source: 'upload',
    };
    state.words.push(item);
    added.push(item);
  }

  if (added.length) persist();
  return { added, skipped };
}

function getWord(id) {
  return state.words.find((w) => w.id === id) || null;
}

function updateWord(id, patch) {
  const word = getWord(id);
  if (!word) return null;
  const allowed = ['word', 'phonetic', 'entries', 'example', 'exampleZh', 'customMeaning', 'translationStatus', 'translationError'];
  for (const k of allowed) {
    if (patch[k] !== undefined) word[k] = patch[k];
  }
  if (patch.word !== undefined) {
    word.word = normalizeWord(patch.word);
    word.key = keyOf(patch.word);
  }
  persist();
  return word;
}

function removeWord(id) {
  const before = state.words.length;
  state.words = state.words.filter((w) => w.id !== id);
  if (state.words.length !== before) persist();
  return before !== state.words.length;
}

function listWords() {
  return state.words.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

function pendingCount() {
  return state.words.filter((w) => w.lastRound < state.meta.currentRound).length;
}

/**
 * 预览下一次要推送的单词（不改变任何状态）。
 * 规则：新词优先（lastRound=0）→ 本轮未推过 → 本轮推完则自动进入下一轮继续循环。
 */
function preview(n) {
  const order = (a, b) => a.lastRound - b.lastRound || (a.createdAt < b.createdAt ? -1 : 1);
  const picked = state.words.filter((w) => w.lastRound < state.meta.currentRound).sort(order).slice(0, n);
  let round = state.meta.currentRound;

  if (picked.length < n && state.words.length > picked.length) {
    round = state.meta.currentRound + 1;
    const pickedIds = new Set(picked.map((w) => w.id));
    const extra = state.words
      .filter((w) => w.lastRound < round && !pickedIds.has(w.id))
      .sort(order)
      .slice(0, n - picked.length);
    picked.push(...extra);
  }

  return { words: picked, round };
}

/** 推送成功后落库：标记轮次、累加推送次数，并保存本次互动页快照 */
function commit(words, round, options = {}) {
  const ids = new Set(words.map((w) => w.id));
  const now = new Date().toISOString();
  for (const w of state.words) {
    if (!ids.has(w.id)) continue;
    w.lastRound = round;
    w.pushCount += 1;
    w.lastPushedAt = now;
  }
  state.meta.currentRound = Math.max(state.meta.currentRound, round);
  state.meta.lastPushAt = now;
  state.meta.lastPushDate = todayInTz(config.pushTimezone);
  state.meta.totalPushes += 1;

  if (options.token) {
    state.history.unshift({
      token: options.token,
      date: state.meta.lastPushDate,
      round,
      pushedAt: now,
      words: words.map((w) => ({
        word: w.word,
        phonetic: w.phonetic,
        entries: w.entries,
        customMeaning: w.customMeaning,
        example: w.example,
        exampleZh: w.exampleZh,
      })),
    });
    state.history = state.history.slice(0, 60);
  }

  persist();
}

function getDailyByToken(token) {
  return state.history.find((item) => item.token === token) || null;
}

function todayInTz(tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 生效设置：网页里保存的值优先，否则回落到环境变量默认值 */
function effectiveSettings() {
  const s = state.settings || {};
  const n = Number(s.wordsPerPush);
  const wordsPerPush = Number.isInteger(n) && n >= 1 && n <= 15 ? n : config.wordsPerPush;

  let pushCron = config.pushCron;
  if (typeof s.pushCron === 'string') {
    const m = CRON_DAILY.exec(s.pushCron.trim());
    if (m && Number(m[1]) < 60 && Number(m[2]) < 24) pushCron = s.pushCron.trim();
  }
  return { wordsPerPush, pushCron };
}

/** 保存网页设置；pushTime 传 HH:MM，wordsPerPush 传 1-15 的整数 */
function updateSettings(patch = {}) {
  const s = { ...(state.settings || {}) };

  if (patch.wordsPerPush !== undefined) {
    const n = Number(patch.wordsPerPush);
    if (!Number.isInteger(n) || n < 1 || n > 15) {
      throw new RangeError('每次推送数量需为 1-15 的整数');
    }
    s.wordsPerPush = n;
  }

  if (patch.pushTime !== undefined) {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(patch.pushTime).trim());
    if (!m) throw new RangeError('推送时间格式应为 HH:MM');
    s.pushCron = `${Number(m[2])} ${Number(m[1])} * * *`;
  }

  state.settings = s;
  persist();
  return effectiveSettings();
}

function stats() {
  const words = state.words;
  return {
    total: words.length,
    pending: pendingCount(),
    pushed: words.filter((w) => w.pushCount > 0).length,
    translating: words.filter((w) => w.translationStatus === 'pending').length,
    failed: words.filter((w) => w.translationStatus === 'error').length,
    currentRound: state.meta.currentRound,
    totalPushes: state.meta.totalPushes,
    lastPushAt: state.meta.lastPushAt,
    lastPushDate: state.meta.lastPushDate,
  };
}

function allPendingTranslationIds() {
  return state.words
    .filter((w) => ['pending', 'error', 'disabled'].includes(w.translationStatus))
    .map((w) => w.id);
}

module.exports = {
  addWords,
  parseWordList,
  getWord,
  updateWord,
  removeWord,
  listWords,
  preview,
  commit,
  getDailyByToken,
  stats,
  todayInTz,
  effectiveSettings,
  updateSettings,
  allPendingTranslationIds,
};
