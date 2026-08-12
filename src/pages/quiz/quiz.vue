<template>
  <view class="page-wrap">
    <!-- 答题中 -->
    <block v-if="!finished">
      <view class="quiz-head">
        <view class="quiz-progress-text">
          {{ currentIndex + 1 }} / {{ questions.length }}
        </view>
        <view class="quiz-score">已答对 {{ correctCount }}</view>
      </view>

      <view class="card quiz-card">
        <view class="quiz-type-tag">
          {{ current.type === "word2meaning" ? "选词义" : "选单词" }}
        </view>
        <view class="quiz-prompt">{{ current.prompt }}</view>
        <view v-if="current.type === 'word2meaning'" class="quiz-phonetic">
          {{ current.word.phonetic }}
        </view>
      </view>

      <view class="option-list">
        <view
          v-for="(opt, i) in current.options"
          :key="i"
          class="option"
          :class="optionClass(opt)"
          @tap="pick(opt)"
        >
          <text class="option-key">{{ "ABCD"[i] }}</text>
          <text class="option-text">{{ opt }}</text>
          <text v-if="answered && opt === current.answer" class="option-mark">✓</text>
          <text
            v-else-if="answered && opt === current.picked && opt !== current.answer"
            class="option-mark wrong"
            >✗</text
          >
        </view>
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
      <view class="card done-card">
        <view class="done-icon">{{ resultIcon }}</view>
        <view class="done-title">
          {{ correctCount }}/{{ questions.length }}
        </view>
        <view class="done-sub">
          {{ resultText }}
        </view>
        <view class="done-actions">
          <button class="btn-primary done-btn" @tap="restart">再来一轮</button>
          <button class="done-btn-ghost" @tap="goHome">返回首页</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import wordsData from "@/data/words.js";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default {
  data() {
    return {
      questions: [],
      currentIndex: 0,
      answered: false,
      correctCount: 0,
      finished: false,
    };
  },
  computed: {
    current() {
      return this.questions[this.currentIndex] || null;
    },
    resultIcon() {
      const r = this.correctCount / this.questions.length;
      return r >= 0.8 ? "🏆" : r >= 0.6 ? "💪" : "📖";
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
      const words = shuffle(wordsData.words).slice(0, 10);
      const pool = wordsData.words;
      this.questions = words.map((word) => {
        const type = Math.random() > 0.5 ? "word2meaning" : "meaning2word";
        // 干扰项:随机取 3 个不同词
        const distractors = shuffle(
          pool.filter((w) => w.id !== word.id)
        )
          .slice(0, 3)
          .map((w) => (type === "word2meaning" ? w.aiMeaning : w.word));
        const answer =
          type === "word2meaning" ? word.aiMeaning : word.word;
        return {
          word,
          type,
          prompt:
            type === "word2meaning" ? word.word : word.aiMeaning,
          options: shuffle([answer, ...distractors]),
          answer,
          picked: null,
        };
      });
      this.currentIndex = 0;
      this.correctCount = 0;
      this.finished = false;
      this.answered = false;
    },
    pick(opt) {
      if (this.answered) return;
      this.current.picked = opt;
      this.answered = true;
      if (opt === this.current.answer) {
        this.correctCount += 1;
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
    restart() {
      this.build();
    },
    goHome() {
      uni.navigateBack();
    },
  },
};
</script>

<style lang="scss" scoped>
.quiz-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.quiz-progress-text {
  font-size: 26rpx;
  color: #8b96ab;
}
.quiz-score {
  font-size: 26rpx;
  color: #4cd964;
}

.quiz-card {
  text-align: center;
  padding: 48rpx 32rpx;
}
.quiz-type-tag {
  display: inline-block;
  font-size: 22rpx;
  color: #35c4f0;
  background: rgba(53, 196, 240, 0.12);
  border: 1rpx solid rgba(53, 196, 240, 0.35);
  border-radius: 999rpx;
  padding: 6rpx 20rpx;
  margin-bottom: 24rpx;
}
.quiz-prompt {
  font-size: 44rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.5;
}
.quiz-phonetic {
  font-size: 28rpx;
  color: #8b96ab;
  margin-top: 12rpx;
}

.option-list {
  margin-top: 32rpx;
}
.option {
  display: flex;
  align-items: center;
  background: #1a2233;
  border: 2rpx solid #2a3450;
  border-radius: 20rpx;
  padding: 26rpx 24rpx;
  margin-bottom: 16rpx;
}
.option-key {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #222c40;
  color: #8b96ab;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}
.option-text {
  flex: 1;
  font-size: 28rpx;
  color: #e8ecf4;
  line-height: 1.5;
}
.option-mark {
  font-size: 32rpx;
  color: #4cd964;
  margin-left: 12rpx;
}
.option-mark.wrong {
  color: #ff8f9d;
}
.option-right {
  border-color: #4cd964;
  background: rgba(76, 217, 100, 0.1);
}
.option-wrong {
  border-color: #ff8f9d;
  background: rgba(255, 143, 157, 0.1);
}
.option-dim {
  opacity: 0.45;
}

.quiz-next {
  margin-top: 16rpx;
}

/* 结果 */
.done-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}
.done-card {
  width: 100%;
  text-align: center;
  padding: 60rpx 40rpx;
}
.done-icon {
  font-size: 96rpx;
  margin-bottom: 20rpx;
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
  margin-bottom: 40rpx;
}
.done-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.done-btn {
  margin: 0;
}
.done-btn-ghost {
  background: transparent;
  color: #8b96ab;
  font-size: 28rpx;
  border: none;
  padding: 16rpx 0;
}
.done-btn-ghost::after {
  border: none;
}
</style>
