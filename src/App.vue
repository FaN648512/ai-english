<script>
export default {
  onLaunch: function () {
    console.log("AI 英语卡启动");
  },
};
</script>

<style lang="scss">
/* uView Plus 全量样式 */
@import "uview-plus/index.scss";

/* ===== 全局基础样式:冷静近黑 + 电光青 ===== */
page {
  background: #06080e;
  color: #e8eef7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-size: 28rpx;
  line-height: 1.6;
}

/* 等宽英文:单词/音标/标签用,体现技术感 */
.mono {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, "Courier New",
    monospace;
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
  padding: 32rpx;
}

/* 表面容器(细线 + 微光,无重阴影) */
.card {
  background: linear-gradient(180deg, #0e1420 0%, #0b1019 100%);
  border: 1rpx solid rgba(148, 163, 184, 0.12);
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 0 0 1rpx rgba(60, 224, 255, 0.02);
}

/* 主/次文字 */
.text-main {
  color: #e8eef7;
}
.text-sub {
  color: #8b96ab;
}
.text-accent {
  color: #3ce0ff;
}

/* 标签 pill */
.chip {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #3ce0ff;
  background: rgba(60, 224, 255, 0.08);
  border: 1rpx solid rgba(60, 224, 255, 0.28);
}

/* 主要按钮 */
.btn-primary {
  background: #3ce0ff;
  color: #04121a;
  border-radius: 14rpx;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  text-align: center;
  padding: 20rpx 0;
  letter-spacing: 1rpx;
  transition: transform 0.12s ease, opacity 0.12s ease;
}
.btn-primary:active {
  transform: scale(0.98);
  opacity: 0.85;
}
.btn-primary::after {
  border: none;
}

/* 细线小节标签 */
.section-kicker {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 20rpx;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  color: #5b6472;
  margin-bottom: 14rpx;
}

/* ===== 动效系统(页面入场 / 元素渐入 / 弹入 / 进度生长) ===== */
@keyframes pageIn {
  from {
    opacity: 0;
    transform: translateY(28rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(22rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes barGrow {
  from {
    width: 0;
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 页面根入场:每个二级页挂 page-anim。
   注意:fill 用 backwards 而非 both —— both 会让动画结束后残留 transform,
   使 .page 成为 fixed 弹层(.mask)的包含块,导致详情弹窗定位失效 */
.page-anim {
  animation: pageIn 0.34s ease backwards;
}

/* 元素错落渐入:si + si-1..si-8 */
.si {
  animation: fadeUp 0.42s ease both;
}
.si-1 {
  animation-delay: 0.03s;
}
.si-2 {
  animation-delay: 0.08s;
}
.si-3 {
  animation-delay: 0.13s;
}
.si-4 {
  animation-delay: 0.18s;
}
.si-5 {
  animation-delay: 0.23s;
}
.si-6 {
  animation-delay: 0.28s;
}
.si-7 {
  animation-delay: 0.33s;
}
.si-8 {
  animation-delay: 0.38s;
}

/* 弹入(结果卡/提示条) */
.pi {
  animation: popIn 0.3s ease both;
}

/* 进度条生长 */
.bar-grow {
  animation: barGrow 0.8s ease both;
}

/* 触摸反馈(hover-class 用) */
.press {
  opacity: 0.7;
  transform: scale(0.985);
  transition: opacity 0.1s ease, transform 0.1s ease;
}

/* ===== 桌面浏览器:手机比例外壳(居中限宽);手机端宽度 <520px 全宽不受影响 ===== */
@media (min-width: 520px) {
  body {
    background: #04060d;
  }
  uni-page-body {
    width: 430px;
    max-width: 430px;
    margin: 0 auto;
    background: #06080e;
    box-shadow: 0 0 0 1px rgba(60, 224, 255, 0.05),
      0 0 60px rgba(0, 0, 0, 0.55);
  }
}
@media (max-width: 519px) {
  uni-page-body {
    width: 100%;
  }
}
</style>