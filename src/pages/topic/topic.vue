<template>
  <view class="page page-anim">
    <NavBar :title="topic ? topic.name : '主题'" :en="topic ? topic.nameEn.toUpperCase() : 'TOPIC'" />

    <view class="page-wrap">
      <view v-if="topic" class="card topic-head si si-1">
        <view class="topic-icon">{{ topic.icon }}</view>
        <view class="topic-info">
          <view class="topic-name">{{ topic.name }}</view>
          <view class="topic-sub mono">
            {{ words.length }} WORDS
          </view>
        </view>
        <button class="btn-primary topic-start" @tap="startReview">
          复习
        </button>
      </view>

      <!-- 词卡浏览 -->
      <view v-if="words.length" class="card browse-card" hover-class="press" @tap="flip">
        <WordCard
          :key="words[index].id"
          :word="words[index]"
          :mode="flipped ? 'back' : 'front'"
        />
      </view>

      <!-- 翻页控制 -->
      <view v-if="words.length" class="browse-ctrl">
        <button
          class="ctrl-btn"
          :disabled="index === 0"
          @tap="prev"
        >
          ‹
        </button>
        <text class="ctrl-count mono">{{ index + 1 }}/{{ words.length }}</text>
        <button
          class="ctrl-btn"
          :disabled="index >= words.length - 1"
          @tap="next"
        >
          ›
        </button>
      </view>

      <!-- 全部词列表 -->
      <view class="section-kicker">ALL WORDS</view>
      <view
        v-for="(w, i) in words"
        :key="w.id"
        class="word-row"
        :class="{ 'word-row-active': i === index }"
        hover-class="press"
        @tap="jumpTo(i)"
      >
        <view class="word-row-main">
          <view class="word-row-word mono">{{ w.word }}</view>
          <view class="word-row-ai">{{ w.aiMeaning }}</view>
        </view>
        <view class="word-row-level mono">L{{ w.level }}</view>
      </view>
    </view>
  </view>
</template>

<script>
import NavBar from "@/components/NavBar.vue";
import WordCard from "@/components/WordCard.vue";
import wordsData from "@/data/words.js";

export default {
  components: { NavBar, WordCard },
  data() {
    return {
      topicId: "",
      topic: null,
      words: [],
      index: 0,
      flipped: false,
    };
  },
  onLoad(options) {
    this.topicId = options.topicId || "";
    this.topic =
      wordsData.topics.find((t) => t.id === this.topicId) || null;
    this.words = wordsData.words.filter((w) => w.topicId === this.topicId);
  },
  methods: {
    flip() {
      this.flipped = !this.flipped;
    },
    prev() {
      if (this.index > 0) {
        this.index -= 1;
        this.flipped = false;
      }
    },
    next() {
      if (this.index < this.words.length - 1) {
        this.index += 1;
        this.flipped = false;
      }
    },
    jumpTo(i) {
      this.index = i;
      this.flipped = false;
    },
    startReview() {
      uni.navigateTo({ url: "/pages/review/review" });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}
.topic-head {
  display: flex;
  align-items: center;
}
.topic-icon {
  font-size: 56rpx;
  margin-right: 24rpx;
  opacity: 0.9;
}
.topic-info {
  flex: 1;
}
.topic-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
}
.topic-sub {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: #5b6472;
  margin-top: 6rpx;
}
.topic-start {
  font-size: 24rpx;
  padding: 14rpx 30rpx;
  min-width: 140rpx;
}

.browse-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 540rpx;
  /* 边框只保留内层 WordCard 一层,去掉外层 .card 的边框/背景 */
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.browse-ctrl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20rpx 0 40rpx;
}
.ctrl-btn {
  background: rgba(14, 20, 32, 0.6);
  color: #3ce0ff;
  font-size: 34rpx;
  border-radius: 10rpx;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  padding: 8rpx 36rpx;
}
.ctrl-btn::after {
  border: none;
}
.ctrl-btn[disabled] {
  color: #202838;
  background: rgba(14, 20, 32, 0.3);
  border-color: rgba(148, 163, 184, 0.08);
  opacity: 1;
}
.ctrl-count {
  font-size: 22rpx;
  letter-spacing: 1rpx;
  color: #5b6472;
}

.section-kicker {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  color: #5b6472;
  margin-bottom: 16rpx;
}
.word-row {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  margin-bottom: 4rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
  border-left: 4rpx solid transparent;
}
.word-row-main {
  flex: 1;
}
.word-row-word {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.word-row-ai {
  font-size: 24rpx;
  color: #6b7688;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.word-row-level {
  font-size: 18rpx;
  color: #5b6472;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 8rpx;
  padding: 2rpx 12rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.word-row-active {
  border-left-color: #3ce0ff;
}
.word-row-active .word-row-word {
  color: #3ce0ff;
}
</style>