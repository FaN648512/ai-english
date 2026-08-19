<template>
  <view class="page page-anim">
    <NavBar title="学习进度" en="PROGRESS" />

    <view class="page-wrap">
      <!-- 掌握度总览 -->
      <view class="card mastery si si-1">
        <view class="mastery-row">
          <view class="mastery-num mono">{{ masteryPercent }}%</view>
          <view class="mastery-info">
            <view class="mastery-title">词库掌握度</view>
            <view class="mastery-sub mono">
              LEARNED {{ learnedWords.length }} / {{ totalWords }}
            </view>
          </view>
        </view>
        <view class="bar">
          <view class="bar-inner bar-grow" :style="{ width: masteryPercent + '%' }"></view>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats-grid si si-2">
        <view class="stat">
          <view class="stat-num mono">{{ stats.totalReviews || 0 }}</view>
          <view class="stat-label">累计复习</view>
        </view>
        <view class="stat">
          <view class="stat-num mono">{{ stats.todayCount || 0 }}</view>
          <view class="stat-label">今日</view>
        </view>
        <view class="stat">
          <view class="stat-num stat-warn mono">{{ stats.streak || 0 }}</view>
          <view class="stat-label">连续</view>
        </view>
        <view class="stat">
          <view class="stat-num stat-ok mono">{{ accuracy }}%</view>
          <view class="stat-label">正确率</view>
        </view>
      </view>

      <!-- 主题覆盖 -->
      <view class="section-kicker">TOPIC COVERAGE</view>
      <view
        class="card si"
        :class="'si-' + ((idx % 8) + 1)"
        v-for="(t, idx) in topicStats"
        :key="t.id"
        hover-class="press"
        @tap="goTopic(t)"
      >
        <view class="topic-row">
          <text class="topic-row-icon">{{ t.icon }}</text>
          <view class="topic-row-main">
            <view class="topic-row-name">{{ t.name }}</view>
            <view class="topic-row-count mono">
              {{ t.learned }} / {{ t.total }}
            </view>
          </view>
          <text class="topic-row-pct mono">{{ t.percent }}%</text>
        </view>
        <view class="bar">
          <view class="bar-inner bar-grow" :style="{ width: t.percent + '%' }"></view>
        </view>
      </view>

      <!-- 已学词 -->
      <view class="section-kicker">
        LEARNED WORDS
        <text class="section-count mono">({{ filteredWords.length }})</text>
      </view>

      <!-- 筛选 -->
      <view v-if="learnedWords.length" class="filter-row si si-1">
        <view
          v-for="f in filters"
          :key="f.k"
          class="filter-chip mono"
          :class="{ 'filter-on': activeFilter === f.k }"
          hover-class="press"
          @tap="activeFilter = f.k"
        >
          {{ f.label }}
        </view>
      </view>

      <view v-if="learnedWords.length === 0" class="card empty-card">
        还没有学过的词,去首页开始复习吧
      </view>
      <view
        v-else
        class="word-row"
        v-for="item in filteredWords"
        :key="item.word.id"
        hover-class="press"
        @tap="showDetail(item.word)"
      >
        <view class="word-row-main">
          <view class="word-row-word mono">{{ item.word.word }}</view>
          <view class="word-row-due mono">{{ item.dueText }}</view>
        </view>
        <view class="word-row-chip mono">{{ item.word.pos }}</view>
      </view>
      <view v-if="learnedWords.length && filteredWords.length === 0" class="card empty-card">
        该分类下暂无词条
      </view>

      <!-- 详情弹层 -->
      <view v-if="detailWord" class="mask" @tap="detailWord = null">
        <view class="mask-card" @tap.stop>
          <view class="mask-close" @tap="detailWord = null">✕</view>
          <view class="mask-scroll">
            <WordCard :word="detailWord" mode="detail" />
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
import { getReviewState, getStats } from "@/utils/storage.js";
import { intervalText, isDue } from "@/utils/srs.js";

