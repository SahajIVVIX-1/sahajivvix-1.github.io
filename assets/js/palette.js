// Search (Ctrl+K or /), laid out like the search on blog.sahaj.si: a blurred overlay with one panel, a large input with
// Clear and Esc, a status line, live results (title, meta line, highlighted excerpt) and key hints. Type any word and it
// finds every place on the page that uses it; choosing a result scrolls there smoothly and lights up the words. It also
// jumps to any section, project or link, and sends a question to the chatbot.
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
  wrap.className = 'palette sp-backdrop';
  wrap.hidden = true;
  wrap.innerHTML = `<div class="sp-panel" role="dialog" aria-modal="true" aria-label="Search this site">
    <div class="sp-input-row">
      <svg class="sp-ico" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="6.8" cy="6.8" r="4.6"/><path d="M10.2 10.2 14 14"/></svg>
      <input class="sp-input" type="text" role="combobox" aria-expanded="true" aria-controls="sp-list" aria-autocomplete="list" placeholder="Search any word, a project, a skill or a link" aria-label="Search" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      <button class="sp-clear" type="button" aria-label="Clear search" hidden>Clear</button>
      <button class="sp-esc" type="button" aria-label="Close search">Esc</button>
    </div>
    <div class="sp-status" aria-live="polite"></div>
    <ul class="sp-list" id="sp-list" role="listbox"></ul>
    <div class="sp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span><span class="sp-foot-r">Searches every word on this site, plus sections, projects and links</span></div>
  </div>`;
  document.body.append(wrap);
  const input = wrap.querySelector('.sp-input');
  const list = wrap.querySelector('.sp-list');
  const status = wrap.querySelector('.sp-status');
  const clearBtn = wrap.querySelector('.sp-clear');
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
  const SKIP = '.palette, .sp-backdrop, #ask-root, .site-head, .rail, .rail-mobile, .sr, noscript, script, style, [hidden], [aria-hidden="true"], .attn-layer, .hs-bar, .mm, .ad-plain';
  let index = [], indexAt = 0;
  // The text of a block, with a space where two separate elements meet (a number and a name, a label and its value) but
  // not between the pieces of one phrase (the word spans the attention lines add, emphasis, links).
  const PHRASE = /^(w-tok|gt)$/;
  const INLINE = new Set(['EM', 'I', 'B', 'STRONG', 'A', 'MARK', 'SUP', 'SUB', 'CODE', 'SMALL', 'ABBR', 'TIME']);
  const phrasal = (e) => !e || INLINE.has(e.tagName) || [...e.classList].some((c) => PHRASE.test(c));
  // the nearest ancestor that is a real element of its own (not a word span, emphasis or link)
  const ownerOf = (e) => { while (e && phrasal(e)) e = e.parentElement; return e; };
  function textOf(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let out = '', prev = null;
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const owner = ownerOf(n.parentElement);
      if (prev && owner !== prev && !/\s$/.test(out) && !/^\s/.test(n.data)) out += ' ';
      out += n.data;
      prev = owner;
    }
    return out.replace(/\s+/g, ' ').trim();
  }
  function buildIndex() {
    const out = [];
    for (const el of document.querySelectorAll(`main :is(${BLOCKS})`)) {
      if (el.closest(SKIP) || el.querySelector(BLOCKS)) continue;
      const text = textOf(el);
      if (text.length < 3) continue;
      const sec = el.closest('section[id]');
      const card = el.closest('.card');
      const secName = SECTION_NAMES[sec?.id] || sec?.getAttribute('aria-label') || '';
      const cardName = card?.querySelector('.card-title')?.textContent || '';
      const label = el.closest('.cb-row')?.querySelector('dt')?.textContent || '';
      out.push({ el, text, lower: text.toLowerCase(), title: cardName || secName || 'Page', meta: [cardName ? secName : '', label].filter(Boolean).join(' · '), head: /^H[1-4]$/.test(el.tagName) || el.classList.contains('card-title') });
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
  const mark = (text, toks) => {
    let out = esc(text);
    for (const t of toks.filter((x) => x.length > 1)) out = out.replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
    return out;
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

  const arrow = '<svg class="sp-go" viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  const EXAMPLES = ['quantum', 'dns', 'agents', 'kaggle', 'rag'];
  function render() {
    const q = input.value.trim();
    clearBtn.hidden = !q;
    const low = q.toLowerCase();
    const scored = items.map((it) => ({ it, s: score(q, `${it.label} ${it.hint}`) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.it);
    const pages = q ? searchPage(q) : [];
    const strong = q ? scored.filter((it) => it.label.toLowerCase().includes(low)).slice(0, 3) : [];
    const rest = scored.filter((it) => !strong.includes(it)).slice(0, q ? 4 : 12);
    shown = [...strong, ...pages, ...rest];
    if (q.length > 2) shown.push({ label: `Ask the chatbot: “${q}”`, hint: 'answers from this site', ask: q });
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    if (!q) status.innerHTML = `Jump anywhere, or type to search every word. Try ${EXAMPLES.map((w) => `<button type="button" data-ex="${w}">${w}</button>`).join(', ')}`;
    else if (!home) status.textContent = `${shown.length} result${shown.length === 1 ? '' : 's'}`;
    else status.textContent = `${pages.length.toLocaleString()} match${pages.length === 1 ? '' : 'es'} on this site${strong.length + rest.length ? ` · ${strong.length + rest.length} link${strong.length + rest.length === 1 ? '' : 's'}` : ''}`;
    const toks = tokensOf(q);
    list.innerHTML = shown.map((it, i) => {
      const on = i === sel;
      if (it.block) {
        return `<li role="option" id="sp-${i}" aria-selected="${on}" data-active="${on}" data-i="${i}" class="sp-item"><div class="sp-item-main"><span class="sp-title">${mark(it.block.title, toks)}</span>${it.block.meta ? `<span class="sp-meta">${esc(it.block.meta)}</span>` : ''}<span class="sp-exc">${snippet(it.block.text, it.toks)}</span></div>${arrow}</li>`;
      }
      return `<li role="option" id="sp-${i}" aria-selected="${on}" data-active="${on}" data-i="${i}" class="sp-item${it.ask ? ' is-ask' : ''}"><div class="sp-item-main"><span class="sp-title">${mark(it.label, toks)}</span><span class="sp-meta">${esc(it.hint)}</span></div>${arrow}</li>`;
    }).join('') + (q && !pages.length && home && q.length > 1 ? `<li class="sp-none" role="presentation">Nothing on the page matches “${esc(q)}”. Try fewer words, or ask the chatbot below.</li>` : '');
    input.setAttribute('aria-activedescendant', `sp-${sel}`);
  }
  const setActive = (i, scroll) => {
    if (i === sel || !shown.length) return;
    list.querySelector('[data-active="true"]')?.setAttribute('data-active', 'false');
    sel = i;
    const el = list.querySelector(`[data-i="${i}"]`);
    el?.setAttribute('data-active', 'true');
    list.querySelectorAll('[aria-selected="true"]').forEach((n) => n.setAttribute('aria-selected', 'false'));
    el?.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', `sp-${i}`);
    if (scroll) el?.scrollIntoView({ block: 'nearest' });
  };
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
    document.documentElement.style.overflow = 'hidden';
    input.value = ''; sel = 0; render();
    list.scrollTop = 0;
    requestAnimationFrame(() => { wrap.classList.add('is-open'); input.focus(); });
  }
  function close() {
    wrap.classList.remove('is-open');
    wrap.hidden = true;
    document.documentElement.style.overflow = '';
    opener?.focus?.();
  }

  // live: the list follows every keystroke
  input.addEventListener('input', () => { sel = 0; render(); list.scrollTop = 0; });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(shown.length - 1, sel + 1), true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, sel - 1), true); }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) run(shown[Number(li.dataset.i)]); });
  list.addEventListener('mousemove', (e) => { const li = e.target.closest('[data-i]'); if (li) setActive(Number(li.dataset.i), false); });
  status.addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { input.value = b.dataset.ex; sel = 0; render(); input.focus(); } });
  clearBtn.addEventListener('click', () => { input.value = ''; sel = 0; render(); input.focus(); });
  wrap.querySelector('.sp-esc').addEventListener('click', close);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !wrap.hidden) close(); });

  api = { open, close };
  return api;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
