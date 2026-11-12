const cron = require('node-cron');
const config = require('./config');
const store = require('./store');
const push = require('./push');

let task = null;

function describeCron(expr, tz) {
  const m = CRON_DAILY_SRC(expr);
  if (!m) return `按 cron 表达式 ${expr} 执行（${tz}）`;
  return `每天 ${String(m[2]).padStart(2, '0')}:${String(m[1]).padStart(2, '0')}（${tz}）`;
}

/** "30 8 * * *" → "08:30"；非每日表达式回落到 08:00 */
function cronToTime(expr) {
  const m = CRON_DAILY_SRC(expr);
  if (!m) return '08:00';
  return `${String(Number(m[2])).padStart(2, '0')}:${String(Number(m[1])).padStart(2, '0')}`;
}

function CRON_DAILY_SRC(expr) {
  return /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/.exec(String(expr).trim());
}

async function runner() {
  console.log(`[scheduler] ${new Date().toISOString()} 触发自动推送`);
  try {
    const result = await push.runPush({ auto: true });
    console.log('[scheduler] 推送结果：', JSON.stringify(result));
  } catch (err) {
    console.error('[scheduler] 自动推送失败：', err.message);
  }
}

/** 按当前生效设置启动（或重启）定时任务 */
function scheduleTask() {
  const { pushCron } = store.effectiveSettings();
  if (!cron.validate(pushCron)) {
    console.error(`[scheduler] cron 表达式不合法：${pushCron}，保留原有定时任务`);
    return;
  }
  if (task) task.stop();
  task = cron.schedule(pushCron, runner, { timezone: config.pushTimezone });
  console.log(`[scheduler] 已启动：${describeCron(pushCron, config.pushTimezone)}`);
}

function start() {
  if (!config.schedulerEnabled) {
    console.log('[scheduler] 内置定时器已禁用（SCHEDULER_ENABLED=false）');
    return;
  }
  scheduleTask();
}

function reschedule() {
  if (!config.schedulerEnabled) return;
  scheduleTask();
}

function nextRunAt() {
  const { pushCron } = store.effectiveSettings();
  const m = CRON_DAILY_SRC(pushCron);
  if (!m) return null;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: config.pushTimezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const nowMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const target = Number(m[2]) * 60 + Number(m[1]);
  const delta = target > nowMinutes ? target - nowMinutes : 24 * 60 - nowMinutes + target;
  const at = new Date(now.getTime() + delta * 60 * 1000);
  return at.toISOString();
}

module.exports = { start, reschedule, describeCron, cronToTime, nextRunAt };
