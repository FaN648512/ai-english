<template>
  <view class="page page-anim">
    <NavBar title="我的单词" en="MY WORDS" />

    <view class="page-wrap imp-page">
      <!-- 顶部切换 -->
      <view class="imp-tabs mono si si-1">
        <view
          class="imp-tab"
          :class="{ active: tab === 'import' }"
          @tap="tab = 'import'"
          >IMPORT · 导入</view
        >
        <view
          class="imp-tab"
          :class="{ active: tab === 'groups' }"
          @tap="switchGroups"
          >GROUPS · 词组</view
        >
      </view>

      <!-- ===== 导入 tab ===== -->
      <block v-if="tab === 'import'">
        <!-- 拍照导入(仅 H5,小程序端请用文字导入) -->
        <!-- #ifdef H5 -->
        <view class="card si si-2">
          <view class="section-kicker">PHOTO · 拍照导入</view>
          <view v-if="ocrState === 'running'" class="photo-box running">
            <view class="ocr-label mono">{{ ocrLabel }} {{ ocrProgress }}%</view>
            <view class="ocr-bar">
              <view
                class="ocr-bar-inner"
                :style="{ width: ocrProgress + '%' }"
              ></view>
            </view>
          </view>
          <view v-else class="photo-box" hover-class="press" @tap="choosePhoto">
            <view class="photo-icon">📷</view>
            <view class="photo-text">拍照 / 从相册选择单词图</view>
            <view class="photo-sub">识别单词与释义,支持词表、教材照片</view>
          </view>
        </view>
        <!-- #endif -->

        <!-- 文字导入 -->
        <view class="card si si-2">
          <view class="section-kicker">TEXT · 文字导入</view>
          <textarea
            v-model="rawText"
            class="imp-textarea mono"
            placeholder="每行一个,格式:单词 释义"
            placeholder-class="imp-placeholder"
            :maxlength="-1"
          />
          <view class="imp-hint"
            >例:apple 苹果 / give up 放弃;只有单词也行,释义会自动查询</view
          >
          <button class="btn-primary imp-btn" :disabled="busy" @tap="parseText">
            解析文本
          </button>
        </view>

        <!-- 确认列表 -->
        <view v-if="pending.length" class="card si si-3">
          <view class="section-kicker"
            >CONFIRM · 确认 {{ pending.length }} 词</view
          >
          <view v-if="enriching" class="enrich-row">
            <view class="ocr-label mono">查询释义 {{ enrichDone }}/{{ pending.length }}</view>
            <view class="ocr-bar">
              <view
                class="ocr-bar-inner"
                :style="{ width: (enrichDone / pending.length) * 100 + '%' }"
              ></view>
            </view>
          </view>
          <view
            v-for="(p, i) in pending"
            :key="i"
            class="word-row"
            :class="{ 'row-last': i === pending.length - 1 }"
          >
            <view class="row-main">
              <input
                v-model="p.word"
                class="word-input mono"
                placeholder="单词"
                placeholder-class="imp-placeholder"
              />
              <input
                v-model="p.meaning"
                class="meaning-input"
                placeholder="释义(可留空自动查)"
                placeholder-class="imp-placeholder"
              />
              <view class="word-del mono" @tap="removePending(i)">×</view>
            </view>
            <view v-if="p.phonetic || p.aiMeaning" class="row-sub">
              <text v-if="p.phonetic" class="row-sub-ph mono">{{
                p.phonetic
              }}</text>
              <text
                v-if="p.aiMeaning"
                class="row-sub-mean"
                >{{
                  p.aiMeaning.length > 46
                    ? p.aiMeaning.slice(0, 46) + "…"
                    : p.aiMeaning
                }}</text
              >
              <text class="row-sub-src mono">{{
                p.source === "local"
                  ? "词库"
                  : p.source === "online"
                    ? "在线"
                    : ""
              }}</text>
            </view>
          </view>
          <view class="imp-actions">
            <view class="ghost-btn" @tap="resetPending">清空重填</view>
            <view class="btn-primary imp-actions-btn" @tap="savePending"
              >加入词库</view
            >
          </view>
        </view>
      </block>

      <!-- ===== 词组 tab ===== -->
      <block v-else>
        <!-- 汇总 -->
        <view class="card si si-1">
          <view class="section-kicker">SUMMARY</view>
          <view class="mine-summary">
            <view class="ms-item">
              <view class="ms-num mono">{{ totalWords }}</view>
              <view class="ms-label">总词数</view>
            </view>
            <view class="ms-item">
              <view class="ms-num ms-cyan mono">{{ dueCount }}</view>
              <view class="ms-label">今日待复习</view>
            </view>
            <view class="ms-item">
              <view class="ms-num mono">{{ learnedCount }}</view>
              <view class="ms-label">已学</view>
            </view>
          </view>
          <view
            class="btn-primary imp-btn"
            :class="{ 'btn-disabled': !dueCount }"
            @tap="reviewAll"
            >开始复习</view
          >
          <view v-if="!totalWords" class="empty-tip"
            >还没有自己的词,去「导入」添加吧</view
          >
        </view>

        <!-- 分组列表 -->
        <view class="section-kicker group-kicker">GROUPS · 每 10 词一组</view>
        <view
          v-for="(g, i) in groups"
          :key="g.index"
          class="card group-card si"
          :class="'si-' + (i % 8 + 1)"
          hover-class="press"
          @tap="reviewGroup(g.index)"
        >
          <view class="group-row1">
            <view class="group-tag mono">G{{ g.index + 1 }}</view>
            <view class="group-name">第 {{ g.index + 1 }} 组</view>
            <view class="group-due mono" :class="{ done: !g.due }">{{
              g.due ? g.due + " 待复习" : "已完成"
            }}</view>
          </view>
          <view class="group-words mono">{{ groupPreview(g) }}</view>
          <view class="group-meta mono"
            >{{ g.total }} 词 · 已学 {{ g.learned }}/{{ g.total }}</view
          >
        </view>
      </block>
    </view>
  </view>
