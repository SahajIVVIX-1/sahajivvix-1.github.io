// Command palette (Ctrl+K or /): jump to any section, project or link, or send the text to the chatbot.
let api;
export function initPalette() {
  if (api) return api;
  const home = location.pathname === '/' || /^\/ip=/.test(location.pathname);
  const go = (hash) => (home ? hash : `/${hash}`);
  const cards = [...document.querySelectorAll('.card[id]')].map((c) => ({ label: c.querySelector('.card-title')?.textContent, hint: 'project', href: `#${c.id}` }));
  const items = [
    { label: 'Home', hint: 'layer 1', href: home ? '#top' : '/' },
    { label: 'About', hint: 'layer 2', href: go('#about') },
    { label: 'Embedding map', hint: 'layer 3', href: go('#map') },
    { label: 'Projects', hint: 'layers 4–8', href: go('#work') },
    ...(home ? cards : []),
    { label: 'Skills', hint: 'layer 9', href: go('#skills') },
    { label: 'Experience', hint: 'layer 10', href: go('#experience') },
    { label: 'Certifications & GitHub', hint: 'layer 11', href: go('#certs') },
    { label: 'Contact', hint: 'layer 12', href: go('#contact') },
    { label: 'Blog', hint: 'page', href: '/blogs/' },
    { label: 'GitHub', hint: 'SahajIVVIX-1', href: 'https://github.com/SahajIVVIX-1' },
    { label: 'LinkedIn', hint: 'sahajs59', href: 'https://www.linkedin.com/in/sahajs59/' },
    { label: 'X', hint: '@SahajS59', href: 'https://x.com/SahajS59' },
    { label: 'LeetCode', hint: 'sahajs59', href: 'https://leetcode.com/u/sahajs59/' },
    { label: 'Email Sahaj', hint: 'mailto', href: 'mailto:sahajs7959@gmail.com' },
    { label: 'Toggle theme', hint: 'temperature', action: () => document.querySelector('[data-theme-toggle]')?.click() },
    { label: window.__plain ? 'Full view' : 'Plain view', hint: window.__plain ? 'animation back on' : 'no loader, no animation', action: () => document.querySelector('[data-plain-toggle]')?.click() },
  ];

  const wrap = document.createElement('div');
  wrap.className = 'palette';
  wrap.hidden = true;
  wrap.innerHTML = `<div class="pal-box" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="pal-in-wrap"><span class="mono pal-caret" aria-hidden="true">›</span>
      <input class="pal-in" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="Jump to… or ask a question" autocomplete="off"></div>
    <ul class="pal-list" id="pal-list" role="listbox"></ul>
    <p class="pal-foot mono"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>
  </div>`;
  document.body.append(wrap);
  const input = wrap.querySelector('.pal-in');
  const list = wrap.querySelector('.pal-list');
  let sel = 0, shown = [], opener = null;

  // Subsequence match with a bonus for word starts (a tiny fuzzy ranker).
  const score = (q, s) => {
    q = q.toLowerCase(); s = s.toLowerCase();
    if (!q) return 1;
    if (s.includes(q)) return 10 - s.indexOf(q) * 0.1;
    let i = 0, sc = 0;
    for (let k = 0; k < s.length && i < q.length; k++) if (s[k] === q[i]) { sc += k === 0 || s[k - 1] === ' ' ? 2 : 1; i++; }
    return i === q.length ? sc / s.length : 0;
  };

  function render() {
    const q = input.value.trim();
    shown = items.map((it) => ({ it, s: score(q, `${it.label} ${it.hint}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it).slice(0, 8);
    if (q.length > 2) shown.push({ label: `Ask: “${q}”`, hint: 'chatbot', ask: q });
    sel = Math.min(sel, shown.length - 1);
    list.innerHTML = shown.map((it, i) => `<li role="option" id="pal-${i}" aria-selected="${i === sel}" class="${i === sel ? 'is-sel' : ''}${it.ask ? ' is-ask' : ''}" data-i="${i}"><span>${esc(it.label)}</span><span class="mono muted">${esc(it.hint)}</span></li>`).join('');
    input.setAttribute('aria-activedescendant', `pal-${sel}`);
  }
  function run(it) {
    close();
    if (!it) return;
    if (it.ask) return window.__ask(it.ask);
    if (it.action) return it.action();
    if (it.href.startsWith('http')) return window.open(it.href, '_blank', 'noopener');
    location.href = it.href;
  }
  function open() {
    opener = document.activeElement;
    wrap.hidden = false;
    input.value = ''; sel = 0; render();
    requestAnimationFrame(() => { wrap.classList.add('is-open'); input.focus(); });
  }
  function close() { wrap.classList.remove('is-open'); wrap.hidden = true; opener?.focus?.(); }

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % shown.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) run(shown[Number(li.dataset.i)]); });
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });

  api = { open, close };
  return api;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
