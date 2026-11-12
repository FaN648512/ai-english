#!/usr/bin/env node
/**
 * 一次性推送：供 GitHub Actions / 系统 cron / Trae 自动化调用。
 * 跑完即退出，不依赖常驻服务。
 *
 *   node src/push-once.js           # 当天已推送过则跳过
 *   node src/push-once.js --force   # 强制再推一批
 */
const push = require('./push');

const force = process.argv.includes('--force');

(async () => {
  const result = await push.runPush({ auto: !force });

  if (!result.ok) {
    console.error(`[push-once] 未推送：${result.message}`);
    process.exit(result.reason === 'empty_library' || result.reason === 'busy' ? 1 : 0);
  }

  console.log(`[push-once] 第 ${result.round} 轮已推送 ${result.count} 个单词：${result.words.join(', ')}`);
})().catch((err) => {
  console.error(`[push-once] 推送失败：${err.message}`);
  process.exit(1);
});
