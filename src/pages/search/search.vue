<template>
  <view class="page-wrap">
    <!-- 搜索框 -->
    <view class="search-bar">
      <text class="search-icon">🔍</text>
      <input
        class="search-input"
        v-model="keyword"
        placeholder="输入单词 / 中文,如 attention、注意力"
        placeholder-class="search-placeholder"
        focus
        confirm-type="search"
        @input="onInput"
      />
      <text v-if="keyword" class="search-clear" @tap="clear">✕</text>
    </view>

    <!-- 结果 -->
    <view v-if="keyword" class="result-count">
      找到 {{ results.length }} 个词
    </view>
    <view
      v-for="item in results"
      :key="item.id"
      class="result-row"
      @tap="showDetail(item)"
    >
      <view class="result-main">
        <view class="result-word">
          {{ item.word }}
          <text class="result-pos">{{ item.pos }}</text>
        </view>
        <view class="result-ai">{{ item.aiMeaning }}</view>
      </view>
      <text class="result-arrow">›</text>
    </view>
    <view v-if="keyword && results.length === 0" class="empty">
      没有找到相关词,换个关键词试试
    </view>

    <!-- 热门词 -->
    <view v-if="!keyword" class="hot">
      <view class="section-title">随便看看</view>
      <view
        v-for="item in hotWords"
        :key="item.id"
        class="result-row"
        @tap="showDetail(item)"
      >
        <view class="result-main">
          <view class="result-word">
            {{ item.word }}
            <text class="result-pos">{{ item.pos }}</text>
          </view>
          <view class="result-ai">{{ item.aiMeaning }}</view>
        </view>
        <text class="result-arrow">›</text>
      </view>
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

export default {
  components: { WordCard },
  data() {
    return {
      keyword: "",
      results: [],
      detailWord: null,
      hotWords: [],
    };
  },
  onLoad() {
    this.hotWords = wordsData.words.slice(0, 8);
  },
  methods: {
    onInput() {
      const kw = this.keyword.trim().toLowerCase();
      if (!kw) {
        this.results = [];
        return;
      }
      this.results = wordsData.words.filter(
        (w) =>
          w.word.toLowerCase().includes(kw) ||
          w.originMeaning.includes(this.keyword.trim()) ||
          w.aiMeaning.includes(this.keyword.trim())
      );
    },
    clear() {
      this.keyword = "";
      this.results = [];
    },
    showDetail(word) {
      this.detailWord = word;
    },
  },
};
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  background: #1a2233;
  border-radius: 999rpx;
  padding: 16rpx 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid #2a3450;
}
.search-icon {
  font-size: 30rpx;
  margin-right: 16rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #e8ecf4;
}
.search-placeholder {
  color: #5a6478;
}
.search-clear {
  font-size: 28rpx;
  color: #5a6478;
  padding: 8rpx;
}

.result-count {
  font-size: 24rpx;
  color: #8b96ab;
  margin-bottom: 16rpx;
}
.result-row {
  display: flex;
  align-items: center;
  background: #1a2233;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.result-main {
  flex: 1;
}
.result-word {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
}
.result-pos {
  font-size: 22rpx;
  color: #8b96ab;
  font-weight: 400;
  margin-left: 12rpx;
}
.result-ai {
  font-size: 24rpx;
  color: #8b96ab;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.result-arrow {
  font-size: 40rpx;
  color: #3a4254;
  margin-left: 12rpx;
}
.empty {
  text-align: center;
  color: #5a6478;
  font-size: 26rpx;
  padding: 60rpx 0;
}

.hot .section-title {
  font-size: 28rpx;
  color: #8b96ab;
  margin-bottom: 20rpx;
}

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
