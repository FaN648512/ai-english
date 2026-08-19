<template>
  <view class="page page-anim">
    <NavBar title="自测" en="QUIZ" />

    <view class="page-wrap">
      <!-- 答题中 -->
      <block v-if="!finished">
        <view class="quiz-head si si-1">
          <view class="quiz-progress-text mono">
            {{ currentIndex + 1 }} / {{ questions.length }}
          </view>
          <view class="quiz-score mono">SCORE {{ correctCount }}</view>
        </view>
        <view class="quiz-progress-bar si si-1">
          <view
            class="quiz-progress-inner"
            :style="{ width: progressPercent + '%' }"
          ></view>
        </view>

        <view class="card quiz-card si si-2">
          <view class="quiz-type-tag mono">
            {{ current.type === "word2meaning" ? "WORD → MEANING" : "MEANING → WORD" }}
          </view>
          <view class="quiz-prompt mono">{{ current.prompt }}</view>
          <view v-if="current.type === 'word2meaning'" class="quiz-phonetic mono">
            {{ current.word.phonetic }}
          </view>
        </view>

        <view class="option-list">
          <view
            v-for="(opt, i) in current.options"
            :key="currentIndex + '-' + i"
            class="option si"
            :class="[optionClass(opt), 'si-' + (i + 1)]"
            hover-class="press"
            @tap="pick(opt)"
          >
            <text class="option-key mono">{{ "ABCD"[i] }}</text>
            <text class="option-text">{{ opt }}</text>
            <text v-if="answered && opt === current.answer" class="option-mark">✓</text>
            <text
              v-else-if="answered && opt === current.picked && opt !== current.answer"
              class="option-mark wrong"
              >✗</text
            >
          </view>
        </view>

        <!-- 答题后:词条强化提示 -->
        <view v-if="answered" class="card quiz-hint pi">
          <view class="quiz-hint-head">
            <text class="quiz-hint-word mono">{{ current.word.word }}</text>
            <text class="quiz-hint-phonetic mono">{{ current.word.phonetic }}</text>
          </view>
          <view class="quiz-hint-origin">{{ current.word.originMeaning }}</view>
        </view>

        <button
          v-if="answered"
          class="btn-primary quiz-next"
          @tap="next"
        >
          {{ currentIndex + 1 >= questions.length ? "查看结果" : "下一题" }}
        </button>
      </block>

      <!-- 结果 -->
      <view v-else class="done-wrap">
        <view class="card done-card pi">
          <view class="done-icon">{{ resultIcon }}</view>
          <view class="done-title mono">
            {{ correctCount }} / {{ questions.length }}
          </view>
          <view class="done-sub">
            {{ resultText }}
          </view>

          <!-- 错词回顾 -->
          <block v-if="wrongList.length">
            <view class="wrong-kicker">WRONG · 错词回顾</view>
            <view
              v-for="w in wrongList"
              :key="w.id"
              class="wrong-row"
              hover-class="press"
              @tap="showDetail(w)"
            >
              <view class="wrong-word mono">{{ w.word }}</view>
              <view class="wrong-ai">{{ w.aiMeaning }}</view>
            </view>
          </block>

          <view class="done-actions">
            <button class="btn-primary done-btn" @tap="restart">再来一轮</button>
            <button class="done-btn-ghost" @tap="goHome">返回首页</button>
          </view>
        </view>
      </view>

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
import { getReviewState } from "@/utils/storage.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default {
  components: { NavBar, WordCard },
  data() {
    return {
      questions: [],
      currentIndex: 0,
      answered: false,
      correctCount: 0,
      finished: false,
      wrongList: [],
      detailWord: null,
    };
  },
  computed: {
    current() {
      return this.questions[this.currentIndex] || null;
    },
    progressPercent() {
      if (!this.questions.length) return 0;
      return Math.round((this.currentIndex / this.questions.length) * 100);
    },
    resultIcon() {
      const r = this.correctCount / this.questions.length;
      return r >= 0.8 ? "◉" : r >= 0.6 ? "◎" : "◌";
    },
    resultText() {
      const r = this.correctCount / this.questions.length;
      if (r >= 0.8) return "相当不错,这几个词基本拿下了!";
      if (r >= 0.6) return "还不错,再复习一轮会更好。";
      return "别灰心,回闪卡把这几张重新过一遍。";
    },
  },
  onLoad() {
    this.build();
  },
  methods: {
    build() {
      const review = getReviewState();
      // 用已学过的词组合题目;不足4个(凑不出干扰项)或完全未学习时,回退全库
      const learned = wordsData.words.filter(
        (w) => (review[w.id]?.reviews || 0) > 0
      );
      const source = learned.length >= 4 ? learned : wordsData.words;
      const count = Math.min(10, source.length);
      const words = shuffle(source).slice(0, count);
      const pool = source;
      this.questions = words.map((word) => {
        // 统一:中文为题目,英文为选项
        const type = "meaning2word";
        const distractors = shuffle(
          pool.filter((w) => w.id !== word.id)
        )
          .slice(0, 3)
          .map((w) => w.word);
        const answer = word.word;
        return {
          word,
          type,
          prompt: word.aiMeaning,
          options: shuffle([answer, ...distractors]),
          answer,
          picked: null,
        };
      });
      this.currentIndex = 0;
      this.correctCount = 0;
      this.finished = false;
      this.answered = false;
      this.wrongList = [];
    },
    pick(opt) {
      if (this.answered) return;
      this.current.picked = opt;
      this.answered = true;
      if (opt === this.current.answer) {
        this.correctCount += 1;
      } else {
        this.wrongList.push(this.current.word);
      }
    },
    next() {
      if (this.currentIndex + 1 >= this.questions.length) {
        this.finished = true;
      } else {
        this.currentIndex += 1;
        this.answered = false;
      }
    },
    optionClass(opt) {
      if (!this.answered) return "";
      if (opt === this.current.answer) return "option-right";
      if (opt === this.current.picked) return "option-wrong";
      return "option-dim";
    },
    showDetail(word) {
      this.detailWord = word;
    },
    restart() {
      this.build();
    },
    goHome() {
      const pages = getCurrentPages();
      if (pages.length > 1) uni.navigateBack();
      else uni.reLaunch({ url: "/pages/index/index" });
    },
  },
};
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
}
.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.quiz-progress-text {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #5b6472;
}
.quiz-score {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  color: #34d399;
}
.quiz-progress-bar {
  height: 6rpx;
  background: rgba(148, 163, 184, 0.12);
  border-radius: 999rpx;
  overflow: hidden;
  margin-bottom: 28rpx;
}
.quiz-progress-inner {
  height: 100%;
  background: #3ce0ff;
  box-shadow: 0 0 12rpx rgba(60, 224, 255, 0.6);
  border-radius: 999rpx;
  transition: width 0.3s;
}

