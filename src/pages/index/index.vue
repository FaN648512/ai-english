<template>
  <view class="page page-anim">
    <!-- 自定义导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="brand">
          <view class="brand-mark"></view>
          <view class="brand-name mono">AI·EN</view>
        </view>
        <view class="nav-search mono" hover-class="press" @tap="goSearch">SEARCH</view>
      </view>
    </view>

    <view class="page-wrap home">
      <!-- 今日复习:海报式首屏 -->
      <view class="today si si-1">
        <view class="today-kicker mono">TODAY'S REVIEW</view>
        <view class="today-num">{{ dueCount }}</view>
        <view class="today-label">今日待复习</view>
        <view class="today-streak mono">
          STREAK · {{ stats.streak || 0 }} DAYS
        </view>
        <button class="btn-primary today-btn" @tap="goReview">开始复习</button>
      </view>

      <!-- 功能入口:极简四格 -->
      <view class="entry-grid">
        <view
          v-for="(e, i) in entries"
          :key="e.key"
          class="entry si"
          :class="'si-' + (i + 1)"
          hover-class="press"
          @tap="goEntry(e.key)"
        >
          <view class="entry-en mono">{{ e.en }}</view>
          <view class="entry-name">{{ e.name }}</view>
        </view>
      </view>

      <!-- 主题分类:换行网格,全部可见 -->
      <view class="section-kicker">TOPICS · 8</view>
      <view class="topic-grid">
        <view
          v-for="(t, i) in topics"
          :key="t.id"
          class="topic-item si"
          :class="'si-' + ((i % 8) + 1)"
          hover-class="press"
          @tap="goTopic(t.id)"
        >
          <view class="topic-head-row">
            <view class="topic-icon">{{ t.icon }}</view>
            <view class="topic-count mono">{{ t.learned }}/{{ t.wordCount }}</view>
          </view>
          <view class="topic-name">{{ t.name }}</view>
          <view class="topic-en mono">{{ t.nameEn }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import wordsData from "@/data/words.js";
import { getReviewState, getStats } from "@/utils/storage.js";
import { isDue } from "@/utils/srs.js";

export default {
  data() {
    return {
      statusBarHeight: 20,
      dueCount: 0,
      stats: {},
      topics: [],
      entries: [
        { key: "review", en: "REVIEW", name: "复习" },
        { key: "quiz", en: "QUIZ", name: "自测" },
        { key: "progress", en: "PROGRESS", name: "进度" },
        { key: "search", en: "LIBRARY", name: "词库" },
      ],
    };
  },
  onLoad() {
    const info = uni.getSystemInfoSync();
    this.statusBarHeight = info.statusBarHeight || 20;
    this.refresh();
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      const review = getReviewState();
      const now = Date.now();
      this.dueCount = wordsData.words.filter((w) => isDue(review[w.id], now))
        .length;
      this.stats = getStats();
      this.topics = wordsData.topics.map((t) => {
        const words = wordsData.words.filter((w) => w.topicId === t.id);
        return {
          ...t,
          wordCount: words.length,
          learned: words.filter((w) => (review[w.id]?.reviews || 0) > 0)
            .length,
        };
      });
    },
    goEntry(key) {
      const map = {
        review: "/pages/review/review",
        quiz: "/pages/quiz/quiz",
        progress: "/pages/progress/progress",
        search: "/pages/search/search",
      };
      if (map[key]) uni.navigateTo({ url: map[key] });
    },
    goReview() {
      uni.navigateTo({ url: "/pages/review/review" });
    },
    goQuiz() {
      uni.navigateTo({ url: "/pages/quiz/quiz" });
    },
    goProgress() {
      uni.navigateTo({ url: "/pages/progress/progress" });
    },
    goSearch() {
      uni.navigateTo({ url: "/pages/search/search" });
    },
    goTopic(id) {
      uni.navigateTo({ url: "/pages/topic/topic?topicId=" + id });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: radial-gradient(
      120% 60% at 50% -10%,
      rgba(60, 224, 255, 0.1) 0%,
      rgba(6, 8, 14, 0) 60%
    ),
    #06080e;
}

/* 导航 */
.nav {
  background: rgba(6, 8, 14, 0.8);
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.brand-mark {
  width: 18rpx;
  height: 18rpx;
  background: #3ce0ff;
  box-shadow: 0 0 12rpx rgba(60, 224, 255, 0.8);
}
.brand-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}
.nav-search {
  font-size: 20rpx;
  letter-spacing: 3rpx;
  color: #6b7688;
  padding: 10rpx 18rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.16);
  border-radius: 8rpx;
}

/* 今日复习海报 */
.today {
  padding: 40rpx 8rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
  margin-bottom: 40rpx;
}
.today-kicker {
  font-size: 20rpx;
  letter-spacing: 5rpx;
  color: #3ce0ff;
  margin-bottom: 24rpx;
}
.today-num {
  font-size: 200rpx;
  font-weight: 800;
  line-height: 1;
  color: #ffffff;
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  text-shadow: 0 0 60rpx rgba(60, 224, 255, 0.35);
}
.today-label {
  font-size: 28rpx;
  color: #8b96ab;
  margin-top: 12rpx;
}
.today-streak {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #f5b04c;
  margin-top: 20rpx;
}
.today-btn {
  margin-top: 40rpx;
  width: 320rpx;
}

/* 功能入口:细线四格 */
.entry-grid {
  display: flex;
  margin-bottom: 48rpx;
}
.entry {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20rpx 6rpx;
  border-left: 1rpx solid rgba(148, 163, 184, 0.14);
  padding-left: 22rpx;
}
.entry:first-child {
  padding-left: 6rpx;
  border-left: none;
}
.entry-en {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  color: #3ce0ff;
  margin-bottom: 10rpx;
}
.entry-name {
  font-size: 26rpx;
  color: #e8eef7;
}

/* 主题网格:双列换行,无需横滑 */
.topic-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.topic-item {
  width: calc(50% - 8rpx);
  background: linear-gradient(180deg, #0e1420 0%, #0b1019 100%);
  border: 1rpx solid rgba(148, 163, 184, 0.12);
  border-radius: 16rpx;
  padding: 24rpx;
}
.topic-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.topic-icon {
  font-size: 36rpx;
  opacity: 0.9;
}
.topic-count {
  font-size: 18rpx;
  color: #5b6472;
}
.topic-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #e8eef7;
}
.topic-en {
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: #3ce0ff;
  opacity: 0.75;
  margin-top: 6rpx;
}
</style>