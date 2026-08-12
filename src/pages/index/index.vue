<template>
  <view class="page">
    <!-- 自定义导航 -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-inner">
        <view class="nav-title">AI 英语卡</view>
        <view class="nav-right" @tap="goSearch">
          <text class="nav-search-icon">🔍</text>
        </view>
      </view>
    </view>

    <view class="page-wrap">
      <!-- 今日复习 -->
      <view class="card today-card">
        <view class="today-left">
          <view class="today-num">{{ dueCount }}</view>
          <view class="today-label">今日待复习</view>
          <view class="today-streak">🔥 连续学习 {{ stats.streak || 0 }} 天</view>
        </view>
        <view class="today-right">
          <button class="btn-primary today-btn" @tap="goReview">开始复习</button>
        </view>
      </view>

      <!-- 功能入口 -->
      <view class="entry-grid">
        <view
          v-for="e in entries"
          :key="e.key"
          class="entry"
          @tap="e.action"
        >
          <view class="entry-icon">{{ e.icon }}</view>
          <view class="entry-name">{{ e.name }}</view>
        </view>
      </view>

      <!-- 主题分类 -->
      <view class="section-title">按主题学习</view>
      <scroll-view scroll-x class="topic-scroll" show-scrollbar="false">
        <view
          v-for="t in topics"
          :key="t.id"
          class="topic-item"
          @tap="goTopic(t.id)"
        >
          <view class="topic-icon">{{ t.icon }}</view>
          <view class="topic-name">{{ t.name }}</view>
          <view class="topic-count">{{ t.wordCount }} 词</view>
        </view>
      </scroll-view>
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
        { key: "review", icon: "🎴", name: "复习", action: "goReview" },
        { key: "quiz", icon: "✏️", name: "自测", action: "goQuiz" },
        { key: "progress", icon: "📈", name: "进度", action: "goProgress" },
        { key: "search", icon: "🔍", name: "搜索", action: "goSearch" },
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
      this.topics = wordsData.topics.map((t) => ({
        ...t,
        wordCount: wordsData.words.filter((w) => w.topicId === t.id).length,
      }));
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
}

/* 导航 */
.nav {
  background: #0f1420;
}
.nav-inner {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
}
.nav-search-icon {
  font-size: 36rpx;
}

/* 今日复习卡 */
.today-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1a2a4a 0%, #14202e 100%);
  border: 1rpx solid rgba(53, 196, 240, 0.25);
}
.today-num {
  font-size: 88rpx;
  font-weight: 800;
  color: #35c4f0;
  line-height: 1.1;
}
.today-label {
  font-size: 26rpx;
  color: #8b96ab;
  margin-top: 4rpx;
}
.today-streak {
  font-size: 24rpx;
  color: #f0ad4e;
  margin-top: 12rpx;
}
.today-btn {
  min-width: 220rpx;
}

/* 功能入口 */
.entry-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.entry {
  flex: 1;
  background: #1a2233;
  border-radius: 20rpx;
  padding: 24rpx 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 16rpx;
}
.entry:last-child {
  margin-right: 0;
}
.entry-icon {
  font-size: 44rpx;
  margin-bottom: 8rpx;
}
.entry-name {
  font-size: 24rpx;
  color: #e8ecf4;
}

/* 主题 */
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #e8ecf4;
  margin-bottom: 20rpx;
}
.topic-scroll {
  white-space: nowrap;
}
.topic-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 200rpx;
  margin-right: 20rpx;
  background: #1a2233;
  border-radius: 24rpx;
  padding: 28rpx 16rpx;
  border: 1rpx solid #2a3450;
}
.topic-icon {
  font-size: 56rpx;
  margin-bottom: 12rpx;
}
.topic-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #e8ecf4;
}
.topic-count {
  font-size: 22rpx;
  color: #8b96ab;
  margin-top: 6rpx;
}
</style>
