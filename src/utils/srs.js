/**
 * 简化版间隔重复 (SM-2 简化实现)
 *
 * 每个词条维护一份复习状态:
 *   {
 *     interval: Number,   // 下次复习间隔(天)
 *     due: Number,        // 到期时间戳(ms), <= now 表示今天到期
 *     lapses: Number,     // 遗忘次数(答错累积)
 *     lastResult: String, // 上次评分 again|hard|good|easy
 *     reviews: Number,    // 总复习次数
 *     correct: Number     // 答对次数( good/easy 计对 )
 *   }
 *
 * 评分规则(简化版):
 *   again  -> interval 重置为 0(今天重学), lapses + 1
 *   hard   -> interval = max(1, ceil(interval / 2))
 *   good   -> interval = max(1, interval * 2)
 *   easy   -> interval = max(2, interval * 3)
 *   新词首次复习: again=0 / hard=1 / good=1 / easy=2
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const RATINGS = {
  AGAIN: "again", // 没记住
  HARD: "hard", // 勉强想起
  GOOD: "good", // 记住了
  EASY: "easy", // 很熟
};

/** 创建一份初始复习状态 */
export function createInitialState() {
  return {
    interval: 0,
    due: 0, // due=0 表示"新词,立即进入学习"
    lapses: 0,
    lastResult: null,
    reviews: 0,
    correct: 0,
  };
}

/**
 * 根据评分推进复习状态
 * @param {Object} state 现有复习状态(可为 null/undefined)
 * @param {String} rating 评分 again|hard|good|easy
 * @returns {Object} 新的复习状态
 */
export function reviewStep(state, rating) {
  const s = state && state.due !== undefined ? { ...state } : createInitialState();
  s.reviews += 1;

  let interval = s.interval || 0;
  if (rating === RATINGS.AGAIN) {
    interval = 0;
    s.lapses += 1;
    s.lastResult = RATINGS.AGAIN;
  } else if (rating === RATINGS.HARD) {
    interval = Math.max(1, Math.ceil(interval / 2));
    s.correct += 1;
    s.lastResult = RATINGS.HARD;
  } else if (rating === RATINGS.GOOD) {
    interval = Math.max(1, interval * 2);
    s.correct += 1;
    s.lastResult = RATINGS.GOOD;
  } else if (rating === RATINGS.EASY) {
    interval = Math.max(2, interval * 3);
    s.correct += 1;
    s.lastResult = RATINGS.EASY;
  }

  // 答错(again)当天重学:due 设为 10 分钟后,便于本轮稍后再见
  s.interval = interval;
  s.due = rating === RATINGS.AGAIN ? Date.now() + 10 * 60 * 1000 : Date.now() + interval * DAY_MS;
  return s;
}

/** 是否今天到期(含新词) */
export function isDue(state, now = Date.now()) {
  if (!state) return true; // 新词
  return state.due <= now;
}

/** 预测下次间隔的友好文案 */
export function intervalText(state) {
  if (!state || state.interval <= 0) return "今天重学";
  if (state.interval === 1) return "明天";
  return `${state.interval} 天后`;
}
