// Search palette (Ctrl+K or /): type any word and it finds every place on the page that uses it (with the sentence
// around it); choosing a result scrolls there smoothly and lights up the words. It also jumps to any section, project
// or link, and sends a question to the chatbot.
let api;
export function initPalette() {
  if (api) return api;
  const home = location.pathname === '/' || /^\/ip=/.test(location.pathname);
  const go = (hash) => (home ? hash : `/${hash}`);
  const cards = [...document.querySelectorAll('.card[id]')].map((c) => ({ label: c.querySelector('.card-title')?.textContent, hint: c.closest('#products') ? 'product' : 'project', href: `#${c.id}` }));
  // build.mjs writes the project count (one layer each) into the page, so the layer numbers below follow it.
  const np = Number(document.querySelector('meta[name="project-count"]')?.content) || 5;
  const npr = Number(document.querySelector('meta[name="product-count"]')?.content) || 0;
  const items = [
    { label: 'Home', hint: 'layer 1', href: home ? '#top' : '/' },
    { label: 'About', hint: 'layer 2', href: go('#about') },
    { label: 'Embedding map', hint: 'layer 3', href: go('#map') },
    { label: 'Projects', hint: `layers 4–${3 + np}`, href: go('#work') },
    { label: 'Products', hint: `layers ${4 + np}–${3 + np + npr}`, href: go('#products') },
    ...(home ? cards : []),
    { label: 'Skills', hint: `layer ${4 + np + npr}`, href: go('#skills') },
    { label: 'Experience', hint: `layer ${5 + np + npr}`, href: go('#experience') },
    { label: 'Certifications & GitHub', hint: `layer ${6 + np + npr}`, href: go('#certs') },
    { label: 'Contact', hint: `layer ${7 + np + npr}`, href: go('#contact') },
    { label: 'Blog', hint: 'blog.sahaj.si', href: 'https://blog.sahaj.si/' },
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
      <input class="pal-in" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" placeholder="Search anything on this site, or ask a question" autocomplete="off" enterkeyhint="search"><button class="pal-close" type="button" aria-label="Close search">Esc</button></div>
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

  // ---- full-text search over what is actually on the page ----
  const SECTION_NAMES = { top: 'Home', about: 'About', map: 'Embedding map', work: 'Projects', products: 'Products', skills: 'Skills', experience: 'Experience', certs: 'Certifications', fit: 'Recruiter mode', contact: 'Contact', adapters: 'Harvard badges', guinness: 'Guinness record' };
  const BLOCKS = 'h1, h2, h3, h4, p, li, dd, dt, td, th, figcaption, blockquote, .lead, .layer-sub, .card-task, .metric-label, .chip, .sp-k, .sp-v';
  const SKIP = '.palette, #ask-root, .site-head, .rail, .rail-mobile, .sr, noscript, script, style, [hidden], [aria-hidden="true"], .attn-layer, .hs-bar, .mm, .ad-plain';
  let index = [], indexAt = 0;
  function buildIndex() {
    const out = [];
    for (const el of document.querySelectorAll(`main :is(${BLOCKS})`)) {
      if (el.closest(SKIP) || el.querySelector(BLOCKS)) continue;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 3) continue;
      const sec = el.closest('section[id]');
      const card = el.closest('.card');
      const where = [SECTION_NAMES[sec?.id] || sec?.getAttribute('aria-label') || '', card?.querySelector('.card-title')?.textContent || ''].filter(Boolean);
      out.push({ el, text, lower: text.toLowerCase(), where: where.join(' · '), head: /^H[1-4]$/.test(el.tagName) || el.classList.contains('card-title') });
    }
    index = out; indexAt = Date.now();
  }
  const tokensOf = (q) => q.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  function searchPage(q) {
    if (!home) return [];
    const toks = tokensOf(q);
    if (!toks.length || (toks.length === 1 && toks[0].length < 2)) return [];
    if (!index.length || Date.now() - indexAt > 4000) buildIndex();
    const phrase = q.toLowerCase();
    const hits = [];
    for (const b of index) {
      let s = 0, ok = true;
      for (const t of toks) {
        const at = b.lower.indexOf(t);
        if (at < 0) { ok = false; break; }
        s += 2 + (at === 0 || /\W/.test(b.lower[at - 1]) ? 3 : 0) + (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(b.lower) ? 2 : 0);
      }
      if (!ok) continue;
      if (toks.length > 1 && b.lower.includes(phrase)) s += 8;
      if (b.head) s += 4;
      s -= Math.min(6, b.text.length / 160);
      hits.push({ b, s });
    }
    hits.sort((a, c) => c.s - a.s);
    return hits.slice(0, 40).map(({ b }) => ({ block: b, toks }));
  }
  const snippet = (text, toks) => {
    const low = text.toLowerCase();
    let at = Math.min(...toks.map((t) => low.indexOf(t)).filter((i) => i >= 0));
    if (!isFinite(at)) at = 0;
    const from = Math.max(0, at - 46), to = Math.min(text.length, at + 96);
    let out = esc(text.slice(from, to));
    for (const t of toks) out = out.replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
    return `${from > 0 ? '… ' : ''}${out}${to < text.length ? ' …' : ''}`;
  };
  // the words themselves, as ranges, so they can be lit up after the scroll
  function rangesIn(el, toks) {
    const ranges = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, low = n.data.toLowerCase();
      for (const t of toks) {
        for (let i = low.indexOf(t); i >= 0; i = low.indexOf(t, i + t.length)) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + t.length); ranges.push(r); }
      }
    }
    return ranges;
  }
  let lightTimer = 0;
  function light(el, toks) {
    clearTimeout(lightTimer);
    el.classList.remove('search-flash'); void el.offsetWidth; el.classList.add('search-flash');
    if (window.CSS?.highlights && window.Highlight) CSS.highlights.set('search-hit', new Highlight(...rangesIn(el, toks)));
    lightTimer = setTimeout(() => { el.classList.remove('search-flash'); CSS.highlights?.delete('search-hit'); }, 5000);
  }
  function goTo(hit) {
    const el = hit.block.el;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'center' });
    // light the words up once the page has stopped moving
    let done = false;
    const fin = () => { if (done) return; done = true; removeEventListener('scrollend', fin); setTimeout(() => light(el, hit.toks), 80); };
    addEventListener('scrollend', fin, { once: true });
    setTimeout(fin, reduced ? 100 : 1700);
  }

  function render() {
    const q = input.value.trim();
    const cmds = items.map((it) => ({ it, s: score(q, `${it.label} ${it.hint}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it).slice(0, q ? 5 : 8);
    const pages = q ? searchPage(q) : [];
    shown = [...cmds, ...pages.slice(0, 14)];
    if (q.length > 2) shown.push({ label: `Ask: “${q}”`, hint: 'chatbot', ask: q });
    sel = Math.min(sel, shown.length - 1);
    const head = (t) => `<li class="pal-h mono" role="presentation">${t}</li>`;
    let html = '';
    shown.forEach((it, i) => {
      if (i === 0 && !it.block) html += q ? head('Jump to') : '';
      if (it.block && !(shown[i - 1]?.block)) html += head(`On this site · ${pages.length}${pages.length > 14 ? '+' : ''} match${pages.length === 1 ? '' : 'es'}`);
      const cls = `${i === sel ? 'is-sel' : ''}${it.ask ? ' is-ask' : ''}${it.block ? ' is-hit' : ''}`;
      html += it.block
        ? `<li role="option" id="pal-${i}" aria-selected="${i === sel}" class="${cls}" data-i="${i}"><span class="pal-path mono">${esc(it.block.where || 'Page')}</span><span class="pal-snip">${snippet(it.block.text, it.toks)}</span></li>`
        : `<li role="option" id="pal-${i}" aria-selected="${i === sel}" class="${cls}" data-i="${i}"><span>${esc(it.label)}</span><span class="mono muted">${esc(it.hint)}</span></li>`;
    });
    if (q && !pages.length && home && q.length > 1) html = html.replace(/(<li class="[^"]*is-ask")/, '<li class="pal-h mono" role="presentation">Nothing on the page matches</li>$1');
    list.innerHTML = html;
    input.setAttribute('aria-activedescendant', `pal-${sel}`);
    list.querySelector('.is-sel')?.scrollIntoView({ block: 'nearest' });
  }
  function run(it) {
    close();
    if (!it) return;
    if (it.block) return goTo(it);
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
  wrap.querySelector('.pal-close').addEventListener('click', close);

  api = { open, close };
  return api;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