.quiz-card {
  text-align: center;
  padding: 48rpx 32rpx;
}
.quiz-type-tag {
  display: inline-block;
  font-size: 20rpx;
  letter-spacing: 2rpx;
  color: #3ce0ff;
  background: rgba(60, 224, 255, 0.06);
  border: 1rpx solid rgba(60, 224, 255, 0.28);
  border-radius: 8rpx;
  padding: 6rpx 20rpx;
  margin-bottom: 28rpx;
}
.quiz-prompt {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.5;
}
.quiz-phonetic {
  font-size: 26rpx;
  color: #6b7688;
  margin-top: 14rpx;
}

.option-list {
  margin-top: 28rpx;
}
.option {
  display: flex;
  align-items: center;
  background: rgba(14, 20, 32, 0.6);
  border: 1rpx solid rgba(148, 163, 184, 0.14);
  border-radius: 12rpx;
  padding: 26rpx 24rpx;
  margin-bottom: 16rpx;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.option-key {
  width: 40rpx;
  font-size: 24rpx;
  color: #5b6472;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.option-text {
  flex: 1;
  font-size: 28rpx;
  color: #e8eef7;
  line-height: 1.5;
}
.option-mark {
  font-size: 34rpx;
  color: #34d399;
  margin-left: 12rpx;
}
.option-mark.wrong {
  color: #fb7085;
}
.option-right {
  border-color: #34d399;
  background: rgba(52, 211, 153, 0.08);
}
.option-right .option-key {
  color: #34d399;
}
.option-wrong {
  border-color: #fb7085;
  background: rgba(251, 112, 133, 0.08);
}
.option-wrong .option-key {
  color: #fb7085;
}
.option-dim {
  opacity: 0.4;
}

/* 答题提示 */
.quiz-hint {
  margin-top: 24rpx;
  padding: 26rpx 28rpx;
  text-align: left;
}
.quiz-hint-head {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  margin-bottom: 8rpx;
}
.quiz-hint-word {
  font-size: 32rpx;
  font-weight: 700;
  color: #3ce0ff;
}
.quiz-hint-phonetic {
  font-size: 22rpx;
  color: #5b6472;
}
.quiz-hint-origin {
  font-size: 25rpx;
  color: #b9c2d4;
  line-height: 1.55;
}

.quiz-next {
  margin-top: 16rpx;
}

/* 结果 */
.done-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
.done-card {
  width: 100%;
  text-align: center;
  padding: 60rpx 40rpx;
}
.done-icon {
  font-size: 44rpx;
  color: #3ce0ff;
  margin-bottom: 24rpx;
}
.done-title {
  font-size: 48rpx;
  font-weight: 800;
  color: #fff;
  margin-bottom: 12rpx;
}
.done-sub {
  font-size: 26rpx;
  color: #8b96ab;
  margin-bottom: 32rpx;
}

.wrong-kicker {
  font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 18rpx;
  letter-spacing: 3rpx;
  color: #fb7085;
  text-align: left;
  margin-bottom: 14rpx;
}
.wrong-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(148, 163, 184, 0.1);
}
.wrong-row:last-of-type {
  border-bottom: none;
  margin-bottom: 8rpx;
}
.wrong-word {
  font-size: 28rpx;
  font-weight: 600;
  color: #e8eef7;
}
.wrong-ai {
  font-size: 22rpx;
  color: #6b7688;
  margin-top: 4rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.done-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 28rpx;
}
.done-btn {
  margin: 0;
}
.done-btn-ghost {
  background: transparent;
  color: #6b7688;
  font-size: 28rpx;
  border: none;
  padding: 16rpx 0;
}
.done-btn-ghost::after {
  border: none;
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