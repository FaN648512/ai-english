<template>
  <view class="wc" :class="{ 'wc-flash': mode !== 'detail' }">
    <!-- ===== 详情模式(搜索/列表用,单面) ===== -->
    <view v-if="mode === 'detail'" class="wc-detail">
      <view class="wc-detail-head">
        <view class="wc-detail-word mono">{{ word.word }}</view>
        <view class="wc-detail-meta">
          <text class="wc-pos mono">{{ word.pos }}</text>
          <text class="wc-phonetic mono">{{ word.phonetic }}</text>
        </view>
      </view>
      <view class="wc-dual">
        <view class="wc-panel wc-origin">
          <view class="wc-panel-kicker mono">ORIGIN</view>
          <view class="wc-panel-body">{{ word.originMeaning }}</view>
        </view>
        <view class="wc-panel wc-ai">
          <view class="wc-panel-kicker mono">AI CONTEXT</view>
          <view class="wc-panel-body">{{ word.aiMeaning }}</view>
        </view>
      </view>
      <view class="wc-example">
        <view class="wc-example-en mono">{{ word.example }}</view>
        <view class="wc-example-zh">{{ word.exampleZh }}</view>
      </view>
      <view class="wc-tip">
        <text class="wc-tip-label">MEMO</text>
        <text class="wc-tip-text">{{ word.memoryTip }}</text>
      </view>
    </view>

    <!-- ===== 闪卡模式:单面板,front/back 二选一,切换时淡入上移(非翻转) =====
         同屏只渲染一面,无叠层、无双栏类名冲突;容器 min-height 恒定,下方零位移 -->
    <view v-else class="wc-body">
      <block v-if="mode === 'back'">
        <view class="wc-face wc-back wc-anim" :key="'back'">
          <view class="wc-inner">
            <view class="wc-word-sm mono">{{ word.word }}</view>
            <view class="wc-dual">
              <view class="wc-panel wc-origin">
                <view class="wc-panel-kicker mono">ORIGIN</view>
                <view class="wc-panel-body">{{ word.originMeaning }}</view>
              </view>
              <view class="wc-panel wc-ai">
                <view class="wc-panel-kicker mono">AI CONTEXT</view>
                <view class="wc-panel-body">{{ word.aiMeaning }}</view>
              </view>
            </view>
            <view class="wc-example">
              <view class="wc-example-en mono">{{ word.example }}</view>
              <view class="wc-example-zh">{{ word.exampleZh }}</view>
            </view>
            <view class="wc-tip">
              <text class="wc-tip-label">MEMO</text>
              <text class="wc-tip-text">{{ word.memoryTip }}</text>
            </view>
          </view>
        </view>
      </block>
      <block v-else>
        <view class="wc-face wc-front wc-anim" :key="'front'">
          <view class="wc-inner">
            <view class="wc-tags mono">{{ topicEn }} · L{{ word.level }}</view>
            <view class="wc-pos">{{ word.pos }}</view>
            <view class="wc-word mono">{{ word.word }}</view>
            <view class="wc-phonetic mono">{{ word.phonetic }}</view>
            <view class="wc-hint">点击查看释义</view>
          </view>
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import wordsData from "@/data/words.js";

