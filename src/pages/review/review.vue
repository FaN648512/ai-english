<template>
  <view class="page page-anim">
    <NavBar title="复习" en="REVIEW" />

    <view class="page-wrap review-page">
      <!-- 进行中 -->
      <block v-if="!finished">
        <!-- 进度 + 会话统计 -->
        <view class="review-head si si-1">
          <view class="review-meta">
            <view class="review-progress-text mono">
              {{ currentIndex + 1 }} / {{ queue.length }}
            </view>
            <view class="review-session mono">
              <text class="rs-ok">✓ {{ sessionCorrect }}</text>
              <text class="rs-bad">✗ {{ sessionAgain }}</text>
            </view>
          </view>
          <view class="review-progress-bar">
            <view
              class="review-progress-inner"
              :style="{ width: progressPercent + '%' }"
            ></view>
          </view>
        </view>

        <!-- 闪卡:无 hover-class — 任何按压 transform/opacity 反馈都会与翻面合成层冲突,
           翻面交叉溶解本身就是点击反馈 -->
        <view class="card flash-card" @tap="flip">
          <WordCard
            :key="currentWord.id"
            :word="currentWord"
            :mode="flipped ? 'back' : 'front'"
          />
        </view>

        <!-- 评分区:flip-hint 与 rate-row 常驻叠层,仅切 opacity/visibility,零节点插入零重排 -->
        <view class="rate-zone" :class="flipped ? 'show-rate' : 'show-hint'">
          <view class="flash-hint">点击卡片查看释义</view>
          <view class="rate-row">
            <button class="rate-btn rate-again si si-1" @tap="rate('again')">
              没记住
            </button>
            <button class="rate-btn rate-hard si si-2" @tap="rate('hard')">
              困难
            </button>
            <button class="rate-btn rate-good si si-3" @tap="rate('good')">
              良好
            </button>
            <button class="rate-btn rate-easy si si-4" @tap="rate('easy')">
              简单
            </button>
          </view>
        </view>
      </block>

      <!-- 结束态 -->
      <view v-else class="done-wrap">
        <view class="card done-card pi">
          <view class="done-icon">●</view>
          <view class="done-title mono">{{ queue.length }} DONE</view>
          <view class="done-stats">
            <view class="done-stat">
              <view class="done-num mono">{{ queue.length }}</view>
              <view class="done-label">复习</view>
            </view>
            <view class="done-stat">
              <view class="done-num done-correct mono">{{ sessionCorrect }}</view>
              <view class="done-label">答对</view>
            </view>
            <view class="done-stat">
              <view class="done-num done-again mono">{{ sessionAgain }}</view>
              <view class="done-label">遗忘</view>
            </view>
          </view>
          <view class="done-actions">
            <button class="btn-primary done-btn" @tap="restart">再来一轮</button>
            <button class="done-btn-ghost" @tap="goHome">返回首页</button>
          </view>
        </view>
      </view>

      <!-- 空队列:今日无待复习 -->
      <view v-if="!loading && !finished && queue.length === 0" class="done-wrap">
        <view class="card done-card pi">
          <view class="done-icon">○</view>
          <view class="done-title mono">ALL CLEAR</view>
          <view class="done-sub">今日待复习已清空 · 学点新词或自测巩固</view>
          <view class="done-actions">
            <button class="btn-primary done-btn" @tap="goBrowse">浏览词库</button>
            <button class="done-btn-ghost" @tap="goQuiz">去自测</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import NavBar from "@/components/NavBar.vue";
