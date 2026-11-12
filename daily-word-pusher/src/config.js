const path = require('path');

// Node >= 20.12 内置 .env 读取能力，省去 dotenv 依赖
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
  }
} catch (err) {
  if (err.code !== 'ENOENT') console.warn('[config] .env 读取失败：', err.message);
}

function str(name, def = '') {
  const v = process.env[name];
  return v === undefined || v === null ? def : String(v).trim();
}

function int(name, def) {
  const v = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) ? v : def;
}

const config = {
  port: int('PORT', 3000),
  dataDir: path.resolve(str('DATA_DIR', path.join(__dirname, '..', 'data'))),

  // 词库管理界面的登录密码；未配置时启动会随机生成并打印到日志
  adminPassword: str('ADMIN_PASSWORD'),

  // 飞书群自定义机器人（优先使用）
  feishuWebhook: str('FEISHU_WEBHOOK_URL'),
  feishuSecret: str('FEISHU_SECRET'),

  // 企业微信群机器人 Webhook
  wecomWebhook: str('WECOM_WEBHOOK_URL'),

  // PushPlus
  pushplusToken: str('PUSHPLUS_TOKEN'),
  pushplusBaseUrl: str('PUSHPLUS_BASE_URL', 'https://www.pushplus.plus/send'),

  // 公网访问地址，用于在推送里附带互动页链接，如 https://your-app.onrender.com
  publicBaseUrl: str('PUBLIC_BASE_URL').replace(/\/+$/, ''),

  // DeepSeek
  deepseekKey: str('DEEPSEEK_API_KEY'),
  deepseekBaseUrl: str('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
  deepseekModel: str('DEEPSEEK_MODEL', 'deepseek-chat'),

  wordsPerPush: Math.min(Math.max(int('WORDS_PER_PUSH', 5), 1), 15),
  pushCron: str('PUSH_CRON', '0 8 * * *'),
  pushTimezone: str('PUSH_TIMEZONE', 'Asia/Shanghai'),

  // 供外部定时器（GitHub Actions / cron-job.org）唤起推送使用
  cronSecret: str('CRON_SECRET'),
  schedulerEnabled: str('SCHEDULER_ENABLED', 'true') !== 'false',
};

module.exports = config;