export default {
  name: "WordCard",
  props: {
    word: { type: Object, required: true },
    mode: { type: String, default: "detail" }, // front | back | detail
  },
  computed: {
    topicEn() {
      const t = wordsData.topics.find((x) => x.id === this.word.topicId);
      return t ? t.nameEn.toUpperCase() : "";
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes wcFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes wcSwap {
  from {
    opacity: 0;
    transform: translateY(16rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wc {
  width: 100%;
}
.wc-flash {
  animation: wcFadeIn 0.24s ease both;
}

/* 闪卡:单面板;min-height 恒定保证翻面/切词时下方内容零位移 */
.wc-body {
  width: 100%;
  min-height: 540rpx;
  border-radius: 26rpx;
  background: #0b101b;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 16rpx 44rpx rgba(0, 0, 0, 0.25);
}
.wc-face {
  width: 100%;
  display: flex;
}
.wc-front {
  align-items: center;
  justify-content: center;
}
.wc-back {
  align-items: flex-start;
}
.wc-anim {
  animation: wcSwap 0.32s ease both;
}

.wc-inner {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 500rpx;
  padding: 40rpx 32rpx;
}
.wc-back .wc-inner {
  align-items: stretch;
  justify-content: flex-start;
  padding: 30rpx 28rpx;
}

.wc-tags {
  font-size: 18rpx;
  letter-spacing: 3rpx;
  color: #3ce0ff;
  background: rgba(60, 224, 255, 0.07);
  border: 1rpx solid rgba(60, 224, 255, 0.25);
  border-radius: 8rpx;
  padding: 6rpx 18rpx;
  margin-bottom: 28rpx;
}
.wc-pos {
  font-size: 24rpx;
  color: #5b6472;
  letter-spacing: 2rpx;
  margin-bottom: 20rpx;
}
.wc-word {
  font-size: 84rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1rpx;
  text-align: center;
  word-break: break-all;
  text-shadow: 0 0 40rpx rgba(60, 224, 255, 0.18);
}
.wc-phonetic {
  font-size: 28rpx;
  color: #3ce0ff;
  margin-top: 20rpx;
}
.wc-hint {
  margin-top: 56rpx;
  font-size: 22rpx;
  color: #3a4254;
}

.wc-word-sm {
  font-size: 38rpx;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  margin-bottom: 28rpx;
}

/* 双栏对照(原意 1/3 : AI 义 2/3),细线 + 左侧色条 */
.wc-dual {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.wc-panel {
  border-radius: 12rpx;
  padding: 22rpx 20rpx;
  border-left: 4rpx solid transparent;
  min-width: 0;
}
.wc-origin {
  flex: 1;
  background: rgba(148, 163, 184, 0.05);
  border-left-color: #5b6472;
}
.wc-ai {
  flex: 2;
  background: rgba(60, 224, 255, 0.06);
  border-left-color: #3ce0ff;
}
.wc-panel-kicker {
  font-size: 18rpx;
  letter-spacing: 2rpx;
  margin-bottom: 12rpx;
}
.wc-origin .wc-panel-kicker {
  color: #5b6472;
}
.wc-ai .wc-panel-kicker {
  color: #3ce0ff;
}
.wc-panel-body {
  font-size: 26rpx;
  color: #e8eef7;
  line-height: 1.55;
  word-break: break-all;
}

/* 例句 */
.wc-example {
  background: #0a0e16;
  border: 1rpx solid rgba(148, 163, 184, 0.1);
  border-radius: 12rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 24rpx;
}
.wc-example-en {
  font-size: 25rpx;
  color: #b9c2d4;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.wc-example-zh {
  font-size: 23rpx;
  color: #6b7688;
}

/* 记忆点 */
.wc-tip {
  display: flex;
  align-items: flex-start;
  border-radius: 12rpx;
  padding: 18rpx 22rpx;
  background: rgba(60, 224, 255, 0.04);
  border: 1rpx dashed rgba(60, 224, 255, 0.3);
}
.wc-tip-label {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 18rpx;
  letter-spacing: 2rpx;
  color: #3ce0ff;
  margin-right: 14rpx;
  flex-shrink: 0;
  padding-top: 4rpx;
}
.wc-tip-text {
  font-size: 23rpx;
  color: #b9c2d4;
  line-height: 1.55;
}

/* 详情 */
.wc-detail {
  animation: wcFadeIn 0.3s ease both;
}
.wc-detail-head {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.wc-detail-word {
  font-size: 46rpx;
  font-weight: 700;
  color: #ffffff;
}
.wc-detail-meta {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}
</style>