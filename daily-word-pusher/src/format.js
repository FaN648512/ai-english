/** 单词展示的公共格式，供多行文本推送与飞书卡片共用 */

/** 标题行，如 `**3. main**  /meɪn/` */
function wordHeading(word, index) {
  return `**${index}. ${word.word}**${word.phonetic ? `  ${word.phonetic}` : ''}`;
}

/** 领域标签放到行尾：`n.（编程）主函数` → `n. 主函数（编程）` */
function moveFieldToEnd(line) {
  const matched = line.match(/^([a-zA-Z]+\.)\s*（([^）]+)）\s*(.*)$/);
  if (!matched) return line;
  const [, pos, field, rest] = matched;
  return rest ? `${pos} ${rest}（${field}）` : `${pos}（${field}）`;
}

/** 释义行：自定义释义优先，其次 AI 义项，最后提示补充 */
function meaningLines(word) {
  if (word.customMeaning && word.customMeaning.trim()) {
    return word.customMeaning
      .split(/\n+/)
      .map((line) => moveFieldToEnd(line.trim()))
      .filter(Boolean);
  }
  if (Array.isArray(word.entries) && word.entries.length) {
    return word.entries.map((e) => {
      const pos = (e.pos || '').trim();
      const field = (e.field || '').trim();
      const zh = `${e.zh}${field ? `（${field}）` : ''}`;
      return pos ? `${pos} ${zh}` : zh;
    });
  }
  return ['释义待补充，可在词库中手动填写'];
}

module.exports = { wordHeading, meaningLines };
