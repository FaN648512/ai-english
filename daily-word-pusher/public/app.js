const state = {
  words: [],
  stats: null,
  settings: null,
  keyword: '',
  filter: 'all',
  editingId: null,
  timer: null,
};

const el = (id) => document.getElementById(id);

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    showLogin();
    throw new Error('未登录');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}

let toastTimer = null;
function toast(message, bad = false) {
  const node = el('toast');
  node.textContent = message;
  node.classList.toggle('bad', bad);
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
}

function showLogin() {
  el('app').classList.add('hidden');
  el('login').classList.remove('hidden');
}

function showApp() {
  el('login').classList.add('hidden');
  el('app').classList.remove('hidden');
}

/* ---------- 登录 ---------- */

el('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  el('loginError').textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password: el('password').value }) });
    el('password').value = '';
    showApp();
    await load();
  } catch (err) {
    el('loginError').textContent = err.message;
  }
});

el('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

/* ---------- 数据加载 ---------- */

async function load() {
  const data = await api('/api/words');
  state.words = data.words;
  state.stats = data.stats;
  state.settings = data.settings;
  renderStats();
  renderSchedule();
  renderWords();
  schedulePolling();
}

function schedulePolling() {
  clearTimeout(state.timer);
  if (state.stats && state.stats.translating > 0) {
    state.timer = setTimeout(() => load().catch(() => {}), 4000);
  }
}

function renderStats() {
  const s = state.stats;
  if (!s) return;
  const lastPush = s.lastPushAt
    ? new Date(s.lastPushAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '尚未推送';

  let meaningValue = '全部就绪';
  let meaningNote = '释义已全部生成';
  if (!state.settings || !state.settings.hasDeepSeek) {
    meaningValue = '待配置';
    meaningNote = '未配置 DEEPSEEK_API_KEY';
  } else if (s.translating > 0) {
    meaningValue = s.translating;
    meaningNote = '正在生成释义…';
  } else if (s.failed > 0) {
    meaningValue = s.failed;
    meaningNote = '生成失败待补全';
  }

  const items = [
    { k: '词库总量', v: s.total, s: `${s.pushed} 个已推送过` },
    { k: '本轮待推', v: s.pending, s: `当前第 ${s.currentRound} 轮` },
    { k: '总推送次数', v: s.totalPushes, s: lastPush },
    { k: '释义状态', v: meaningValue, s: meaningNote },
  ];
  el('stats').innerHTML = items
    .map((i) => `<div class="stat"><div class="k">${esc(i.k)}</div><div class="v">${esc(i.v)}</div><div class="s">${esc(i.s)}</div></div>`)
    .join('');
}

function renderSchedule() {
  const s = state.settings;
  if (!s) return;

  // 轮询刷新时不覆盖用户正在编辑的值
  if (document.activeElement !== el('pushTime') && el('pushTime').value) {
    if (s.pushTime) el('pushTime').value = s.pushTime;
  }
  if (document.activeElement !== el('wordsPerPushInput') && el('wordsPerPushInput').value) {
    if (s.wordsPerPush) el('wordsPerPushInput').value = s.wordsPerPush;
  }

  const next = s.nextRunAt ? new Date(s.nextRunAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' }) : '';
  el('scheduleHint').innerHTML = `${esc(s.schedule)}<br />${
    next ? `下次约 <span style="white-space:nowrap">${esc(next)}</span>` : '等待首次推送'
  }${s.hasPublicUrl ? '' : '<br />未配置公网地址：飞书卡片内可正常展开释义'}`;
  const chip = el('channelState');
  const labels = { feishu: '飞书', pushplus: 'PushPlus', wecom: '企业微信' };
  if (!s.channel) {
    chip.textContent = '未配置推送渠道';
    chip.classList.add('warn');
  } else if (!s.hasDeepSeek) {
    chip.textContent = `${labels[s.channel]} · 释义手动`;
    chip.classList.add('warn');
  } else {
    chip.textContent = `${labels[s.channel]} 已就绪`;
    chip.classList.remove('warn');
  }
}

function matches(w) {
  if (state.keyword) {
    const kw = state.keyword.toLowerCase();
    const haystack = [w.word, w.customMeaning, ...(w.entries || []).map((e) => e.zh)].join(' ').toLowerCase();
    if (!haystack.includes(kw)) return false;
  }
  if (state.filter === 'pending') return w.lastRound === 0;
  if (state.filter === 'pushed') return w.lastRound > 0;
  if (state.filter === 'untranslated') return w.translationStatus === 'pending' || w.translationStatus === 'error';
  return true;
}

function meaningsHtml(w) {
  if (w.customMeaning && w.customMeaning.trim()) {
    return w.customMeaning
      .split(/\n+/)
      .filter((l) => l.trim())
      .map((l) => `<div class="meaning-line">${esc(l.trim())}</div>`)
      .join('');
  }
  if (w.entries && w.entries.length) {
    return w.entries
      .map(
        (e) =>
          `<div class="meaning-line"><span class="pos">${esc(e.pos)}</span><span class="field">${esc(
            e.field ? `（${e.field}）` : ''
          )}</span>${esc(e.zh)}</div>`
      )
      .join('');
  }
  if (w.translationStatus === 'pending') return '<div class="meaning-line muted">释义生成中…</div>';
  if (w.translationStatus === 'error') return `<div class="meaning-line muted">释义生成失败：${esc(w.translationError || '未知错误')}</div>`;
  if (w.translationStatus === 'disabled') return '<div class="meaning-line muted">未配置 DeepSeek，可手动填写释义</div>';
  return '<div class="meaning-line muted">暂无释义，可手动填写</div>';
}

function renderWords() {
  const list = state.words.filter(matches);
  const wrap = el('wordList');
  el('emptyHint').classList.toggle('hidden', state.words.length > 0);

  if (!list.length) {
    wrap.innerHTML = state.words.length ? '<p class="empty">没有匹配的单词</p>' : '';
    return;
  }

  wrap.innerHTML = list
    .map((w) => {
      const tags = [];
      if (w.customMeaning && w.customMeaning.trim()) tags.push('<span class="tag custom">自定义释义</span>');
      tags.push(w.lastRound > 0 ? `<span class="tag round">第 ${w.lastRound} 轮</span>` : '<span class="tag state">未推送</span>');
      if (w.pushCount > 1) tags.push(`<span class="tag">累计 ${w.pushCount} 次</span>`);
      if (w.translationStatus === 'pending') tags.push('<span class="tag pending">释义生成中</span>');
      if (w.translationStatus === 'error') tags.push('<span class="tag error">释义失败</span>');

      const example = w.example
        ? `<div class="word-example"><div class="en">${esc(w.example)}</div>${w.exampleZh ? `<div>${esc(w.exampleZh)}</div>` : ''}</div>`
        : '';

      const editor =
        state.editingId === w.id
          ? `<div class="editor">
               <textarea data-edit-input="${esc(w.id)}" placeholder="填写自定义释义，每行一条；留空则恢复使用 AI 释义">${esc(w.customMeaning || '')}</textarea>
               <div class="row">
                 <button class="ghost small" data-action="cancel-edit">取消</button>
                 <button class="primary small" data-action="save-edit" data-id="${esc(w.id)}">保存</button>
               </div>
             </div>`
          : '';

      return `<div class="word-item" data-id="${esc(w.id)}">
        <div>
          <div class="word-head">
            <span class="word-name">${esc(w.word)}</span>
            ${w.phonetic ? `<span class="word-phonetic">${esc(w.phonetic)}</span>` : ''}
          </div>
          <div class="word-tags">${tags.join('')}</div>
          <div class="word-meanings">${meaningsHtml(w)}</div>
          ${example}
        </div>
        <div class="word-actions">
          <button class="secondary small" data-action="edit" data-id="${esc(w.id)}">编辑释义</button>
          <button class="ghost small" data-action="retranslate" data-id="${esc(w.id)}">重新翻译</button>
          <button class="ghost small" data-action="delete" data-id="${esc(w.id)}">删除</button>
        </div>
        ${editor}
      </div>`;
    })
    .join('');
}

/* ---------- 交互 ---------- */

el('wordList').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'edit') {
    state.editingId = id;
    renderWords();
    const input = document.querySelector(`[data-edit-input="${id}"]`);
    if (input) input.focus();
    return;
  }
  if (action === 'cancel-edit') {
    state.editingId = null;
    renderWords();
    return;
  }
  if (action === 'save-edit') {
    const input = document.querySelector(`[data-edit-input="${id}"]`);
    const value = input ? input.value : '';
    try {
      await api(`/api/words/${id}`, { method: 'PATCH', body: JSON.stringify({ customMeaning: value }) });
      state.editingId = null;
      toast(value.trim() ? '自定义释义已保存' : '已恢复为 AI 释义');
      await load();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }
  if (action === 'retranslate') {
    try {
      await api(`/api/words/${id}/translate`, { method: 'POST' });
      toast('已加入翻译队列');
      await load();
    } catch (err) {
      toast(err.message, true);
    }
    return;
  }
  if (action === 'delete') {
    const word = state.words.find((w) => w.id === id);
    if (!window.confirm(`确认删除「${word ? word.word : ''}」？`)) return;
    try {
      await api(`/api/words/${id}`, { method: 'DELETE' });
      toast('已删除');
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

el('search').addEventListener('input', (e) => {
  state.keyword = e.target.value.trim();
  renderWords();
});

el('filter').addEventListener('change', (e) => {
  state.filter = e.target.value;
  renderWords();
});

el('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  el('fileName').textContent = file.name;
  try {
    const text = await file.text();
    const input = el('wordInput');
    input.value = input.value.trim() ? `${input.value.trim()}\n${text}` : text;
  } catch (err) {
    toast('读取文件失败', true);
  }
});

el('addBtn').addEventListener('click', async () => {
  const text = el('wordInput').value;
  if (!text.trim()) return toast('请先输入或选择单词', true);
  const btn = el('addBtn');
  btn.disabled = true;
  try {
    const result = await api('/api/words', { method: 'POST', body: JSON.stringify({ text }) });
    el('wordInput').value = '';
    el('fileName').textContent = '';
    el('fileInput').value = '';
    const skipped = result.skipped ? `，跳过重复 ${result.skipped} 个` : '';
    const following = result.added
      ? state.settings && state.settings.hasDeepSeek
        ? '，正在生成释义'
        : '，请手动补充释义'
      : '';
    toast(`已添加 ${result.added} 个单词${skipped}${following}`, result.added === 0);
    await load();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

el('retryAll').addEventListener('click', async () => {
  try {
    const result = await api('/api/translate-all', { method: 'POST' });
    toast(result.count ? `已加入 ${result.count} 个单词的翻译队列` : '没有需要补全的释义');
    await load();
  } catch (err) {
    toast(err.message, true);
  }
});

el('previewBtn').addEventListener('click', async () => {
  try {
    const data = await api('/api/preview');
    if (!data.ok) return toast(data.message || '暂无可推送的单词', true);
    const body = data.words
      .map(
        (w, i) => `<div class="preview-item">
          <div class="word-head"><span class="word-name">${i + 1}. ${esc(w.word)}</span>${
          w.phonetic ? `<span class="word-phonetic">${esc(w.phonetic)}</span>` : ''
        }</div>
          <div class="word-meanings">${meaningsHtml(w)}</div>
          ${w.example ? `<div class="word-example"><div class="en">${esc(w.example)}</div>${w.exampleZh ? `<div>${esc(w.exampleZh)}</div>` : ''}</div>` : ''}
        </div>`
      )
      .join('');
    const channelLabel = { feishu: '飞书', pushplus: 'PushPlus', wecom: '企业微信' }[data.channel] || '推送';
    const unit = data.channel === 'feishu' ? '1 张卡片' : `将分成 ${data.parts.length} 条消息`;
    el('modalHint').textContent = `第 ${data.round} 轮 · ${data.words.length} 个词 · ${channelLabel} ${unit}`;
    el('modalBody').innerHTML = `<div class="modal-words">${body}</div>`;
    el('modal').classList.remove('hidden');
  } catch (err) {
    toast(err.message, true);
  }
});

el('closeModal').addEventListener('click', () => el('modal').classList.add('hidden'));
el('modal').addEventListener('click', (e) => {
  if (e.target === el('modal')) el('modal').classList.add('hidden');
});

el('saveSettings').addEventListener('click', async () => {
  const pushTime = el('pushTime').value;
  const wordsPerPush = Number(el('wordsPerPushInput').value);
  if (!pushTime) return toast('请选择推送时间', true);
  if (!Number.isInteger(wordsPerPush) || wordsPerPush < 1 || wordsPerPush > 15) {
    return toast('每次推送数量需为 1-15 的整数', true);
  }
  const btn = el('saveSettings');
  btn.disabled = true;
  try {
    const result = await api('/api/settings', { method: 'PATCH', body: JSON.stringify({ pushTime, wordsPerPush }) });
    toast(`已保存：${result.settings.schedule}，每次 ${result.settings.wordsPerPush} 个词`);
    await load();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

el('pushBtn').addEventListener('click', async () => {
  const btn = el('pushBtn');
  btn.disabled = true;
  el('pushResult').textContent = '推送中，正在补齐释义并发送…';
  try {
    const result = await api('/api/push', { method: 'POST' });
    if (result.ok) {
      const channelLabel = { feishu: '飞书', pushplus: 'PushPlus', wecom: '企业微信' }[result.channel] || '推送';
      const unit = result.channel === 'feishu' ? '1 张卡片' : `${result.parts} 条消息`;
      el('pushResult').textContent = `已通过${channelLabel}推送第 ${result.round} 轮的 ${result.count} 个单词（${unit}）`;
      toast(`推送成功：${result.words.join(', ')}`);
    } else {
      el('pushResult').textContent = result.message || '推送未执行';
      toast(result.message || '推送未执行', true);
    }
    await load();
  } catch (err) {
    el('pushResult').textContent = err.message;
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- 启动 ---------- */

(async function boot() {
  try {
    const session = await api('/api/session');
    if (!session.authed) return showLogin();
    showApp();
    await load();
  } catch (err) {
    showLogin();
  }
})();
