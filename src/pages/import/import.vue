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
        <view
          class="imp-tab"
          :class="{ active: tab === 'library' }"
          @tap="switchLibrary"
          >LIBRARY · 词库</view
        >
      </view>

      <!-- ===== 导入 tab ===== -->
      <block v-if="tab === 'import'">
        <!-- 快速翻译:输入单词/短语/中文,直接翻译,一键入库 -->
        <view class="card si si-2">
          <view class="section-kicker">TRANSLATE · 快速翻译</view>
          <view class="qt-row">
            <input
              v-model="qtInput"
              class="qt-input mono"
              placeholder="输入单词 / 短语 / 中文"
              placeholder-class="imp-placeholder"
              confirm-type="search"
              @confirm="quickTranslate"
            />
            <view
              class="qt-btn mono"
              :class="{ busy: qtLoading }"
              hover-class="press"
              @tap="quickTranslate"
              >{{ qtLoading ? "…" : "译" }}</view
            >
          </view>
          <view v-if="qtLoading" class="qt-status mono">翻译中…</view>
          <view v-else-if="qtResult" class="qt-result">
            <view class="qt-out">{{ qtResult.text }}</view>
            <view class="qt-src mono"
              >{{
                qtResult.dir === "en2zh" ? "EN → ZH" : "ZH → EN"
              }}
              · {{ qtResult.source }}</view
            >
            <view class="qt-actions">
              <view class="ghost-btn" @tap="resetQt">清空</view>
              <view class="btn-primary qt-add" @tap="addTranslated"
                >加入词库</view
              >
            </view>
          </view>
          <view v-else-if="qtFailed" class="qt-fail mono"
            >翻译失败,请稍后重试</view
          >
        </view>

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
              <text class="row-sub-src mono">{{ sourceLabel(p) }}</text>
            </view>
            <view v-if="isFailed(p)" class="row-fail mono"
              >未查到释义 · 可手动填写释义后加入</view
            >
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
      <block v-else-if="tab === 'groups'">
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
            class="btn-primary imp-btn imp-btn-review"
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

      <!-- ===== 词库 tab ===== -->
      <block v-else-if="tab === 'library'">
        <!-- 搜索框 -->
        <view class="search-bar si si-1">
          <text class="search-icon">⌕</text>
          <input
            class="search-input mono"
            v-model="libKeyword"
            placeholder="搜索单词 / 释义"
            placeholder-class="search-placeholder"
          />
          <text v-if="libKeyword" class="search-clear" @tap="libKeyword = ''"
            >✕</text
          >
        </view>

        <view class="result-count mono">
          {{ libFiltered.length }} WORDS
        </view>
        <view
          v-for="u in libFiltered"
          :key="u.id"
          class="result-row"
          hover-class="press"
          @tap="detailWord = u"
        >
          <view class="result-main">
            <view class="result-word mono">
              {{ u.word }}
              <text class="result-pos mono">{{ u.pos }}</text>
            </view>
            <view class="result-ai">{{ u.originMeaning }}</view>
          </view>
          <text class="result-arrow">›</text>
        </view>
        <view v-if="libFiltered.length === 0" class="empty">
          {{ libKeyword ? "没有匹配的词,换个关键词试试" : "词库还是空的,去「导入」添加吧" }}
        </view>
      </block>
    </view>

    <!-- 详情弹层 -->
    <view v-if="detailWord" class="mask" @tap="detailWord = null">
      <view class="mask-card" @tap.stop>
        <view class="mask-close" @tap="detailWord = null">✕</view>
        <view class="mask-scroll">
          <WordCard :word="detailWord" mode="detail" />
          <view class="detail-btns">
            <button class="edit-btn mono" @tap="openEdit(detailWord)"
              >EDIT · 编辑该词</button
            >
            <button class="del-btn" @tap="confirmDelete(detailWord)"
              >删除该词</button
            >
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑弹层 -->
    <view v-if="editMode && editWord" class="mask" @tap="closeEdit">
      <view class="mask-card" @tap.stop>
        <view class="mask-close" @tap="closeEdit">✕</view>
        <view class="mask-scroll">
          <view class="section-kicker">EDIT · 编辑词条</view>
          <view class="edit-field">
            <text class="edit-label mono">WORD</text>
            <input class="edit-input mono" v-model="editForm.word" />
          </view>
          <view class="edit-field">
            <text class="edit-label mono">PHON</text>
            <input class="edit-input mono" v-model="editForm.phonetic" />
          </view>
          <view class="edit-field">
            <text class="edit-label mono">POS</text>
            <input class="edit-input mono" v-model="editForm.pos" />
          </view>
          <view class="edit-field">
            <text class="edit-label">主义</text>
            <input class="edit-input" v-model="editForm.originMeaning" />
          </view>
          <view class="edit-field">
            <text class="edit-label">副义</text>
            <input class="edit-input" v-model="editForm.aiMeaning" />
          </view>
          <view class="edit-field">
            <text class="edit-label mono">EX</text>
            <input class="edit-input mono" v-model="editForm.example" />
          </view>
          <view class="edit-field">
            <text class="edit-label">例句译</text>
            <input class="edit-input" v-model="editForm.exampleZh" />
          </view>
          <view class="edit-field">
            <text class="edit-label">MEMO</text>
            <textarea
              class="edit-input edit-area"
              v-model="editForm.memoryTip"
              :maxlength="-1"
            />
          </view>
          <view class="edit-actions">
            <view class="ghost-btn" @tap="closeEdit">取消</view>
            <view class="btn-primary edit-save" @tap="saveEdit">保存</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import NavBar from "@/components/NavBar.vue";
