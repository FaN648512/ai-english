const config = require('./config');

const MAX_BYTES = 3800; // 企业微信 markdown 上限 4096 字节，留出余量

function byteLen(s) {
  return Buffer.byteLength(s, 'utf8');
}

/** 按字节上限把单词块切成多条消息，避免单条超长被拒 */
function splitBlocks(header, blocks) {
  const parts = [];
  let current = header;
  for (const block of blocks) {
    const candidate = `${current}\n\n${block}`;
    if (byteLen(candidate) > MAX_BYTES && current !== header) {
      parts.push(current);
      current = `${header}（续）\n\n${block}`;
    } else if (byteLen(candidate) > MAX_BYTES) {
      parts.push(`${header}\n\n${block.slice(0, 1000)}`);
      current = header;
    } else {
      current = candidate;
    }
  }
  if (current.trim() !== header.trim()) parts.push(current);
  return parts;
}

async function post(payload) {
  const res = await fetch(config.wecomWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    /* 非 JSON 响应，交给下面的错误处理 */
  }
  if (!res.ok || !json || json.errcode !== 0) {
    throw new Error(`企业微信推送失败：${json ? `${json.errcode} ${json.errmsg}` : text.slice(0, 200)}`);
  }
  return json;
}

async function sendMarkdown(content) {
  if (!config.wecomWebhook) throw new Error('未配置企业微信机器人 Webhook（WECOM_WEBHOOK_URL）');
  return post({ msgtype: 'markdown', markdown: { content } });
}

async function sendText(content) {
  if (!config.wecomWebhook) throw new Error('未配置企业微信机器人 Webhook（WECOM_WEBHOOK_URL）');
  return post({ msgtype: 'text', text: { content } });
}

/** 依次发送多段消息；任一段失败自动降级为纯文本重试一次 */
async function sendParts(parts) {
  for (const part of parts) {
    try {
      await sendMarkdown(part);
    } catch (err) {
      const plain = part.replace(/[#*>`]/g, '').trim();
      await sendText(plain);
    }
  }
}

module.exports = { sendMarkdown, sendText, sendParts, splitBlocks };
