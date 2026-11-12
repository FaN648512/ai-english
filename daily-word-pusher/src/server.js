const path = require('path');
const crypto = require('crypto');
const express = require('express');

const config = require('./config');
const store = require('./store');
const translate = require('./translate');
const push = require('./push');
const scheduler = require('./scheduler');

if (!config.adminPassword) {
  config.adminPassword = crypto.randomBytes(6).toString('base64url');
  console.warn('='.repeat(64));
  console.warn('[安全] 未设置 ADMIN_PASSWORD，本次启动使用随机密码：');
  console.warn(`       ${config.adminPassword}`);
  console.warn('       请在环境变量中设置固定密码，避免重启后变化。');
  console.warn('='.repeat(64));
}

const SESSION_COOKIE = 'dw_session';
const SESSION_VALUE = crypto.createHmac('sha256', config.adminPassword).update('daily-word-session-v1').digest('hex');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function isAuthed(req) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(SESSION_VALUE);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: '未登录', code: 'UNAUTHORIZED' });
}

const loginAttempts = new Map();
function throttleLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, until: 0 };
  if (record.until > now) return Math.ceil((record.until - now) / 1000);
  if (record.until && record.until <= now) {
    loginAttempts.delete(ip);
    return 0;
  }
  return 0;
}
function recordFailure(ip) {
  const record = loginAttempts.get(ip) || { count: 0, until: 0 };
  record.count += 1;
  if (record.count >= 5) record.until = Date.now() + 5 * 60 * 1000;
  loginAttempts.set(ip, record);
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 互动学习页：凭推送里的随机 token 访问，无需登录
app.get('/api/daily/:token', (req, res) => {
  const item = store.getDailyByToken(req.params.token);
  if (!item) return res.status(404).json({ error: '链接已失效' });
  const settings = store.effectiveSettings();
  return res.json({
    date: item.date,
    round: item.round,
    pushedAt: item.pushedAt,
    wordsPerPush: settings.wordsPerPush,
    words: item.words.map((w) => ({
      word: w.word,
      phonetic: w.phonetic,
      entries: w.entries || [],
      customMeaning: w.customMeaning || '',
      example: w.example || '',
      exampleZh: w.exampleZh || '',
    })),
  });
});

app.get('/d/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'daily.html'));
});

