<template>
  <view class="page page-anim">
    <NavBar title="词库" en="LIBRARY" />

    <view class="page-wrap">
      <!-- 搜索框 -->
      <view class="search-bar si si-1">
        <text class="search-icon">⌕</text>
        <input
          class="search-input mono"
          v-model="keyword"
          placeholder="单词 / 中文,如 attention、注意力"
          placeholder-class="search-placeholder"
          confirm-type="search"
          @input="onInput"
        />
        <text v-if="keyword" class="search-clear" @tap="clear">✕</text>
      </view>

      <!-- ===== 搜索结果模式 ===== -->
      <block v-if="keyword">
        <view class="result-count mono">
          {{ results.length }} FOUND
        </view>
        <view
          v-for="item in results"
          :key="item.id"
          class="result-row"
          hover-class="press"
          @tap="showDetail(item)"
        >
          <view class="result-main">
            <view class="result-word mono">
              {{ item.word }}
              <text class="result-pos mono">{{ item.pos }}</text>
            </view>
            <view class="result-ai">{{ item.aiMeaning }}</view>
          </view>
          <text class="result-arrow">›</text>
        </view>
        <view v-if="results.length === 0" class="empty">
          没有找到相关词,换个关键词试试
        </view>
      </block>

      <!-- ===== 词库浏览模式 ===== -->
      <block v-else>
        <!-- 主题筛选 -->
        <view class="filter-row si si-2">
          <view
            v-for="f in filterOptions"
            :key="f.id"
            class="filter-chip"
            :class="{ 'filter-on': activeTopic === f.id }"
            hover-class="press"
            @tap="activeTopic = f.id"
          >
            {{ f.label }}
          </view>
        </view>

        <!-- 全部:按主题分组 -->
        <block v-if="activeTopic === 'all'">
          <view v-for="g in groupedWords" :key="g.id" class="topic-group">
            <view class="group-head si si-1">
              <text class="group-icon">{{ g.icon }}</text>
              <view class="group-main">
                <view class="group-name">{{ g.name }}</view>
                <view class="group-en mono">{{ g.nameEn }} · {{ g.words.length }}</view>
              </view>
            </view>
            <view
              v-for="item in g.words"
              :key="item.id"
              class="result-row"
              hover-class="press"
              @tap="showDetail(item)"
            >
              <view class="result-main">
                <view class="result-word mono">
                  {{ item.word }}
                  <text class="result-pos mono">{{ item.pos }}</text>
                </view>
                <view class="result-ai">{{ item.aiMeaning }}</view>
              </view>
              <text class="result-arrow">›</text>
            </view>
          </view>
        </block>

        <!-- 单主题 -->
        <block v-else>
          <view class="result-count mono">
            {{ activeTopicWords.length }} WORDS
          </view>
          <view
            v-for="item in activeTopicWords"
            :key="item.id"
            class="result-row"
            hover-class="press"
            @tap="showDetail(item)"
          >
            <view class="result-main">
              <view class="result-word mono">
                {{ item.word }}
                <text class="result-pos mono">{{ item.pos }}</text>
              </view>
              <view class="result-ai">{{ item.aiMeaning }}</view>
            </view>
            <text class="result-arrow">›</text>
          </view>
        </block>
      </block>

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

export default {
  components: { NavBar, WordCard },
  data() {
    return {
      keyword: "",
      results: [],
      detailWord: null,
      activeTopic: "all",
    };
  },
  computed: {
    filterOptions() {
      return [
        { id: "all", label: "全部" },
        ...wordsData.topics.map((t) => ({ id: t.id, label: t.name })),
      ];
    },
    groupedWords() {
      return wordsData.topics.map((t) => ({
        id: t.id,
        name: t.name,
        nameEn: t.nameEn,
        icon: t.icon,
        words: wordsData.words.filter((w) => w.topicId === t.id),
      }));
    },
    activeTopicWords() {
      return wordsData.words.filter((w) => w.topicId === this.activeTopic);
    },
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
.page {
  min-height: 100vh;
}
.search-bar {
  display: flex;
  align-items: center;
  background: rgba(14, 20, 32, 0.6);
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 12rpx;
  padding: 18rpx 28rpx;
  margin-bottom: 24rpx;
}
.search-icon {
  font-size: 34rpx;
  color: #3ce0ff;
  margin-right: 18rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #e8eef7;
}
.search-placeholder {
  color: #4a5568;
}
.search-clear {
  font-size: 28rpx;
  color: #4a5568;
  padding: 8rpx;
}

/* 主题筛选:换行 chips */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-bottom: 32rpx;
}
.filter-chip {
  font-size: 24rpx;
  color: #6b7688;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 10rpx;
  padding: 10rpx 24rpx;
}
.filter-on {
  color: #3ce0ff;
  border-color: rgba(60, 224, 255, 0.45);
  background: rgba(60, 224, 255, 0.07);
}

/* 分组头 */
.topic-group {
  margin-bottom: 36rpx;
}
.group-head {
  display: flex;
  align-items: center;
  padding: 16rpx 0 12rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.12);
  margin-bottom: 4rpx;
}
.group-icon {
  font-size: 34rpx;
  margin-right: 16rpx;
  opacity: 0.9;
}
.group-main {
  flex: 1;
}
.group-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #e8eef7;
}
.group-en {
  font-size: 18rpx;
  letter-spacing: 2rpx;
  color: #3ce0ff;
  opacity: 0.75;
  margin-top: 4rpx;
}

.result-count {
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
  margin-bottom: 12rpx;
}
.result-row {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
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
  font-size: 20rpx;
  color: #5b6472;
  font-weight: 400;
  margin-left: 12rpx;
}
.result-ai {
  font-size: 24rpx;
  color: #6b7688;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
.result-arrow {
  font-size: 40rpx;
  color: #2a3242;
  margin-left: 12rpx;
}
.empty {
  text-align: center;
  color: #4a5568;
  font-size: 26rpx;
  padding: 60rpx 0;
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