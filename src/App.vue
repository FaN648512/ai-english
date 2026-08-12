<script>
export default {
  onLaunch: function () {
    console.log("AI英语小程序启动");
  },
};
</script>

<style lang="scss">
/* uView Plus 全量样式 */
@import "uview-plus/index.scss";

/* ===== 全局基础样式 ===== */
page {
  background-color: #0f1420;
  color: #e8ecf4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

view,
text,
button,
input,
scroll-view {
  box-sizing: border-box;
}

/* 通用容器 */
.page-wrap {
  min-height: 100vh;
  padding: 24rpx;
}

/* 卡片容器 */
.card {
  background: #1a2233;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.25);
}

/* 主/次文字 */
.text-main {
  color: #e8ecf4;
}
.text-sub {
  color: #8b96ab;
}
.text-accent {
  color: #35c4f0;
}

/* 标签 */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #35c4f0;
  background: rgba(53, 196, 240, 0.12);
  border: 1rpx solid rgba(53, 196, 240, 0.35);
}

/* 主要按钮 */
.btn-primary {
  background: linear-gradient(135deg, #35c4f0, #5b8cff);
  color: #fff;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  text-align: center;
  padding: 20rpx 0;
}
.btn-primary::after {
  border: none;
}
</style>
