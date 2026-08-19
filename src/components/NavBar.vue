<template>
  <view class="nb" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nb-inner">
      <view class="nb-back" hover-class="press" @tap="back">
        <view class="nb-back-icon"></view>
      </view>
      <view class="nb-titles">
        <view class="nb-en mono">{{ en }}</view>
        <view class="nb-title">{{ title }}</view>
      </view>
      <view class="nb-fill"></view>
    </view>
  </view>
</template>

<script>
export default {
  name: "NavBar",
  props: {
    title: { type: String, default: "" },
    en: { type: String, default: "" },
  },
  data() {
    return { statusBarHeight: 20 };
  },
  created() {
    const info = uni.getSystemInfoSync();
    this.statusBarHeight = info.statusBarHeight || 20;
  },
  methods: {
    back() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        uni.reLaunch({ url: "/pages/index/index" });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.nb {
  background: rgba(6, 8, 14, 0.92);
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.08);
}
.nb-inner {
  height: 92rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
}
.nb-back {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(60, 224, 255, 0.3);
  border-radius: 12rpx;
  flex-shrink: 0;
}
/* CSS 左箭头:更小更细、折点圆角,贴合精致极简风;margin 做光学居中 */
.nb-back-icon {
  width: 14rpx;
  height: 14rpx;
  border-left: 3rpx solid #3ce0ff;
  border-bottom: 3rpx solid #3ce0ff;
  border-radius: 3rpx;
  transform: rotate(45deg);
  margin-left: 5rpx;
}
.nb-titles {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.nb-en {
  font-size: 18rpx;
  letter-spacing: 4rpx;
  color: #3ce0ff;
}
.nb-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
}
.nb-fill {
  width: 56rpx;
  flex-shrink: 0;
}
</style>