</template>

<script>
import NavBar from "@/components/NavBar.vue";
import {
  parseWordText,
  enrichItems,
  addUserWords,
  getUserGroups,
  getUserDueCount,
} from "@/utils/userWords.js";

export default {
  components: { NavBar },
  data() {
    return {
      tab: "import",
      rawText: "",
      pending: [],
      enriching: false,
      enrichDone: 0,
      busy: false,
      saveMsg: "",
      // 词组
      groups: [],
      dueCount: 0,
      // OCR(H5)
      ocrState: "idle",
      ocrLabel: "准备中",
      ocrProgress: 0,
    };
  },
  computed: {
    totalWords() {
      return this.groups.reduce((s, g) => s + g.total, 0);
    },
    learnedCount() {
      return this.groups.reduce((s, g) => s + g.learned, 0);
    },
  },
  onLoad(options) {
    if (options && options.tab === "groups") this.tab = "groups";
    this.refreshGroups();
  },
  onShow() {
    this.refreshGroups();
  },
  methods: {
    /* ---- 词组 ---- */
    refreshGroups() {
      this.groups = getUserGroups();
      this.dueCount = getUserDueCount();
    },
    switchGroups() {
      this.tab = "groups";
      this.refreshGroups();
    },
    groupPreview(g) {
      const names = g.words.slice(0, 4).map((w) => w.word);
      const more = g.total > 4 ? " +" + (g.total - 4) : "";
      return names.join(" · ") + more;
    },
    reviewAll() {
      if (!this.dueCount) {
        this.tab = "import";
        return;
      }
      uni.navigateTo({ url: "/pages/review/review?source=user" });
    },
    reviewGroup(index) {
      const g = this.groups.find((x) => x.index === index);
      if (g && !g.due) {
        uni.showToast({ title: "本组暂无待复习", icon: "none" });
        return;
      }
      uni.navigateTo({
        url: "/pages/review/review?source=user&group=" + index,
      });
    },

    /* ---- 导入 ---- */
    parseText() {
      if (this.busy) return;
      const items = parseWordText(this.rawText);
      if (!items.length) {
        uni.showToast({ title: "未解析到单词,请检查格式", icon: "none" });
        return;
      }
      this.pending = items;
      this.enrich();
    },
    async enrich() {
      this.enriching = true;
      this.enrichDone = 0;
      try {
        await enrichItems(this.pending, (done) => {
          this.enrichDone = done;
        });
      } finally {
        this.enriching = false;
      }
    },
    removePending(i) {
      this.pending.splice(i, 1);
    },
    resetPending() {
      this.pending = [];
      this.enrichDone = 0;
    },
    savePending() {
      if (this.busy || this.enriching) return;
      const valid = this.pending.filter(
        (p) => String(p.word || "").trim() && String(p.word || "").trim().length
      );
      if (!valid.length) {
        uni.showToast({ title: "没有可加入的单词", icon: "none" });
        return;
      }
      const res = addUserWords(valid);
      let title = "已加入 " + res.added + " 词 · 共 " + res.groups + " 组";
      if (res.skipped > 0) title += " · 跳过重复 " + res.skipped;
      uni.showToast({ title, icon: "none", duration: 2500 });
      this.pending = [];
      this.rawText = "";
      this.refreshGroups();
      this.tab = "groups";
    },

    /* ---- 拍照 OCR(仅 H5) ---- */
    // #ifdef H5
    choosePhoto() {
      if (this.ocrState === "running") return;
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        success: async (res) => {
          const path = res.tempFilePaths && res.tempFilePaths[0];
          if (!path) return;
          this.ocrState = "running";
          this.ocrLabel = "准备中";
          this.ocrProgress = 0;
          try {
            const dataUrl = await this.toDataUrl(path);
            const text = await this.runOcr(dataUrl);
            this.ocrState = "idle";
            if (!text || !text.trim()) {
              uni.showToast({
                title: "未识别到内容,请用文字导入",
                icon: "none",
              });
              return;
            }
            this.rawText = text.trim();
            this.parseText();
          } catch (e) {
            this.ocrState = "idle";
            uni.showToast({
              title: "识别失败,请用文字导入",
              icon: "none",
            });
          }
        },
      });
    },
    toDataUrl(path) {
      return new Promise((resolve, reject) => {
        if (/^data:/.test(path)) return resolve(path);
        fetch(path)
          .then((r) => r.blob())
          .then((b) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(b);
          })
          .catch(reject);
      });
    },
    async runOcr(dataUrl) {
      if (!window.Tesseract) await this.loadTesseract();
      const labels = {
        "loading tesseract core": "加载引擎",
        "initializing tesseract": "初始化",
        "loading language traineddata": "下载语言包",
        "initializing api": "准备识别",
        "recognizing text": "识别图片",
      };
      const worker = await window.Tesseract.createWorker("eng+chi_sim", 1, {
        logger: (m) => {
          if (labels[m.status]) this.ocrLabel = labels[m.status];
          this.ocrProgress = Math.round((m.progress || 0) * 100);
        },
      });
      try {
        const { data } = await worker.recognize(dataUrl);
        return data.text || "";
      } finally {
        worker.terminate();
      }
    },
    loadTesseract() {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("tesseract load failed"));
        document.head.appendChild(s);
      });
    },
    // #endif
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}
.imp-page {
  padding: 24rpx 28rpx 40rpx;
}

