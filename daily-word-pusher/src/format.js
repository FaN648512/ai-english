/** 单词展示的公共格式，供多行文本推送与飞书卡片共用 */

/** 标题行，如 `**3. main**  /meɪn/` */
function wordHeading(word, index) {
  return `**${index}. ${word.word}**${word.phonetic ? `  ${word.phonetic}` : ''}`;
}

/** 释义行：自定义释义优先，其次 AI 义项，最后提示补充 */
function meaningLines(word) {
  if (word.customMeaning && word.customMeaning.trim()) {
    return word.customMeaning
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (Array.isArray(word.entries) && word.entries.length) {
    return word.entries.map((e) => {
      const label = `${e.pos || ''}${e.field ? `（${e.field}）` : ''}`.trim();
      return label ? `${label} ${e.zh}` : e.zh;
    });
  }
  return ['释义待补充，可在词库中手动填写'];
}

module.exports = { wordHeading, meaningLines };