app.post('/api/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const wait = throttleLogin(ip);
  if (wait) return res.status(429).json({ error: `尝试次数过多，请 ${wait} 秒后再试` });

  const password = String(req.body?.password || '');
  if (!password || password !== config.adminPassword) {
    recordFailure(ip);
    return res.status(401).json({ error: '密码错误' });
  }
  loginAttempts.delete(ip);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${SESSION_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${req.secure ? '; Secure' : ''}`
  );
  return res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  return res.json({ authed: isAuthed(req) });
});

app.get('/api/words', requireAuth, (req, res) => {
  const stats = store.stats();
  const effective = store.effectiveSettings();
  const words = store.listWords().map((w) => ({
    id: w.id,
    word: w.word,
    phonetic: w.phonetic,
    entries: w.entries,
    customMeaning: w.customMeaning,
    example: w.example,
    exampleZh: w.exampleZh,
    translationStatus: w.translationStatus,
    translationError: w.translationError,
    pushCount: w.pushCount,
    lastRound: w.lastRound,
    createdAt: w.createdAt,
  }));

  res.json({
    words,
    stats,
    settings: {
      wordsPerPush: effective.wordsPerPush,
      pushTime: scheduler.cronToTime(effective.pushCron),
      schedule: scheduler.describeCron(effective.pushCron, config.pushTimezone),
      nextRunAt: scheduler.nextRunAt(),
      channel: config.feishuWebhook ? 'feishu' : config.pushplusToken ? 'pushplus' : config.wecomWebhook ? 'wecom' : null,
      hasFeishu: Boolean(config.feishuWebhook),
      hasWecom: Boolean(config.wecomWebhook),
      hasPushplus: Boolean(config.pushplusToken),
      hasPublicUrl: Boolean(config.publicBaseUrl),
      hasDeepSeek: Boolean(config.deepseekKey),
    },
  });
});

app.patch('/api/settings', requireAuth, (req, res) => {
  try {
    const effective = store.updateSettings({
      wordsPerPush: req.body?.wordsPerPush,
      pushTime: req.body?.pushTime,
    });
    scheduler.reschedule();
    return res.json({
      ok: true,
      settings: {
        wordsPerPush: effective.wordsPerPush,
        pushTime: scheduler.cronToTime(effective.pushCron),
        schedule: scheduler.describeCron(effective.pushCron, config.pushTimezone),
        nextRunAt: scheduler.nextRunAt(),
      },
    });
  } catch (err) {
    if (err instanceof RangeError) return res.status(400).json({ error: err.message });
    throw err;
  }
});

app.post('/api/words', requireAuth, (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const rawList = Array.isArray(req.body?.words) ? req.body.words : [];
  const input = text || rawList;
  if (!input || (typeof input === 'string' && !input.trim()) || (Array.isArray(input) && !input.length)) {
    return res.status(400).json({ error: '请提供要添加的单词' });
  }

  const { added, skipped } = store.addWords(input);
  const pendingIds = added.filter((w) => w.translationStatus === 'pending').map((w) => w.id);
  if (pendingIds.length) translate.schedule(pendingIds);

  return res.json({ ok: true, added: added.length, skipped: skipped.length, skippedWords: skipped, ids: added.map((w) => w.id) });
});

app.patch('/api/words/:id', requireAuth, (req, res) => {
  const customMeaning = typeof req.body?.customMeaning === 'string' ? req.body.customMeaning.slice(0, 2000) : undefined;
  if (customMeaning === undefined) return res.status(400).json({ error: '缺少 customMeaning 字段' });

  const updated = store.updateWord(req.params.id, { customMeaning: customMeaning.trim() });
  if (!updated) return res.status(404).json({ error: '单词不存在' });
  return res.json({ ok: true });
});

app.delete('/api/words/:id', requireAuth, (req, res) => {
  const removed = store.removeWord(req.params.id);
  if (!removed) return res.status(404).json({ error: '单词不存在' });
  return res.json({ ok: true });
});

app.post('/api/words/:id/translate', requireAuth, (req, res) => {
  const word = store.getWord(req.params.id);
  if (!word) return res.status(404).json({ error: '单词不存在' });
  if (!config.deepseekKey) return res.status(400).json({ error: '未配置 DeepSeek API Key，无法自动生成释义' });
  translate.schedule([word.id]);
  return res.json({ ok: true });
});

app.post('/api/translate-all', requireAuth, (req, res) => {
  if (!config.deepseekKey) return res.status(400).json({ error: '未配置 DeepSeek API Key，无法自动生成释义' });
  const ids = store.allPendingTranslationIds();
  translate.schedule(ids);
  return res.json({ ok: true, count: ids.length });
});

app.get('/api/preview', requireAuth, wrap(async (req, res) => {
  const payload = await push.previewPayload();
  return res.json(payload);
}));

app.post('/api/push', requireAuth, wrap(async (req, res) => {
  if (!config.feishuWebhook && !config.pushplusToken && !config.wecomWebhook) {
    return res.status(400).json({ ok: false, error: '未配置推送渠道：请设置 FEISHU_WEBHOOK_URL、PUSHPLUS_TOKEN 或 WECOM_WEBHOOK_URL' });
  }
  try {
    const result = await push.runPush({ auto: false });
    return res.json(result);
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err.message || err) });
  }
}));

app.post('/api/cron/push', wrap(async (req, res) => {
  if (!config.cronSecret) return res.status(403).json({ error: '未配置 CRON_SECRET' });
  const provided = String(req.headers['x-cron-secret'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(config.cronSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: '密钥不正确' });
  }
  try {
    const result = await push.runPush({ auto: true });
    return res.json(result);
  } catch (err) {
    return res.status(502).json({ ok: false, error: String(err.message || err) });
  }
}));

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

app.use((err, req, res, next) => {
  console.error('[server] 未处理异常：', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: '服务器内部错误' });
});

app.listen(config.port, () => {
  console.log(`[server] 服务已启动：http://localhost:${config.port}`);
  console.log(`[server] 数据目录：${config.dataDir}`);
  console.log(
    `[server] 推送渠道：${
      config.feishuWebhook ? '飞书' : config.pushplusToken ? 'PushPlus' : config.wecomWebhook ? '企业微信' : '未配置'
    }；DeepSeek：${config.deepseekKey ? '已配置' : '未配置'}`
  );
  scheduler.start();
});
