<template>
  <view class="wc">
    <!-- ===== 闪卡正面:单词 ===== -->
    <view v-if="mode === 'front'" class="wc-front">
      <view class="wc-pos">{{ word.pos }}</view>
      <view class="wc-word">{{ word.word }}</view>
      <view class="wc-phonetic">{{ word.phonetic }}</view>
      <view class="wc-hint">点击卡片查看释义</view>
    </view>

    <!-- ===== 闪卡背面:原意 vs AI义 双栏 ===== -->
    <view v-else-if="mode === 'back'" class="wc-back">
      <view class="wc-word-sm">{{ word.word }}</view>
      <view class="wc-dual">
        <view class="wc-panel wc-origin">
          <view class="wc-panel-tag">日常原意</view>
          <view class="wc-panel-body">{{ word.originMeaning }}</view>
        </view>
        <view class="wc-panel wc-ai">
          <view class="wc-panel-tag">AI 语境义</view>
          <view class="wc-panel-body">{{ word.aiMeaning }}</view>
        </view>
      </view>
      <view class="wc-example">
        <view class="wc-example-en">{{ word.example }}</view>
        <view class="wc-example-zh">{{ word.exampleZh }}</view>
      </view>
      <view class="wc-tip">
        <text class="wc-tip-label">💡 记忆点</text>
        <text class="wc-tip-text">{{ word.memoryTip }}</text>
      </view>
    </view>

    <!-- ===== 详情模式(搜索/列表用) ===== -->
    <view v-else class="wc-detail">
      <view class="wc-detail-head">
        <view class="wc-detail-word">{{ word.word }}</view>
        <view class="wc-detail-meta">
          <text class="wc-pos">{{ word.pos }}</text>
          <text class="wc-phonetic">{{ word.phonetic }}</text>
        </view>
      </view>
      <view class="wc-dual">
        <view class="wc-panel wc-origin">
          <view class="wc-panel-tag">日常原意</view>
          <view class="wc-panel-body">{{ word.originMeaning }}</view>
        </view>
        <view class="wc-panel wc-ai">
          <view class="wc-panel-tag">AI 语境义</view>
          <view class="wc-panel-body">{{ word.aiMeaning }}</view>
        </view>
      </view>
      <view class="wc-example">
        <view class="wc-example-en">{{ word.example }}</view>
        <view class="wc-example-zh">{{ word.exampleZh }}</view>
      </view>
      <view class="wc-tip">
        <text class="wc-tip-label">💡 记忆点</text>
        <text class="wc-tip-text">{{ word.memoryTip }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "WordCard",
  props: {
    word: { type: Object, required: true },
    mode: { type: String, default: "detail" }, // front | back | detail
  },
};
</script>

<style lang="scss" scoped>
.wc {
  width: 100%;
}

/* 正面 */
.wc-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 520rpx;
  padding: 60rpx 40rpx;
}
.wc-pos {
  font-size: 26rpx;
  color: #8b96ab;
  margin-bottom: 16rpx;
}
.wc-word {
  font-size: 88rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
  text-align: center;
  word-break: break-all;
}
.wc-phonetic {
  font-size: 30rpx;
  color: #35c4f0;
  margin-top: 16rpx;
}
.wc-hint {
  margin-top: 60rpx;
  font-size: 24rpx;
  color: #5a6478;
}

/* 背面/详情共用 */
.wc-word-sm {
  font-size: 40rpx;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  margin-bottom: 28rpx;
}

/* 双栏对照 */
.wc-dual {
  display: flex;
  gap: 20rpx;
  margin-bottom: 28rpx;
}
.wc-panel {
  flex: 1;
  border-radius: 20rpx;
  padding: 24rpx;
}
.wc-origin {
  background: rgba(139, 150, 171, 0.1);
  border: 1rpx solid rgba(139, 150, 171, 0.25);
}
.wc-ai {
  background: rgba(53, 196, 240, 0.1);
  border: 1rpx solid rgba(53, 196, 240, 0.35);
}
.wc-panel-tag {
  font-size: 22rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}
.wc-origin .wc-panel-tag {
  color: #8b96ab;
}
.wc-ai .wc-panel-tag {
  color: #35c4f0;
}
.wc-panel-body {
  font-size: 26rpx;
  color: #e8ecf4;
  line-height: 1.55;
}

/* 例句 */
.wc-example {
  background: #141c2c;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 28rpx;
}
.wc-example-en {
  font-size: 26rpx;
  color: #c6cde0;
  font-style: italic;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.wc-example-zh {
  font-size: 24rpx;
  color: #8b96ab;
}

/* 记忆点 */
.wc-tip {
  display: flex;
  align-items: flex-start;
  background: rgba(91, 140, 255, 0.08);
  border: 1rpx dashed rgba(91, 140, 255, 0.4);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
}
.wc-tip-label {
  font-size: 24rpx;
  color: #5b8cff;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.wc-tip-text {
  font-size: 24rpx;
  color: #c6cde0;
  line-height: 1.55;
}

/* 详情头部 */
.wc-detail-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.wc-detail-word {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
}
.wc-detail-meta {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
</style>
