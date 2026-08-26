/**
 * 我的单词:用户拍照/文字导入的生词本
 *
 * 存储结构(uni Storage, key: ai_eng_user_words):
 *   { words: [UserWord], nextId: Number }
 *
 * UserWord:
 *   {
 *     id: 'u_1',
 *     word: 'apple',
 *     phonetic: '/ˈæpl/',
 *     pos: 'n.',
 *     originMeaning: '苹果',          // 主释义:用户给的优先
 *     aiMeaning: '',                  // 副义:本地词库 / 在线词典自动补
 *     example: '', exampleZh: '',
 *     memoryTip: '',                  // memo
 *     group: 0,                       // 第几组(0 起,每 10 词一组)
 *     addedAt: 1710000000000,
 *     srs: null                       // 复习状态(null=新词,复用 srs.js)
 *   }
 */
import wordsData from "@/data/words.js";
import { isDue } from "@/utils/srs.js";

const KEY = "ai_eng_user_words";
const GROUP_SIZE = 10;

/* ---------- 存储 ---------- */

function read() {
  try {
    const v = uni.getStorageSync(KEY);
    if (v && Array.isArray(v.words)) return v;
  } catch (e) {
    console.error("userWords read failed", e);
  }
  return { words: [], nextId: 1 };
}

function write(data) {
  try {
    uni.setStorageSync(KEY, data);
  } catch (e) {
    console.error("userWords write failed", e);
  }
}

export function getUserWords() {
  return read().words;
}

/** 全部待复习的用户词(新词也算),按组序排列 */
export function getDueUserWords(now = Date.now()) {
  return getUserWords()
    .filter((u) => isDue(u.srs, now))
    .sort((a, b) => a.group - b.group || a.addedAt - b.addedAt);
}

export function getUserDueCount(now = Date.now()) {
  return getUserWords().filter((u) => isDue(u.srs, now)).length;
}

/** 分组视图: [{ index, total, due, learned, words }] */
export function getUserGroups() {
  const words = getUserWords();
  const map = new Map();
  words.forEach((u) => {
    if (!map.has(u.group)) map.set(u.group, []);
    map.get(u.group).push(u);
  });
  return Array.from(map.keys())
    .sort((a, b) => a - b)
    .map((g) => {
      const list = map.get(g);
      return {
        index: g,
        total: list.length,
        due: list.filter((u) => isDue(u.srs)).length,
        learned: list.filter((u) => (u.srs?.reviews || 0) > 0).length,
        words: list,
      };
    });
}

/** 评分后回写复习状态 */
export function updateUserSrs(id, state) {
  const data = read();
  const u = data.words.find((x) => x.id === id);
  if (u) {
    u.srs = state;
    write(data);
  }
}

/** 删除单词(单个或数组),删除后按剩余顺序整体重排分组;返回删除数 */
export function removeUserWords(ids) {
  const data = read();
  const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
  const before = data.words.length;
  data.words = data.words.filter((u) => !idSet.has(u.id));
  const removed = before - data.words.length;
  // 剩余词按现有顺序整体重切组,保证每组仍是固定 10 词
  data.words.forEach((u, i) => {
    u.group = Math.floor(i / GROUP_SIZE);
  });
  write(data);
  return removed;
}

/**
 * 批量加入词库(已富化字段),自动按 10 词切组
 * @param {Array} items enrichItems 产物
 * @returns { added, skipped, total, groups }
 */
export function addUserWords(items) {
  const data = read();
  const existing = new Set(data.words.map((u) => u.word.toLowerCase()));
  let added = 0;
  items.forEach((it) => {
    const word = String(it.word || "").trim();
    if (!word || existing.has(word.toLowerCase())) return;
    existing.add(word.toLowerCase());
    data.words.push({
      id: "u_" + data.nextId,
      word,
      phonetic: it.phonetic || "",
      pos: it.pos || "",
      originMeaning: it.meaning || it.originMeaning || "（待补充）",
      aiMeaning: it.aiMeaning || "",
      example: it.example || "",
      exampleZh: it.exampleZh || "",
      memoryTip: it.memoryTip || "",
      group: 0,
      addedAt: Date.now(),
      srs: null,
    });
    data.nextId += 1;
    added += 1;
  });
  // 按加入顺序整体切组,保证每组固定 10 词
  data.words.forEach((u, i) => {
    u.group = Math.floor(i / GROUP_SIZE);
  });
  write(data);
  const total = data.words.length;
  return {
    added,
    skipped: items.length - added,
    total,
    groups: total ? Math.ceil(total / GROUP_SIZE) : 0,
  };
}