/* 顶部切换 */
.imp-tabs {
  display: flex;
  gap: 14rpx;
  margin-bottom: 24rpx;
}
.imp-tab {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
  padding: 18rpx 0;
  border: 1rpx solid rgba(148, 163, 184, 0.16);
  border-radius: 12rpx;
}
.imp-tab.active {
  color: #3ce0ff;
  border-color: rgba(60, 224, 255, 0.4);
  background: rgba(60, 224, 255, 0.06);
}

/* 拍照区 */
.photo-box {
  border: 1rpx dashed rgba(60, 224, 255, 0.3);
  border-radius: 14rpx;
  padding: 44rpx 24rpx;
  text-align: center;
}
.photo-box.running {
  border-style: solid;
  border-color: rgba(148, 163, 184, 0.2);
  padding: 36rpx 24rpx;
}
.photo-icon {
  font-size: 52rpx;
  margin-bottom: 16rpx;
}
.photo-text {
  font-size: 27rpx;
  color: #e8eef7;
}
.photo-sub {
  font-size: 22rpx;
  color: #5b6472;
  margin-top: 10rpx;
}
.ocr-label {
  font-size: 22rpx;
  color: #3ce0ff;
  letter-spacing: 1rpx;
  margin-bottom: 16rpx;
  text-align: center;
}
.ocr-bar {
  height: 6rpx;
  background: rgba(148, 163, 184, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
}
.ocr-bar-inner {
  height: 100%;
  background: #3ce0ff;
  box-shadow: 0 0 12rpx rgba(60, 224, 255, 0.6);
  border-radius: 999rpx;
  transition: width 0.2s ease;
}
.enrich-row {
  margin-bottom: 20rpx;
}

/* 文字导入 */
.imp-textarea {
  width: 100%;
  min-height: 220rpx;
  background: #0a0e16;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 25rpx;
  color: #e8eef7;
  line-height: 1.6;
}
.imp-placeholder {
  color: #4a5568;
}
.imp-hint {
  font-size: 22rpx;
  color: #5b6472;
  margin: 14rpx 0 20rpx;
}
.imp-btn {
  margin: 0;
}

/* 确认列表 */
.word-row {
  padding: 16rpx 0 14rpx;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.08);
}
.word-row.row-last {
  border-bottom: none;
}
.row-main {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.word-input {
  width: 220rpx;
  flex-shrink: 0;
  font-size: 27rpx;
  color: #ffffff;
  background: transparent;
  border: none;
  padding: 6rpx 0;
}
.meaning-input {
  flex: 1;
  min-width: 0;
  font-size: 25rpx;
  color: #b9c2d4;
  background: transparent;
  border: none;
  padding: 6rpx 0;
}
.word-del {
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  color: #5b6472;
  border: 1rpx solid rgba(148, 163, 184, 0.16);
  border-radius: 10rpx;
}
.row-sub {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 6rpx 0 0 234rpx;
  min-width: 0;
}
.row-sub-ph {
  font-size: 20rpx;
  color: #3ce0ff;
  flex-shrink: 0;
}
.row-sub-mean {
  font-size: 20rpx;
  color: #5b6472;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-sub-src {
  font-size: 18rpx;
  letter-spacing: 1rpx;
  color: #3a4254;
  flex-shrink: 0;
}
.imp-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.imp-actions-btn {
  flex: 2;
}
.ghost-btn {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #6b7688;
  border: 1rpx solid rgba(148, 163, 184, 0.2);
  border-radius: 14rpx;
  padding: 20rpx 0;
}

/* 汇总 */
.mine-summary {
  display: flex;
  justify-content: space-around;
  margin-bottom: 28rpx;
}
.ms-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ms-num {
  font-size: 52rpx;
  font-weight: 800;
  color: #ffffff;
}
.ms-cyan {
  color: #3ce0ff;
}
.ms-label {
  font-size: 23rpx;
  color: #8b96ab;
  margin-top: 6rpx;
}
.btn-disabled {
  opacity: 0.4;
}
.empty-tip {
  text-align: center;
  font-size: 24rpx;
  color: #5b6472;
  margin-top: 20rpx;
}

/* 分组 */
.group-kicker {
  margin-top: 8rpx;
}
.group-card {
  padding: 26rpx 28rpx;
}
.group-row1 {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.group-tag {
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: #3ce0ff;
  background: rgba(60, 224, 255, 0.07);
  border: 1rpx solid rgba(60, 224, 255, 0.25);
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
}
.group-name {
  font-size: 27rpx;
  font-weight: 600;
  color: #e8eef7;
  flex: 1;
}
.group-due {
  font-size: 21rpx;
  color: #3ce0ff;
}
.group-due.done {
  color: #34d399;
}
.group-words {
  font-size: 22rpx;
  color: #6b7688;
  margin-bottom: 12rpx;
  word-break: break-all;
}
.group-meta {
  font-size: 19rpx;
  color: #3a4254;
  letter-spacing: 1rpx;
}
</style>
