<template>
  <view class="page-wrap">
    <view v-if="topic" class="card topic-head">
      <view class="topic-icon">{{ topic.icon }}</view>
      <view class="topic-info">
        <view class="topic-name">{{ topic.name }}</view>
        <view class="topic-sub">
          {{ words.length }} 词 · 点击卡片查看释义
        </view>
      </view>
      <button class="btn-primary topic-start" @tap="startReview">
        去复习
      </button>
    </view>

    <!-- 词卡浏览 -->
    <view v-if="words.length" class="card browse-card" @tap="flip">
      <WordCard :word="words[index]" :mode="flipped ? 'back' : 'front'" />
    </view>

    <!-- 翻页控制 -->
    <view v-if="words.length" class="browse-ctrl">
      <button
        class="ctrl-btn"
        :disabled="index === 0"
        @tap="prev"
      >
        ‹ 上一张
      </button>
      <text class="ctrl-count">{{ index + 1 }}/{{ words.length }}</text>
      <button
        class="ctrl-btn"
        :disabled="index >= words.length - 1"
        @tap="next"
      >
        下一张 ›
      </button>
    </view>

    <!-- 全部词列表 -->
    <view class="section-title">全部单词</view>
    <view
      v-for="(w, i) in words"
      :key="w.id"
      class="word-row"
      :class="{ 'word-row-active': i === index }"
      @tap="jumpTo(i)"
    >
      <view class="word-row-word">{{ w.word }}</view>
      <view class="word-row-ai">{{ w.aiMeaning }}</view>
    </view>
  </view>
</template>

<script>
import WordCard from "@/components/WordCard.vue";
import wordsData from "@/data/words.js";

export default {
  components: { WordCard },
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
.topic-head {
  display: flex;
  align-items: center;
}
.topic-icon {
  font-size: 64rpx;
  margin-right: 24rpx;
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
  font-size: 24rpx;
  color: #8b96ab;
  margin-top: 6rpx;
}
.topic-start {
  font-size: 24rpx;
  padding: 14rpx 28rpx;
  min-width: 160rpx;
}

.browse-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 620rpx;
}

.browse-ctrl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24rpx 0 32rpx;
}
.ctrl-btn {
  background: #1a2233;
  color: #35c4f0;
  font-size: 26rpx;
  border-radius: 16rpx;
  border: 1rpx solid #2a3450;
  padding: 12rpx 28rpx;
}
.ctrl-btn::after {
  border: none;
}
.ctrl-btn[disabled] {
  color: #3a4254;
}
.ctrl-count {
  font-size: 26rpx;
  color: #8b96ab;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #e8ecf4;
  margin-bottom: 20rpx;
}
.word-row {
  background: #1a2233;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
  border: 2rpx solid transparent;
}
.word-row-active {
  border-color: #35c4f0;
}
.word-row-word {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}
.word-row-ai {
  font-size: 24rpx;
  color: #8b96ab;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
</style>