/** 映射成 WordCard 需要的词条形状 */
export function toCardWord(u) {
  return { ...u, level: 1, topicId: "user" };
}

/* ---------- 文本解析 ---------- */

/**
 * 解析多行文本为 [{ word, meaning }]
 * 支持: "apple 苹果" / "1. apple /ˈæpl/ n. 苹果" / "give up 放弃" / 纯单词行
 */
export function parseWordText(text) {
  const out = [];
  const seen = new Set();
  String(text || "")
    .split(/\r?\n/)
    .forEach((raw) => {
      let line = raw.trim();
      if (!line) return;
      // 去编号前缀(1. 1、1)) 与项目符号
      line = line.replace(/^[-•·*]+\s*/, "").replace(/^\d+\s*[.、)．]\s*/, "");
      if (!line) return;
      const zhIdx = line.search(/[\u4e00-\u9fa5]/);
      let word = zhIdx > -1 ? line.slice(0, zhIdx) : line;
      const meaning = zhIdx > -1 ? line.slice(zhIdx).trim() : "";
      // 英文部分收尾:去尾部音标 /.../、词性 n. v. 等
      word = word
        .replace(/\/[^/]*\/\s*$/, "")
        .replace(
          /\s*(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|aux|abbr)\.\s*$/i,
          ""
        )
        .replace(/[.，,、;；]+$/, "")
        .trim();
      // 校验:纯英文字母/连字符/空格,不超过 3 个词
      if (!/^[A-Za-z][A-Za-z'\- ]{0,39}$/.test(word)) return;
      if (word.split(/\s+/).length > 3) return;
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ word, meaning });
    });
  return out;
}

/* ---------- 释义富化:本地词库优先,缺失再在线查 ---------- */

function localLookup(word) {
  return (
    wordsData.words.find((x) => x.word.toLowerCase() === word.toLowerCase()) ||
    null
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 单次请求(fail 不抛错,resolve null) */
function reqOnce(url) {
  return new Promise((resolve) => {
    uni.request({ url, timeout: 8000, success: resolve, fail: () => resolve(null) });
  });
}

/**
 * 在线词典(dictionaryapi.dev,免费无 Key),带重试
 * @returns { phonetic, defs, example, pos } | null
 */
export async function fetchOnlineWord(word) {
  const url =
    "https://api.dictionaryapi.dev/api/v2/entries/en/" +
    encodeURIComponent(word);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await reqOnce(url);
    if (
      res &&
      res.statusCode === 200 &&
      Array.isArray(res.data) &&
      res.data.length
    ) {
      const entry = res.data[0];
      const phonetic =
        (entry.phonetics || []).map((p) => p.text).find((t) => !!t) ||
        entry.phonetic ||
        "";
      const defs = [];
      let example = "";
      let pos = "";
      (entry.meanings || []).forEach((m) => {
        if (!pos && m.partOfSpeech) pos = m.partOfSpeech;
        (m.definitions || []).forEach((d) => {
          if (defs.length < 3 && d.definition) defs.push(d.definition);
          if (!example && d.example) example = d.example;
        });
      });
      return { phonetic, defs, example, pos };
    }
    if (attempt < 2) await sleep(400);
  }
  return null;
}

/** Google 非官方翻译接口(免 Key,CORS 开放),返回译文或 null */
async function fetchGoogleTranslate(text, sl = "en", tl = "zh-CN") {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
    sl +
    "&tl=" +
    tl +
    "&dt=t&q=" +
    encodeURIComponent(text);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await reqOnce(url);
    if (res && res.statusCode === 200 && Array.isArray(res.data) && Array.isArray(res.data[0])) {
      const out = res.data[0]
        .map((seg) => (seg && seg[0]) || "")
        .join("")
        .trim();
      if (out) return out;
    }
    if (attempt < 1) await sleep(300);
  }
  return null;
}