export default {
  components: { NavBar, WordCard },
  data() {
    return {
      stats: {},
      topicStats: [],
      learnedWords: [],
      detailWord: null,
      activeFilter: "all",
      filters: [
        { k: "all", label: "全部" },
        { k: "due", label: "待复习" },
        { k: "solid", label: "已巩固" },
      ],
    };
  },
  computed: {
    totalWords() {
      return wordsData.words.length;
    },
    masteryPercent() {
      if (!this.totalWords) return 0;
      return Math.round((this.learnedWords.length / this.totalWords) * 100);
    },
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
    filteredWords() {
      if (this.activeFilter === "due") {
        return this.learnedWords.filter((x) => x.isDueNow);
      }
      if (this.activeFilter === "solid") {
        return this.learnedWords.filter((x) => x.isSolid);
      }
      return this.learnedWords;
    },
  },
  onShow() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.stats = getStats();
      const review = getReviewState();
      const now = Date.now();
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
        isDueNow: isDue(state, now),
        isSolid: (state.interval || 0) >= 7,
      }));
    },
    goTopic(t) {
      uni.navigateTo({ url: "/pages/topic/topic?topicId=" + t.id });
    },
    showDetail(word) {
      this.detailWord = word;
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}

/* 掌握度 */
.mastery {
  padding: 36rpx 32rpx;
}
.mastery-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.mastery-num {
  font-size: 88rpx;
  font-weight: 800;
  line-height: 1;
  color: #3ce0ff;
  text-shadow: 0 0 40rpx rgba(60, 224, 255, 0.35);
  margin-right: 28rpx;
}
.mastery-info {
  flex: 1;
}
.mastery-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #e8eef7;
}
.mastery-sub {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
  margin-top: 8rpx;
}

/* 统计:细线分隔四栏 */
.stats-grid {
  display: flex;
  border: 1rpx solid rgba(148, 163, 184, 0.12);
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 48rpx;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 8rpx;
  border-right: 1rpx solid rgba(148, 163, 184, 0.1);
}
.stat:last-child {
  border-right: none;
}
.stat-num {
  font-size: 46rpx;
  font-weight: 800;
  color: #e8eef7;
}
.stat-warn {
  color: #f5b04c;
}
.stat-ok {
  color: #34d399;
}
.stat-label {
  font-size: 22rpx;
  color: #5b6472;
  margin-top: 8rpx;
}

.section-kicker {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  color: #5b6472;
  margin-bottom: 16rpx;
}
.section-count {
  margin-left: 8rpx;
  color: #3a4254;
}

/* 筛选 */
.filter-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 24rpx;
}
.filter-chip {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  color: #6b7688;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 10rpx;
  padding: 10rpx 26rpx;
}
.filter-on {
  color: #3ce0ff;
  border-color: rgba(60, 224, 255, 0.45);
  background: rgba(60, 224, 255, 0.07);
}

/* 主题进度 */
.topic-row {
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
}
.topic-row-icon {
  font-size: 36rpx;
  margin-right: 18rpx;
  opacity: 0.9;
}
.topic-row-main {
  flex: 1;
}
.topic-row-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #e8eef7;
}
.topic-row-count {
  font-size: 20rpx;
  color: #5b6472;
  margin-top: 4rpx;
}
.topic-row-pct {
  font-size: 26rpx;
  font-weight: 700;
  color: #3ce0ff;
}
.bar {
  height: 6rpx;
  background: rgba(148, 163, 184, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
}
.bar-inner {
  height: 100%;
  background: #3ce0ff;
  box-shadow: 0 0 10rpx rgba(60, 224, 255, 0.5);
  border-radius: 999rpx;
}

/* 已学词 */
.word-row {
  display: flex;
  align-items: center;
  padding: 24rpx 8rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}
.word-row:last-child {
  border-bottom: none;
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
  font-size: 20rpx;
  color: #5b6472;
  margin-top: 4rpx;
}
.word-row-chip {
  font-size: 20rpx;
  color: #3ce0ff;
  border: 1rpx solid rgba(60, 224, 255, 0.3);
  border-radius: 8rpx;
  padding: 4rpx 16rpx;
  background: rgba(60, 224, 255, 0.05);
}
.empty-card {
  text-align: center;
  color: #6b7688;
  font-size: 26rpx;
}

/* 详情弹层 */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.mask-card {
  width: 90%;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0e1420 0%, #0b1019 100%);
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 20rpx;
  padding: 40rpx 32rpx 32rpx;
  position: relative;
}
.mask-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.mask-close {
  position: absolute;
  top: 20rpx;
  right: 24rpx;
  font-size: 30rpx;
  color: #5b6472;
  z-index: 1;
}
</style>