import WordCard from "@/components/WordCard.vue";
import wordsData from "@/data/words.js";
import {
  getReviewState,
  saveReviewState,
  getStats,
  saveStats,
} from "@/utils/storage.js";
import { reviewStep, isDue, RATINGS } from "@/utils/srs.js";

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function yesterdayStr() {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default {
  components: { NavBar, WordCard },
  data() {
    return {
      loading: true,
      queue: [],
      currentIndex: 0,
      flipped: false,
      finished: false,
      sessionCorrect: 0,
      sessionAgain: 0,
      reviewState: {},
    };
  },
  computed: {
    currentWord() {
      return this.queue[this.currentIndex] || null;
    },
    progressPercent() {
      if (!this.queue.length) return 0;
      return Math.round((this.currentIndex / this.queue.length) * 100);
    },
  },
  onLoad() {
    this.buildQueue();
  },
  methods: {
    buildQueue() {
      this.reviewState = getReviewState();
      const now = Date.now();
      // 到期词(新词 due=0 也视为到期)优先;超过 50 张先取最紧急的
      const dueWords = wordsData.words
        .filter((w) => isDue(this.reviewState[w.id], now))
        .slice(0, 50);
      // 按遗忘次数降序,让最难的先出现
      dueWords.sort((a, b) => {
        const la = this.reviewState[a.id]?.lapses || 0;
        const lb = this.reviewState[b.id]?.lapses || 0;
        return lb - la;
      });
      this.queue = dueWords;
      this.currentIndex = 0;
      this.loading = false;
    },
    flip() {
      this.flipped = !this.flipped;
    },
    rate(rating) {
      const word = this.currentWord;
      if (!word) return;
      const newState = reviewStep(this.reviewState[word.id], rating);
      this.reviewState[word.id] = newState;
      saveReviewState(this.reviewState);

      // 统计
      const stats = getStats();
      stats.totalReviews += 1;
      stats.todayCount = (stats.todayCount || 0) + 1;
      if (rating !== RATINGS.AGAIN) {
        stats.todayCorrect = (stats.todayCorrect || 0) + 1;
        this.sessionCorrect += 1;
      } else {
        this.sessionAgain += 1;
      }
      stats.byTopic = stats.byTopic || {};
      stats.byTopic[word.topicId] = (stats.byTopic[word.topicId] || 0) + 1;
      // 连续天数
      const today = todayStr();
      if (stats.lastStudyDate !== today) {
        if (stats.lastStudyDate === yesterdayStr()) {
          stats.streak = (stats.streak || 0) + 1;
        } else {
          stats.streak = 1;
        }
        stats.lastStudyDate = today;
      }
      saveStats(stats);

      // 下一张
      this.flipped = false;
      if (this.currentIndex + 1 >= this.queue.length) {
        this.finished = true;
      } else {
        this.currentIndex += 1;
      }
    },
    restart() {
      this.finished = false;
      this.sessionCorrect = 0;
      this.sessionAgain = 0;
      this.buildQueue();
    },
    goHome() {
      const pages = getCurrentPages();
      if (pages.length > 1) uni.navigateBack();
      else uni.reLaunch({ url: "/pages/index/index" });
    },
    goBrowse() {
      uni.redirectTo({ url: "/pages/search/search" });
    },
    goQuiz() {
      uni.redirectTo({ url: "/pages/quiz/quiz" });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}
.review-page {
  display: flex;
  flex-direction: column;
  padding: 24rpx 28rpx 36rpx;
}

.review-head {
  margin-bottom: 24rpx;
}
.review-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.review-progress-text {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
}
.review-session {
  display: flex;
  gap: 20rpx;
  font-size: 22rpx;
  letter-spacing: 1rpx;
}
.rs-ok {
  color: #34d399;
}
.rs-bad {
  color: #fb7085;
}
.review-progress-bar {
  height: 6rpx;
  background: rgba(148, 163, 184, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
}
.review-progress-inner {
  height: 100%;
  background: #3ce0ff;
  box-shadow: 0 0 12rpx rgba(60, 224, 255, 0.6);
  border-radius: 999rpx;
  transition: width 0.3s;
}

.flash-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 540rpx;
  margin-top: 24rpx;
  /* 让卡片边框只保留内层 WordCard 一层,去掉外层 .card 的边框/背景 */
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

/* 评分区:flip-hint 与 rate-row 同格叠层常驻,显隐只切 opacity(不用 visibility,
   避免 hidden↔visible 触发层重栅格化造成的起止"模糊→清晰"跳变) */
.rate-zone {
  position: relative;
  display: grid;
  margin-top: 44rpx;
}
.flash-hint {
  grid-area: 1 / 1;
  text-align: center;
  color: #3a4254;
  font-size: 23rpx;
  padding: 14rpx 0 20rpx;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.rate-row {
  grid-area: 1 / 1;
  display: flex;
  gap: 14rpx;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.show-rate .rate-row {
  opacity: 1;
  pointer-events: auto;
}
.show-rate .flash-hint {
  opacity: 0;
}
.rate-btn {
  flex: 1;
  border-radius: 12rpx;
  font-size: 25rpx;
  padding: 18rpx 0;
  border: 1rpx solid transparent;
  background: rgba(148, 163, 184, 0.06);
  transition: transform 0.12s ease, background 0.12s ease;
}
.rate-btn:active {
  transform: scale(0.96);
}
.rate-btn::after {
  border: none;
}
.rate-again {
  color: #fb7085;
  border-color: rgba(251, 112, 133, 0.35);
}
.rate-hard {
  color: #f5b04c;
  border-color: rgba(245, 176, 76, 0.35);
}
.rate-good {
  color: #3ce0ff;
  border-color: rgba(60, 224, 255, 0.35);
}
.rate-easy {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.35);
}

/* 结束态 */
.done-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
.done-card {
  width: 100%;
  text-align: center;
  padding: 60rpx 40rpx;
}
.done-icon {
  font-size: 40rpx;
  color: #3ce0ff;
  margin-bottom: 24rpx;
  text-shadow: 0 0 20rpx rgba(60, 224, 255, 0.7);
}
.done-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  margin-bottom: 12rpx;
}
.done-sub {
  font-size: 26rpx;
  color: #8b96ab;
  margin-bottom: 32rpx;
}
.done-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 44rpx;
}
.done-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.done-num {
  font-size: 56rpx;
  font-weight: 800;
  color: #3ce0ff;
}
.done-correct {
  color: #34d399;
}
.done-again {
  color: #fb7085;
}
.done-label {
  font-size: 24rpx;
  color: #8b96ab;
  margin-top: 6rpx;
}
.done-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.done-btn {
  margin: 0;
}
.done-btn-ghost {
  background: transparent;
  color: #6b7688;
  font-size: 28rpx;
  border: none;
  padding: 16rpx 0;
}
.done-btn-ghost::after {
  border: none;
}
</style>