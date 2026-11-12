const token = location.pathname.split('/').filter(Boolean).pop();

function esc(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function formatDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return '今天';
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m} 月 ${d} 日 · ${week}`;
}

const POS_RE = /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|phr\.|abbr\.)\s*/i;

/** 领域标签放到行尾：`n.（编程）主函数` → `n. 主函数（编程）` */
function moveFieldToEnd(line) {
  const matched = line.match(/^([a-zA-Z]+\.)\s*（([^）]+)）\s*(.*)$/);
  if (!matched) return line;
  const [, pos, field, rest] = matched;
  return rest ? `${pos} ${rest}（${field}）` : `${pos}（${field}）`;
}

/** 拆成「词性 + 加粗译名 + 解释」，与 Feishu 卡片的排版保持一致 */
function splitMeaning(line) {
  const posMatch = line.match(POS_RE) || [''];
  const body = line.slice(posMatch[0].length);
  const cut = body.search(/[，,；;、。（(]/);
  return {
    pos: posMatch[0].trim(),
    lead: cut < 0 ? body : body.slice(0, cut).trim(),
    rest: cut < 0 ? '' : body.slice(cut),
  };
}

function meaningLines(word) {
  const raw = (word.customMeaning || '').trim();
  if (raw) {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => splitMeaning(moveFieldToEnd(line)));
  }
  if (Array.isArray(word.entries) && word.entries.length) {
    return word.entries.map((e) => ({
      pos: [e.pos, e.domain ? `（${e.domain}）` : ''].join('') || '',
      lead: '',
      rest: e.meaning || '',
    }));
  }
  return [];
}

function card(word, index) {
  const meanings = meaningLines(word);
  const posClass = (pos) => (pos ? `<span class="pos">${esc(pos)}</span>` : '');
  const list = meanings.length
    ? `<ul class="meanings">${meanings
        .map((m) => `<li>${posClass(m.pos)}${m.lead ? `<strong>${esc(m.lead)}</strong>` : ''}<span>${esc(m.rest)}</span></li>`)
        .join('')}</ul>`
    : '<p class="missing">释义暂缺，可在管理页补充</p>';

  const example = word.example
    ? `<p class="example"><b>${esc(word.example)}</b>${word.exampleZh ? `<br />${esc(word.exampleZh)}` : ''}</p>`
    : '';

  return `
    <button class="card" type="button" style="--i:${index}" aria-expanded="false" data-index="${index}">
      <div class="row">
        <div>
          <span class="index">${String(index + 1).padStart(2, '0')}</span>
          <h2 class="word">${esc(word.word)}</h2>
          ${word.phonetic ? `<p class="phonetic">${esc(word.phonetic)}</p>` : ''}
        </div>
        <span class="toggle" aria-hidden="true">+</span>
      </div>
      <div class="reveal">
        <div class="reveal-inner">${list}${example}</div>
      </div>
      <p class="tap">轻点查看释义</p>
    </button>`;
}

function bind(cards) {
  const total = cards.length;
  const bar = document.getElementById('bar');
  const count = document.getElementById('count');
  let opened = 0;

  function update() {
    bar.style.width = `${(opened / total) * 100}%`;
    count.textContent = opened === 0 ? `共 ${total} 个词 · 点击卡片翻开` : `已翻开 ${opened} / ${total}`;
  }

  cards.forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const open = cardEl.classList.toggle('open');
      cardEl.setAttribute('aria-expanded', String(open));
      opened += open ? 1 : -1;
      update();
    });
  });

  update();
}

async function init() {
  try {
    const res = await fetch(`/api/daily/${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();

    document.title = `${data.words.length} 个单词 · ${formatDate(data.date)}`;
    document.getElementById('date').textContent = formatDate(data.date);
    document.getElementById('meta').textContent = `第 ${data.round} 轮 · ${data.words.length} 个词`;

    const container = document.getElementById('cards');
    container.innerHTML = data.words.map(card).join('');
    bind(Array.from(container.querySelectorAll('.card')));
  } catch (err) {
    document.querySelector('.wrap').hidden = true;
    document.getElementById('empty').hidden = false;
  }
}

init();
