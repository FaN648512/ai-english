const config = require('./config');

// PushPlus 正文上限约 2000 字符，留出余量
const MAX_CHARS = 1800;

function hardSplit(text) {
  const out = [];
  for (let i = 0; i < text.length; i += MAX_CHARS) out.push(text.slice(i, i + MAX_CHARS));
  return out;
}

/** 按字符上限把单词块拼成多条消息 */
function splitBlocks(blocks) {
  const parts = [];
  let current = '';
  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }
    const candidate = `${current}\n\n${block}`;
    if (candidate.length > MAX_CHARS) {
      parts.push(current);
      current = block;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts.flatMap((p) => (p.length <= MAX_CHARS ? [p] : hardSplit(p)));
}

async function send({ title, content }) {
  if (!config.pushplusToken) throw new Error('未配置 PushPlus Token（PUSHPLUS_TOKEN）');

  const res = await fetch(config.pushplusBaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: config.pushplusToken,
      title,
      content,
      template: 'markdown',
    }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    /* 非 JSON 响应，交给下面的错误处理 */
  }
  if (!res.ok || !json || Number(json.code) !== 200) {
    throw new Error(`PushPlus 推送失败：${json ? `${json.code} ${json.msg || ''}` : text.slice(0, 200)}`);
  }
  return json;
}

async function sendParts(parts, title) {
  for (let i = 0; i < parts.length; i += 1) {
    const suffix = parts.length > 1 ? `（${i + 1}/${parts.length}）` : '';
    await send({ title: `${title}${suffix}`, content: parts[i] });
  }
}

module.exports = { splitBlocks, send, sendParts, MAX_CHARS };