import WordCard from "@/components/WordCard.vue";
import {
  parseWordText,
  enrichItems,
  addUserWords,
  getUserGroups,
  getUserDueCount,
  removeUserWords,
  translateText,
  updateUserWord,
} from "@/utils/userWords.js";

export default {
  components: { NavBar, WordCard },
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
      // 词库
      libKeyword: "",
      detailWord: null,
      editMode: false,
      editWord: null,
      editForm: {},
      // 快速翻译
      qtInput: "",
      qtLoading: false,
      qtResult: null,
      qtFailed: false,
      qtAdding: false,
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
    libFiltered() {
      const all = [];
      this.groups.forEach((g) => g.words.forEach((w) => all.push(w)));
      const kw = this.libKeyword.trim().toLowerCase();
      if (!kw) return all;
      const kwRaw = this.libKeyword.trim();
      return all.filter(
        (w) =>
          w.word.toLowerCase().includes(kw) ||
          (w.originMeaning || "").includes(kwRaw) ||
          (w.aiMeaning || "").toLowerCase().includes(kw)
      );
    },
  },
  onLoad(options) {
    if (options && options.tab) this.tab = options.tab;
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
    switchLibrary() {
      this.tab = "library";
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
      const all = this.pending.filter(
        (p) => String(p.word || "").trim().length
      );
      // 无释义(用户没给 + 查询全部失败)的词不允许入库
      const valid = all.filter((p) => String(p.meaning || "").trim().length);
      const skipped = all.length - valid.length;
      if (!valid.length) {
        uni.showToast({
          title: "全部未查到释义 · 请手动填写释义后再加入",
          icon: "none",
          duration: 2500,
        });
        return;
      }
      const res = addUserWords(valid);
      let title = "已加入 " + res.added + " 词 · 共 " + res.groups + " 组";
      if (skipped > 0) title += " · 跳过无释义 " + skipped;
      if (res.skipped - skipped > 0)
        title += " · 跳过重复 " + (res.skipped - skipped);
      uni.showToast({ title, icon: "none", duration: 2500 });
      // 从待确认列表移除已入库的词,保留无释义的供手动补填
      const validWords = new Set(valid.map((p) => p.word.toLowerCase()));
      this.pending = this.pending.filter(
        (p) => !validWords.has(String(p.word || "").trim().toLowerCase())
      );
      if (!this.pending.length) this.rawText = "";
      this.refreshGroups();
      if (!this.pending.length) this.tab = "groups";
    },
    /** 查询来源标签 */
    sourceLabel(p) {
      return p.source === "local"
        ? "词库"
        : p.source === "online"
          ? "在线"
          : p.source === "fallback"
            ? "翻译"
            : "";
    },
    /** 该词查询完全失败:无用户释义且无任何查到的释义 */
    isFailed(p) {
      return (
        !String(p.meaning || "").trim() &&
        !String(p.originMeaning || "").trim() &&
        !this.enriching
      );
    },
    /** 删除词条(带确认) */
    confirmDelete(u) {
      uni.showModal({
        title: "删除单词",
        content: "确定从「我的单词」删除「" + u.word + "」吗?",
        confirmColor: "#fb7085",
        success: (r) => {
          if (!r.confirm) return;
          removeUserWords(u.id);
          this.detailWord = null;
          this.refreshGroups();
          uni.showToast({ title: "已删除", icon: "none" });
        },
      });
    },

    /* ---- 编辑词条 ---- */
    openEdit(u) {
      this.editWord = u;
      this.editForm = {
        word: u.word,
        phonetic: u.phonetic || "",
        pos: u.pos || "",
        originMeaning: u.originMeaning || "",
        aiMeaning: u.aiMeaning || "",
        example: u.example || "",
        exampleZh: u.exampleZh || "",
        memoryTip: u.memoryTip || "",
      };
      this.editMode = true;
    },
    closeEdit() {
      this.editMode = false;
      this.editWord = null;
    },
    saveEdit() {
      if (!this.editWord) return;
      if (!String(this.editForm.word || "").trim()) {
        uni.showToast({ title: "单词不能为空", icon: "none" });
        return;
      }
      updateUserWord(this.editWord.id, {
        word: this.editForm.word,
        phonetic: this.editForm.phonetic,
        pos: this.editForm.pos,
        originMeaning: this.editForm.originMeaning,
        aiMeaning: this.editForm.aiMeaning,
        example: this.editForm.example,
        exampleZh: this.editForm.exampleZh,
        memoryTip: this.editForm.memoryTip,
      });
      this.detailWord = null;
      this.closeEdit();
      this.refreshGroups();
      uni.showToast({ title: "已保存", icon: "none" });
    },

    /* ---- 快速翻译 ---- */
    async quickTranslate() {
      const text = String(this.qtInput || "").trim();
      if (!text || this.qtLoading) return;
      this.qtLoading = true;
      this.qtResult = null;
      this.qtFailed = false;
      const r = await translateText(text);
      this.qtLoading = false;
      if (r) this.qtResult = r;
      else this.qtFailed = true;
    },
    /** 翻译结果一键入库:英文侧为词条,中文侧为用户释义 */
    async addTranslated() {
      if (!this.qtResult || this.qtAdding) return;
      const input = String(this.qtInput || "").trim();
      const r = this.qtResult;
      const word = r.dir === "en2zh" ? input : r.text;
      const meaning = r.dir === "en2zh" ? r.text : input;
      if (!/^[A-Za-z][A-Za-z'\- ]{0,39}$/.test(word)) {
        uni.showToast({ title: "仅支持英文单词/短语入库", icon: "none" });
        return;
      }
      this.qtAdding = true;
      uni.showLoading({ title: "加入中…", mask: true });
      try {
        const items = [{ word, meaning }];
        await enrichItems(items);
        const res = addUserWords(items);
        uni.hideLoading();
        if (res.added) {
          uni.showToast({
            title: "已加入 · 共 " + res.groups + " 组",
            icon: "none",
          });
          this.resetQt();
          this.refreshGroups();
        } else {
          uni.showToast({ title: "该词已在词库", icon: "none" });
        }
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: "加入失败,请重试", icon: "none" });
      } finally {
        this.qtAdding = false;
      }
    },
    resetQt() {
      this.qtInput = "";
      this.qtResult = null;
      this.qtFailed = false;
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

/* 快速翻译 */
.qt-row {
  display: flex;
  gap: 14rpx;
}
.qt-input {
  flex: 1;
  min-width: 0;
  background: #0a0e16;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 27rpx;
  color: #ffffff;
}
.qt-btn {
  width: 92rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(60, 224, 255, 0.08);
  border: 1rpx solid rgba(60, 224, 255, 0.35);
  border-radius: 12rpx;
  color: #3ce0ff;
  font-size: 26rpx;
  letter-spacing: 2rpx;
}
.qt-btn.busy {
  opacity: 0.5;
}
.qt-status {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #3ce0ff;
  letter-spacing: 1rpx;
}
.qt-fail {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #fb7085;
  letter-spacing: 1rpx;
}
.qt-result {
  margin-top: 24rpx;
}
.qt-out {
  font-size: 38rpx;
  font-weight: 700;
  color: #ffffff;
  word-break: break-all;
  line-height: 1.4;
}
.qt-src {
  margin: 12rpx 0 22rpx;
  font-size: 19rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
}
.qt-actions {
  display: flex;
  gap: 16rpx;
}
.qt-add {
  flex: 2;
  margin: 0;
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
  box-sizing: border-box;
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
/* 汇总页"开始复习":缩小约 20% */
.imp-btn-review {
  font-size: 22rpx;
  padding: 13rpx 0;
  width: 78%;
  margin: 0 auto;
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
.row-fail {
  margin: 8rpx 0 0 234rpx;
  font-size: 20rpx;
  letter-spacing: 1rpx;
  color: #fb7085;
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

/* ===== 词库 tab(与内置词库一致) ===== */
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
.del-btn {
  margin: 0;
  background: rgba(251, 112, 133, 0.08);
  color: #fb7085;
  border: 1rpx solid rgba(251, 112, 133, 0.35);
  border-radius: 14rpx;
  font-size: 26rpx;
  padding: 16rpx 0;
}
.edit-btn {
  margin: 0;
  background: rgba(60, 224, 255, 0.08);
  color: #3ce0ff;
  border: 1rpx solid rgba(60, 224, 255, 0.35);
  border-radius: 14rpx;
  font-size: 26rpx;
  padding: 16rpx 0;
}
.detail-btns {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}
.detail-btns button {
  flex: 1;
}
.edit-btn::after,
.del-btn::after {
  border: none;
}

/* 编辑表单 */
.edit-field {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 20rpx;
}
.edit-label {
  width: 130rpx;
  flex-shrink: 0;
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
}
.edit-input {
  flex: 1;
  min-width: 0;
  background: #0a0e16;
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 10rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  color: #ffffff;
}
.edit-area {
  min-height: 120rpx;
}
.edit-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}
.edit-actions .ghost-btn {
  flex: 1;
  text-align: center;
}
.edit-save {
  flex: 1;
  margin: 0;
}
</style>
