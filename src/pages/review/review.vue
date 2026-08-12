<template>
  <view class="page-wrap review-page">
    <!-- 进行中 -->
    <block v-if="!finished">
      <!-- 进度条 -->
      <view class="review-head">
        <view class="review-progress-text">
          {{ currentIndex + 1 }} / {{ queue.length }}
        </view>
        <view class="review-progress-bar">
          <view
            class="review-progress-inner"
            :style="{ width: progressPercent + '%' }"
          ></view>
        </view>
      </view>

      <!-- 闪卡 -->
      <view class="card flash-card" @tap="flip">
        <WordCard :word="currentWord" :mode="flipped ? 'back' : 'front'" />
      </view>

      <!-- 评分按钮(翻到背面后显示) -->
      <view v-if="flipped" class="rate-row">
        <button class="rate-btn rate-again" @tap="rate('again')">没记住</button>
        <button class="rate-btn rate-hard" @tap="rate('hard')">困难</button>
        <button class="rate-btn rate-good" @tap="rate('good')">良好</button>
        <button class="rate-btn rate-easy" @tap="rate('easy')">简单</button>
      </view>
      <view v-else class="flip-hint">👆 点击卡片查看释义</view>
    </block>

    <!-- 结束态 -->
    <view v-else class="done-wrap">
      <view class="card done-card">
        <view class="done-icon">🎉</view>
        <view class="done-title">本轮完成</view>
        <view class="done-stats">
          <view class="done-stat">
            <view class="done-num">{{ queue.length }}</view>
            <view class="done-label">复习</view>
          </view>
          <view class="done-stat">
            <view class="done-num done-correct">{{ sessionCorrect }}</view>
            <view class="done-label">答对</view>
          </view>
          <view class="done-stat">
            <view class="done-num done-again">{{ sessionAgain }}</view>
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
      <view class="card done-card">
        <view class="done-icon">🌱</view>
        <view class="done-title">今日待复习已清空</view>
        <view class="done-sub">可以学点新词,或者去自测巩固一下</view>
        <view class="done-actions">
          <button class="btn-primary done-btn" @tap="goBrowse">浏览词库</button>
          <button class="done-btn-ghost" @tap="goQuiz">去自测</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
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
  components: { WordCard },
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
      uni.navigateBack();
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
.review-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.review-head {
  margin-bottom: 24rpx;
}
.review-progress-text {
  font-size: 26rpx;
  color: #8b96ab;
  text-align: center;
  margin-bottom: 12rpx;
}
.review-progress-bar {
  height: 12rpx;
  background: #222c40;
  border-radius: 999rpx;
  overflow: hidden;
}
.review-progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #35c4f0, #5b8cff);
  border-radius: 999rpx;
  transition: width 0.3s;
}

.flash-card {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 640rpx;
}

.flip-hint {
  text-align: center;
  color: #5a6478;
  font-size: 24rpx;
  padding: 20rpx 0;
}

.rate-row {
  display: flex;
  gap: 14rpx;
  margin-top: 24rpx;
}
.rate-btn {
  flex: 1;
  border-radius: 16rpx;
  font-size: 26rpx;
  color: #fff;
  padding: 18rpx 0;
  border: none;
}
.rate-btn::after {
  border: none;
}
.rate-again {
  background: #4a3540;
  color: #ff8f9d;
}
.rate-hard {
  background: #3a404d;
  color: #f0ad4e;
}
.rate-good {
  background: rgba(53, 196, 240, 0.2);
  color: #35c4f0;
}
.rate-easy {
  background: rgba(76, 217, 100, 0.2);
  color: #4cd964;
}

/* 结束态 */
.done-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
.done-card {
  width: 100%;
  text-align: center;
  padding: 60rpx 40rpx;
}
.done-icon {
  font-size: 96rpx;
  margin-bottom: 20rpx;
}
.done-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
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
  margin-bottom: 40rpx;
}
.done-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.done-num {
  font-size: 56rpx;
  font-weight: 800;
  color: #35c4f0;
}
.done-correct {
  color: #4cd964;
}
.done-again {
  color: #ff8f9d;
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
  color: #8b96ab;
  font-size: 28rpx;
  border: none;
  padding: 16rpx 0;
}
.done-btn-ghost::after {
  border: none;
}
</style>
