<template>
  <view class="page-wrap">
    <!-- 统计卡 -->
    <view class="stats-grid">
      <view class="stat-card">
        <view class="stat-num">{{ stats.totalReviews || 0 }}</view>
        <view class="stat-label">累计复习</view>
      </view>
      <view class="stat-card">
        <view class="stat-num stat-accent">{{ stats.todayCount || 0 }}</view>
        <view class="stat-label">今日</view>
      </view>
      <view class="stat-card">
        <view class="stat-num stat-warn">{{ stats.streak || 0 }}</view>
        <view class="stat-label">连续天数</view>
      </view>
      <view class="stat-card">
        <view class="stat-num stat-ok">{{ accuracy }}%</view>
        <view class="stat-label">正确率</view>
      </view>
    </view>

    <!-- 主题覆盖 -->
    <view class="section-title">主题覆盖</view>
    <view class="card" v-for="t in topicStats" :key="t.id">
      <view class="topic-row">
        <text class="topic-row-icon">{{ t.icon }}</text>
        <view class="topic-row-main">
          <view class="topic-row-name">{{ t.name }}</view>
          <view class="topic-row-count">
            {{ t.learned }}/{{ t.total }} 词
          </view>
        </view>
        <text class="topic-row-pct">{{ t.percent }}%</text>
      </view>
      <view class="bar">
        <view class="bar-inner" :style="{ width: t.percent + '%' }"></view>
      </view>
    </view>

    <!-- 已学词 -->
    <view class="section-title">
      已学词
      <text class="section-sub">({{ learnedWords.length }})</text>
    </view>
    <view
      v-if="learnedWords.length === 0"
      class="card empty-card"
    >
      还没有学过的词,去首页开始复习吧
    </view>
    <view
      v-else
      class="word-row"
      v-for="item in learnedWords"
      :key="item.word.id"
      @tap="showDetail(item.word)"
    >
      <view class="word-row-main">
        <view class="word-row-word">{{ item.word.word }}</view>
        <view class="word-row-due">{{ item.dueText }}</view>
      </view>
      <view class="word-row-chip">{{ item.word.pos }}</view>
    </view>

    <!-- 详情弹层 -->
    <view v-if="detailWord" class="mask" @tap="detailWord = null">
      <view class="mask-card" @tap.stop>
        <view class="mask-close" @tap="detailWord = null">✕</view>
        <WordCard :word="detailWord" mode="detail" />
      </view>
    </view>
  </view>
</template>

<script>
import WordCard from "@/components/WordCard.vue";
import wordsData from "@/data/words.js";
import { getReviewState, getStats } from "@/utils/storage.js";
import { intervalText } from "@/utils/srs.js";

export default {
  components: { WordCard },
  data() {
    return {
      stats: {},
      topicStats: [],
      learnedWords: [],
      detailWord: null,
    };
  },
  computed: {
    accuracy() {
      const review = getReviewState();
      let correct = 0;
      let total = 0;
      Object.values(review).forEach((s) => {
        correct += s.correct || 0;
        total += s.reviews || 0;
      });
      return total === 0 ? 0 : Math.round((correct / total) * 100);
    },
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.stats = getStats();
      const review = getReviewState();
      // 主题覆盖
      this.topicStats = wordsData.topics.map((t) => {
        const words = wordsData.words.filter((w) => w.topicId === t.id);
        const learned = words.filter((w) => (review[w.id]?.reviews || 0) > 0)
          .length;
        const percent = words.length
          ? Math.round((learned / words.length) * 100)
          : 0;
        return { ...t, total: words.length, learned, percent };
      });
      // 已学词(按到期时间排序)
      const list = wordsData.words
        .filter((w) => (review[w.id]?.reviews || 0) > 0)
        .map((w) => ({ word: w, state: review[w.id] }))
        .sort((a, b) => a.state.due - b.state.due);
      this.learnedWords = list.map(({ word, state }) => ({
        word,
        dueText: intervalText(state),
      }));
    },
    showDetail(word) {
      this.detailWord = word;
    },
  },
};
</script>

<style lang="scss" scoped>
.stats-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.stat-card {
  flex: 1;
  background: #1a2233;
  border-radius: 20rpx;
  padding: 28rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16rpx;
}
.stat-card:last-child {
  margin-right: 0;
}
.stat-num {
  font-size: 48rpx;
  font-weight: 800;
  color: #35c4f0;
}
.stat-accent {
  color: #35c4f0;
}
.stat-warn {
  color: #f0ad4e;
}
.stat-ok {
  color: #4cd964;
}
.stat-label {
  font-size: 22rpx;
  color: #8b96ab;
  margin-top: 6rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #e8ecf4;
  margin-bottom: 20rpx;
}
.section-sub {
  font-size: 24rpx;
  color: #8b96ab;
  font-weight: 400;
  margin-left: 8rpx;
}

/* 主题进度 */
.topic-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.topic-row-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.topic-row-main {
  flex: 1;
}
.topic-row-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #e8ecf4;
}
.topic-row-count {
  font-size: 22rpx;
  color: #8b96ab;
  margin-top: 4rpx;
}
.topic-row-pct {
  font-size: 28rpx;
  font-weight: 700;
  color: #35c4f0;
}
.bar {
  height: 14rpx;
  background: #222c40;
  border-radius: 999rpx;
  overflow: hidden;
}
.bar-inner {
  height: 100%;
  background: linear-gradient(90deg, #35c4f0, #5b8cff);
  border-radius: 999rpx;
  transition: width 0.4s;
}

/* 已学词 */
.word-row {
  display: flex;
  align-items: center;
  background: #1a2233;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.word-row-main {
  flex: 1;
}
.word-row-word {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.word-row-due {
  font-size: 22rpx;
  color: #8b96ab;
  margin-top: 4rpx;
}
.word-row-chip {
  font-size: 22rpx;
  color: #35c4f0;
  background: rgba(53, 196, 240, 0.12);
  border-radius: 999rpx;
  padding: 4rpx 16rpx;
}
.empty-card {
  text-align: center;
  color: #8b96ab;
  font-size: 26rpx;
}

/* 详情弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.mask-card {
  width: 86%;
  max-height: 80vh;
  overflow-y: auto;
  background: #1a2233;
  border-radius: 28rpx;
  padding: 40rpx 32rpx 32rpx;
  position: relative;
}
.mask-close {
  position: absolute;
  top: 20rpx;
  right: 24rpx;
  font-size: 32rpx;
  color: #8b96ab;
  z-index: 1;
}
</style>
