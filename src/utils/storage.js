/**
 * 本地存储封装(uni-app Storage)
 * 不登录、数据全部存本地,架构上预留后续换云端的接口。
 */

const KEYS = {
  REVIEW: "ai_eng_review_state", // 各词条的复习状态 { wordId: state }
  STATS: "ai_eng_stats", // 学习统计
  SETTINGS: "ai_eng_settings", // 设置
};

function read(key, fallback) {
  try {
    const v = uni.getStorageSync(key);
    return v === "" || v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function write(key, value) {
  try {
    uni.setStorageSync(key, value);
  } catch (e) {
    console.error("storage write failed:", key, e);
  }
}

/* ---------- 复习状态 ---------- */
export function getReviewState() {
  return read(KEYS.REVIEW, {});
}
export function saveReviewState(state) {
  write(KEYS.REVIEW, state);
}

/* ---------- 学习统计 ---------- */
export function getStats() {
  return read(KEYS.STATS, {
    totalReviews: 0,
    todayCount: 0,
    todayCorrect: 0,
    streak: 0,
    lastStudyDate: null, // 'YYYY-MM-DD'
    learnedWords: 0, // 已学过的词数(复习过一次以上)
    byTopic: {}, // { topicId: 复习次数 }
  });
}
export function saveStats(stats) {
  write(KEYS.STATS, stats);
}

/* ---------- 设置 ---------- */
export function getSettings() {
  return read(KEYS.SETTINGS, {
    dailyGoal: 20, // 每日目标新词+复习数
  });
}
export function saveSettings(settings) {
  write(KEYS.SETTINGS, settings);
}

export { KEYS };