/** MyMemory 翻译兜底(免 Key,限额宽松),返回译文或 null */
async function fetchMyMemoryTranslate(text, langpair = "en|zh-CN") {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text) +
    "&langpair=" +
    langpair;
  const res = await reqOnce(url);
  if (
    res &&
    res.statusCode === 200 &&
    res.data &&
    res.data.responseData &&
    res.data.responseData.translatedText
  ) {
    const out = String(res.data.responseData.translatedText).trim();
    // 接口偶发返回原文/错误文案,过滤掉
    if (out && out.toUpperCase() !== text.toUpperCase()) return out;
  }
  return null;
}

/**
 * 翻译兜底链:Google → MyMemory
 * @returns { trans } | null
 */
async function fetchTranslateFallback(word) {
  const google = await fetchGoogleTranslate(word);
  if (google) return { trans: google };
  const mymemory = await fetchMyMemoryTranslate(word);
  if (mymemory) return { trans: mymemory };
  return null;
}

/**
 * 快速翻译(供"快速翻译"输入框直接调用):中英自动互译
 * 查询链:Google(带重试) → MyMemory
 * @returns { text, dir: 'en2zh'|'zh2en', source: 'GOOGLE'|'MYMEMORY' } | null
 */
export async function translateText(input) {
  const text = String(input || "").trim();
  if (!text) return null;
  const isZh = /[\u4e00-\u9fa5]/.test(text);
  const sl = isZh ? "zh-CN" : "en";
  const tl = isZh ? "en" : "zh-CN";
  const dir = isZh ? "zh2en" : "en2zh";

  const google = await fetchGoogleTranslate(text, sl, tl);
  if (google && google.toUpperCase() !== text.toUpperCase()) {
    return { text: google, dir, source: "GOOGLE" };
  }
  const pair = isZh ? "zh-CN|en" : "en|zh-CN";
  const mymemory = await fetchMyMemoryTranslate(text, pair);
  if (mymemory) return { text: mymemory, dir, source: "MYMEMORY" };
  return null;
}

const POS_MAP = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  preposition: "prep.",
  conjunction: "conj.",
  pronoun: "pron.",
};

function ensureSlashes(p) {
  if (!p) return "";
  return p.startsWith("/") ? p : "/" + p + "/";
}

/** 合并四方来源:用户释义 > 本地词库 > 在线词典 > 翻译兜底 */
function buildEnriched(word, meaning, local, online, fallback) {
  const phonetic = local
    ? local.phonetic
    : online
      ? ensureSlashes(online.phonetic)
      : "";
  const pos = local ? local.pos : online ? POS_MAP[online.pos] || "" : "";
  // 主释义:用户给的优先,其后词典英文定义,最后翻译兜底中文
  const originMeaning =
    meaning ||
    (local ? local.originMeaning : "") ||
    (online?.defs?.[0] ?? "") ||
    (fallback?.trans ?? "");
  // 副义 + memo:本地词库直接给中文富数据;否则在线英文释义兜底
  const aiMeaning = local
    ? local.aiMeaning
    : online?.defs?.length
      ? online.defs.join("; ")
      : "";
  const example = local ? local.example : online ? online.example || "" : "";
  const exampleZh = local ? local.exampleZh : "";
  const memoryTip = local ? local.memoryTip : "";
  const source = local
    ? "local"
    : online
      ? "online"
      : fallback
        ? "fallback"
        : "none";
  return { phonetic, pos, originMeaning, aiMeaning, example, exampleZh, memoryTip, source };
}

/**
 * 逐词富化(本地即时,在线串行防限流);就地写入 items 并回调进度
 * 查询链:本地词库 → 在线词典×3 → 翻译兜底(Google→MyMemory)
 * 全部失败时 source=none 且无主释义,调用方应阻止该词入库
 */
export async function enrichItems(items, onProgress) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const local = localLookup(it.word);
    let online = null;
    let fallback = null;
    if (!local) {
      online = await fetchOnlineWord(it.word);
      if (!online) fallback = await fetchTranslateFallback(it.word);
    }
    Object.assign(
      it,
      buildEnriched(it.word, it.meaning, local, online, fallback)
    );
    if (!it.meaning && it.originMeaning) it.meaning = it.originMeaning;
    if (onProgress) onProgress(i + 1);
  }
  return items;
}
