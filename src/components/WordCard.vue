<template>
  <view
    class="wc"
    :class="{
      'wc-flash': mode !== 'detail',
      'show-back': mode === 'back',
      'show-front': mode === 'front',
    }"
  >
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
      <view class="wc-example" v-if="word.example">
        <view class="wc-example-en mono">{{ word.example }}</view>
        <view class="wc-example-zh">{{ word.exampleZh }}</view>
      </view>
      <view class="wc-tip" v-if="word.memoryTip">
        <text class="wc-tip-label">MEMO</text>
        <text class="wc-tip-text">{{ word.memoryTip }}</text>
      </view>
    </view>

    <!-- ===== 闪卡模式:双面常驻叠层 + transition 过渡(非翻转,无节点销毁重建) =====
         关键:两面永久渲染于 grid 同格,翻面仅切换 show-front/show-back 类,
         依赖 opacity/transform/visibility 的 CSS transition 双向过渡;
         全程零 DOM 挂载、零布局重排,仅走合成器,头尾无重绘卡顿 -->
    <view v-else class="wc-faces">
      <view class="wc-face wc-front">
        <view class="wc-inner">
          <view class="wc-tags mono">{{ topicEn }} · {{ levelTag }}</view>
          <view class="wc-pos">{{ word.pos }}</view>
          <view class="wc-word mono">{{ word.word }}</view>
          <view class="wc-phonetic mono">{{ word.phonetic }}</view>
          <view class="wc-hint">点击查看释义</view>
        </view>
      </view>
      <view class="wc-face wc-back">
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
          <view class="wc-example" v-if="word.example">
            <view class="wc-example-en mono">{{ word.example }}</view>
            <view class="wc-example-zh">{{ word.exampleZh }}</view>
          </view>
          <view class="wc-tip" v-if="word.memoryTip">
            <text class="wc-tip-label">MEMO</text>
            <text class="wc-tip-text">{{ word.memoryTip }}</text>
          </view>
        </view>
      </view>
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
      if (this.word.topicId === "user") return "MY WORDS";
      const t = wordsData.topics.find((x) => x.id === this.word.topicId);
      return t ? t.nameEn.toUpperCase() : "";
    },
    levelTag() {
      if (this.word.topicId === "user")
        return "G" + ((this.word.group ?? 0) + 1);
      return "L" + this.word.level;
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

.wc {
  width: 100%;
}
.wc-flash {
  animation: wcFadeIn 0.24s ease both;
}

/* 闪卡:双面常驻叠层;过渡仅走 opacity/transform/visibility(合成器),零渲染帧掉落。
   容器高度由 .wc-inner min-height 撑起,单面超长时 grid 取最高面,下方零位移 */
.wc-faces {
  position: relative;
  display: grid;
  min-height: 540rpx;
  border-radius: 26rpx;
  background: #0b101b;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  box-shadow: 0 16rpx 44rpx rgba(0, 0, 0, 0.25);
}
.wc-face {
  grid-area: 1 / 1;
  width: 100%;
  display: flex;
  opacity: 0;
  /* 纯 alpha 交叉淡入:transform 恒为 translateZ(0)、不参与动画。
     两面纹理仅栅格化一次且层常驻,翻面只做合成器透明度混合 —
     无重栅格化、无文本抗锯齿模式切换,从构造上杜绝起止"模糊→清晰"跳变 */
  transform: translateZ(0);
  pointer-events: none;
  transition: opacity 0.32s ease;
}
.wc-front {
  align-items: center;
  justify-content: center;
}
.wc-back {
  align-items: flex-start;
}
.show-front .wc-front,
.show-back .wc-back {
  opacity: 1;
  pointer-events: auto;
  z-index: 2;
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