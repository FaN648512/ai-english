/**
 * 中国法定休息日判断（2026 年，依据国办发明电〔2025〕7 号）。
 * 规则：周末默认休息；调休上班日即使落在周末也照常推送；法定节假日即使落在工作日也不推送。
 * 每年国务院公布次年安排后，在 REST_DAYS / WORK_DAYS 里补上对应日期即可。
 */

function range(start, end) {
  const days = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

const REST_DAYS = new Set([
  ...range('2026-01-01', '2026-01-03'), // 元旦
  ...range('2026-02-15', '2026-02-23'), // 春节
  ...range('2026-04-04', '2026-04-06'), // 清明节
  ...range('2026-05-01', '2026-05-05'), // 劳动节
  ...range('2026-06-19', '2026-06-21'), // 端午节
  ...range('2026-09-25', '2026-09-27'), // 中秋节
  ...range('2026-10-01', '2026-10-07'), // 国庆节
]);

const WORK_DAYS = new Set([
  '2026-01-04', // 元旦调休
  '2026-02-14',
  '2026-02-28', // 春节调休
  '2026-05-09', // 劳动节调休
  '2026-09-20',
  '2026-10-10', // 国庆节调休
]);

/** date 形如 2026-11-16（北京时间日期） */
function isRestDay(date) {
  if (WORK_DAYS.has(date)) return false;
  if (REST_DAYS.has(date)) return true;
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

module.exports = { isRestDay, REST_DAYS, WORK_DAYS };
