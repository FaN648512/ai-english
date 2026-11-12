const crypto = require('crypto');
const config = require('./config');
const { wordHeading, meaningLines } = require('./format');

/**
 * 飞书群自定义机器人：
 * 飞书群 → 设置 → 群机器人 → 添加机器人 → 自定义机器人 → 复制 Webhook
 * 若开启「签名校验」，把密钥填到 FEISHU_SECRET。
 *
 * 卡片使用 JSON 2.0 的折叠面板：每个单词是一个面板，默认收起，
 * 点击标题即在客户端本地展开释义，不需要回调服务，也不需要公网地址。
 */

function meaningMd(word) {
  let md = meaningLines(word).join('\n');
  if (word.example) md += `\n\n<font color='grey'>${word.example}</font>`;
  if (word.exampleZh) md += `\n<font color='grey'>${word.exampleZh}</font>`;
  return md;
}

function signBody(secret) {
  if (!secret) return {};
  const timestamp = String(Math.floor(Date.now() / 1000));
  const toSign = `${timestamp}\n${secret}`;
  const sign = crypto.createHmac('sha256', toSign).update('').digest('base64');
  return { timestamp, sign };
}

function buildCard({ title, words, link }) {
  const elements = words.map((word, i) => ({
    tag: 'collapsible_panel',
    element_id: `word_${i + 1}`,
    expanded: false,
    header: {
      title: { tag: 'markdown', content: wordHeading(word, i + 1), text_size: 'heading-3' },
      vertical_align: 'center',
      icon: { tag: 'standard_icon', token: 'down-small-ccm_outlined', size: '16px 16px' },
      icon_position: 'right',
      icon_expanded_angle: -180,
      padding: '6px 10px 6px 12px',
    },
    border: { color: 'grey', corner_radius: '8px' },
    vertical_spacing: '8px',
    padding: '8px 12px 12px 12px',
    elements: [{ tag: 'markdown', content: meaningMd(word) }],
  }));

  if (link) {
    elements.push({
      tag: 'button',
      text: { tag: 'plain_text', content: '网页版 · 逐个点开' },
      type: 'default',
      url: link,
      margin: '10px 0 0 0',
    });
  }

  return {
    schema: '2.0',
    config: { update_multi: true, summary: { content: title } },
    header: { title: { tag: 'plain_text', content: title }, template: 'wathet' },
    body: { elements },
  };
}

async function sendCard(card) {
  if (!config.feishuWebhook) throw new Error('未配置飞书 Webhook（FEISHU_WEBHOOK_URL）');

  const res = await fetch(config.feishuWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...signBody(config.feishuSecret), msg_type: 'interactive', card }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {
    /* 非 JSON 响应，交给下面的错误处理 */
  }

  const code = json ? Number(json.code ?? json.StatusCode) : NaN;
  if (!res.ok || code !== 0) {
    const detail = json ? `${code} ${json.msg || json.StatusMessage || ''}` : text.slice(0, 200);
    throw new Error(`飞书推送失败：${detail}`);
  }
  return json;
}

module.exports = { buildCard, sendCard };
