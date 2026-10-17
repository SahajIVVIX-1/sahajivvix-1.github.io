// info.sahaj.si — client enhancements. The page is fully usable without this file.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

/* ---------------- theme ---------------- */
$('.theme')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const swap = () => { root.dataset.theme = next; try { localStorage.setItem('theme', next); } catch {} window.dispatchEvent(new Event('themechange')); };
  document.startViewTransition && !RM ? document.startViewTransition(swap) : swap();
});

/* ---------------- relative times ---------------- */
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (!isFinite(s)) return '';
  for (const [n, l] of [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']]) if (s >= n) return `${Math.floor(s / n)}${l} ago`;
  return 'just now';
}
$$('[data-ago]').forEach((el) => { const v = el.dataset.ago; if (v) { el.textContent = ago(v); el.title = v.slice(0, 16).replace('T', ' ') + ' UTC'; } });

/* ---------------- nav: solid on scroll, hide on scroll-down, active section, progress ---------------- */
const nav = $('#nav'), bar = $('.progress i');
let lastY = 0, ticking = false, docH = 0;
const hero = $('.hero');
// Cache document height (reading it inside the scroll handler forces a reflow every frame).
const measure = () => { docH = document.documentElement.scrollHeight - innerHeight; };
addEventListener('resize', measure, { passive: true });
addEventListener('load', measure);
function onScroll() {
  const y = scrollY, h = docH || 1;
  nav.classList.toggle('solid', y > 24);
  nav.classList.toggle('hide', y > 600 && y > lastY + 4 && !document.activeElement?.closest('.nav'));
  if (y < lastY - 4) nav.classList.remove('hide');
  lastY = y;
  bar?.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
  if (y < 1300) hero?.style.setProperty('--sy', y); // scoped to the hero: a :root var would restyle the whole DOM
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
requestAnimationFrame(onScroll); // not synchronous: reading scrollY here would force a full layout

const navLinks = $$('.nav nav a');
const spy = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  navLinks.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '/#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => spy.observe(s));

/* ---------------- reveal on scroll ---------------- */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal, .run, .attn-wrap').forEach((el) => {
  const sib = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('reveal')) : [];
  const i = sib.indexOf(el);
  if (i > 0) el.style.setProperty('--rd', `${Math.min(i, 6) * 0.08}s`);
  io.observe(el);
});

/* ---------------- hero: name as a diffusion process ----------------
   Particles sample the rendered glyphs, start as Gaussian noise and are denoised
   onto the letters with a cosine schedule (t: 1000 → 0). Hovering re-noises them. */
function diffusionName() {
  const h1 = $('#name'), cv = $('.name-canvas'), label = $('.diffusion'), tEl = $('.d-t');
  if (!h1 || !cv || RM) return;
  const ctx = cv.getContext('2d');
  let P = [], G = [], ps = 2, W = 0, H = 0, dpr = 1, t = 1, target = 0, raf = 0, visible = true, mouse = null, settled = false;

  function sample() {
    const box = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    cv.width = W * dpr; cv.height = H * dpr;
    // Particle budget scales with the device. The glyphs are rasterised at 1/step scale,
    // so each offscreen pixel is one particle and the pixel read stays tiny.
    const budget = W < 600 || (navigator.hardwareConcurrency || 8) <= 4 ? 1100 : 2400;
    const hr = h1.getBoundingClientRect();
    const step = Math.max(3, Math.ceil(Math.sqrt((hr.width * hr.height * 0.2) / budget)));
    const off = document.createElement('canvas');
    off.width = Math.ceil(W / step); off.height = Math.ceil(H / step);
    const o = off.getContext('2d', { willReadFrequently: true });
    o.scale(1 / step, 1 / step);
    const cs = getComputedStyle(root);
    $$('span', h1).forEach((sp) => {
      const r = sp.getBoundingClientRect(), st = getComputedStyle(sp);
      o.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
      o.textBaseline = 'alphabetic';
      const m = o.measureText(sp.textContent);
      // Spans are inline-block with a tight line-height, so their box is the line box:
      // baseline = top + half-leading + ascent (half-leading is negative here).
      const asc = m.fontBoundingBoxAscent ?? parseFloat(st.fontSize) * 0.9, desc = m.fontBoundingBoxDescent ?? parseFloat(st.fontSize) * 0.25;
      const x = r.left - box.left, y = r.top - box.top + (r.height - (asc + desc)) / 2 + asc;
      if (sp.classList.contains('n2')) {
        const g = o.createLinearGradient(x, 0, x + r.width, 0);
        g.addColorStop(0, cs.getPropertyValue('--g1')); g.addColorStop(0.48, cs.getPropertyValue('--g2')); g.addColorStop(1, cs.getPropertyValue('--g3'));
        o.fillStyle = g;
      } else o.fillStyle = cs.getPropertyValue('--text');
      o.fillText(sp.textContent, x, y);
    });
    const data = o.getImageData(0, 0, off.width, off.height).data;
    // Quantise colours into a few buckets so each frame changes fillStyle ~12 times, not per particle.
    const q = (v) => Math.min(255, Math.round(v / 48) * 48);
    const buckets = new Map();
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < off.height; y++) for (let x = 0; x < off.width; x++) {
      const i = (y * off.width + x) * 4;
      if (data[i + 3] < 120) continue;
      const a = data[i + 3] / 255;
      const key = `rgb(${q(data[i] / a)},${q(data[i + 1] / a)},${q(data[i + 2] / a)})`;
      const nx = gauss() * W * 0.32, ny = gauss() * H * 0.45;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ tx: x * step, ty: y * step, x: cx + nx, y: cy + ny, nx, ny, vx: 0, vy: 0 });
    }
    G = [...buckets.entries()];
    P = G.flatMap((b) => b[1]);
    ps = step * 0.62;
  }
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  let last = 0;
  function frame(now) {
    raf = 0;
    if (!visible) { last = 0; return; }
    // Time-based so every device denoises in ~1.6 s (re-noising is ~4x faster).
    const dt = last ? Math.min(250, now - last) : 16;
    last = now;
    const speed = (target < t ? 1 / 1600 : 1 / 400) * dt;
    t += Math.sign(target - t) * Math.min(speed, Math.abs(target - t));
    const s = Math.sin(t * Math.PI / 2) ** 2; // cosine noise schedule: σ(t)
    tEl.textContent = Math.round(t * 1000);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const jitter = 0.6 + s * 6;
    for (const [color, ps_] of G) {
      ctx.fillStyle = color;
      for (const p of ps_) {
        const gx = p.tx + p.nx * s, gy = p.ty + p.ny * s;
        if (mouse) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 9000) { const f = (9000 - d2) / 9000, inv = 1 / Math.sqrt(d2 + 1); p.vx += dx * inv * f * 3.2; p.vy += dy * inv * f * 3.2; }
        }
        p.vx = (p.vx + (gx - p.x) * 0.09 + (Math.random() - 0.5) * jitter * 0.3) * 0.78;
        p.vy = (p.vy + (gy - p.y) * 0.09 + (Math.random() - 0.5) * jitter * 0.3) * 0.78;
        p.x += p.vx; p.y += p.vy;
        ctx.fillRect(p.x, p.y, ps, ps);
      }
    }
    const done = Math.abs(target - t) < 1e-3 && !mouse;
    if (done && target === 1) {
      // intro reached pure noise (forward process q) — now run the reverse process p
      target = 0;
      label.querySelector('.d-label').textContent = 'denoising';
    } else if (done && target === 0) {
      // fully denoised: hand back to crisp text
      h1.classList.remove('ghost', 'dim');
      label.classList.remove('on');
      label.querySelector('.d-label').textContent = 'denoised';
      ctx.clearRect(0, 0, W, H);
      settled = true;
      last = 0;
      return;
    }
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // Intro: the real text paints first (fast LCP). Once the page is idle, particles take over
  // exactly on the glyphs, diffuse to noise (forward process) and are denoised back (reverse).
  function start() {
    sample();
    snap();
    t = 0; target = 1; settled = false;
    h1.classList.add('ghost');
    label.classList.add('on');
    label.querySelector('.d-label').textContent = 'adding noise';
    kick();
    // Failsafe: the real text must never stay hidden (e.g. a stalled frame loop).
    setTimeout(() => { if (!mouse && h1.classList.contains('ghost')) { t = 0; target = 0; kick(); setTimeout(() => h1.classList.remove('ghost'), 600); } }, 4000);
  }

  const wrap = $('.name-wrap');
  wrap.addEventListener('pointermove', (e) => {
    const b = cv.getBoundingClientRect();
    mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
    if (settled) { settled = false; h1.classList.add('dim'); h1.classList.remove('ghost'); }
    target = 0.32; label.classList.add('on'); label.querySelector('.d-label').textContent = 'adding noise';
    kick();
  });
  wrap.addEventListener('pointerleave', () => { mouse = null; target = 0; label.querySelector('.d-label').textContent = 'denoising'; kick(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(wrap);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sample(); if (settled) { t = 0; snap(); } else kick(); }, 200); });
  // Particle colours are sampled from the theme, so resample whenever it changes.
  const snap = () => P.forEach((p) => { p.x = p.tx; p.y = p.ty; p.vx = p.vy = 0; });
  addEventListener('themechange', () => requestAnimationFrame(() => { sample(); if (settled) { t = 0; snap(); } else kick(); }));
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => addEventListener('load', r, { once: true }));
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 300));
  Promise.all([document.fonts?.ready, loaded]).then(() => idle(() => setTimeout(() => requestAnimationFrame(start), 350)));
}
diffusionName();

/* ---------------- hero: tagline decoded token-by-token with visible sampling ---------------- */
function sampler() {
  const host = $('.sampler'), out = $('.s-out'), cands = $('.s-cands');
  if (!host) return;
  let lines;
  try { lines = JSON.parse(host.dataset.lines || 'null'); } catch {}
  lines = lines || [out.textContent];
  if (RM) return;
  const vocab = [...new Set(lines.join(' ').split(/\s+/))];
  const tokenize = (s) => s.match(/\s?[^\s]+/g) || [];
  let li = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function run() {
    for (;;) {
      const toks = tokenize(lines[li % lines.length]);
      out.textContent = '';
      for (const tok of toks) {
        const alts = vocab.filter((w) => w !== tok.trim()).sort(() => Math.random() - 0.5).slice(0, 2);
        const p = 0.55 + Math.random() * 0.4, q = (1 - p) * (0.55 + Math.random() * 0.3);
        const opts = [[tok.trim(), p, true], [alts[0], q], [alts[1], Math.max(0.01, 1 - p - q)]].sort(() => Math.random() - 0.5);
        cands.innerHTML = opts.map(([w, pr, k]) => `<b class="${k ? 'pick' : ''}">${w}<small>${pr.toFixed(2)}</small></b>`).join('');
        cands.style.setProperty('--cx', `${Math.min(out.offsetWidth, host.offsetWidth - 220)}px`);
        await wait(90 + Math.random() * 120);
        out.textContent += tok;
      }
      cands.innerHTML = '';
      await wait(3200);
      // backspace
      while (out.textContent.length) { out.textContent = out.textContent.slice(0, -2); await wait(14); }
      li++;
    }
  }
  setTimeout(run, 1500);
}
const later = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 200));
later(sampler);

/* ---------------- portrait: ViT-style patch attention following the cursor ---------------- */
function vit() {
  const fr = $('.portrait-frame');
  if (!fr) return;
  const cells = $$('.patches i', fr), cap = $('.p-q', fr);
  const N = 8;
  // Fixed pseudo-random "content similarity" per patch so attention isn't just distance.
  const sim = cells.map((_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1));
  function attend(qx, qy) {
    const q = qy * N + qx;
    const logits = cells.map((_, i) => { const x = i % N, y = (i / N) | 0; const d2 = (x - qx) ** 2 + (y - qy) ** 2; return -d2 / 4.5 + sim[i] * sim[q] * 2.2; });
    const m = Math.max(...logits), ex = logits.map((l) => Math.exp(l - m)), z = ex.reduce((a, b) => a + b, 0);
    cells.forEach((c, i) => c.style.setProperty('--w', ((ex[i] / z) * 9).toFixed(3)));
    cap.textContent = `query patch ${String(q).padStart(2, '0')} · softmax(QKᵀ/√d)`;
  }
  fr.addEventListener('pointermove', (e) => {
    const b = fr.getBoundingClientRect();
    const fx = (e.clientX - b.left) / b.width, fy = (e.clientY - b.top) / b.height;
    attend(Math.min(N - 1, (fx * N) | 0), Math.min(N - 1, (fy * N) | 0));
    if (!RM) { fr.style.setProperty('--ry', `${(fx - 0.5) * 8}deg`); fr.style.setProperty('--rx', `${(0.5 - fy) * 8}deg`); }
  });
  fr.addEventListener('pointerleave', () => { fr.style.setProperty('--ry', '0deg'); fr.style.setProperty('--rx', '0deg'); });
  // Touch: tap toggles the overlay.
  fr.addEventListener('click', (e) => { if (e.pointerType !== 'mouse') fr.classList.toggle('active'); });
}
later(vit);

/* ---------------- spotlight on feature cards ---------------- */
$$('.feat').forEach((el) => el.addEventListener('pointermove', (e) => {
  const b = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`);
}));
if (RM) $$('svg.pipe').forEach((s) => s.pauseAnimations?.());

/* ---------------- experience: link checkpoints ↔ role cards ---------------- */
function linkRun() {
  const set = (k, on) => $$(`[data-k="${k}"]`).forEach((el) => el.classList.toggle('on', on));
  $$('.role, .ck').forEach((el) => {
    const k = el.dataset.k;
    el.addEventListener('pointerenter', () => set(k, true));
    el.addEventListener('pointerleave', () => set(k, false));
    el.addEventListener('focus', () => set(k, true));
    el.addEventListener('blur', () => set(k, false));
  });
  $$('.ck').forEach((el) => el.addEventListener('click', () => $(`.role[data-k="${el.dataset.k}"]`)?.focus()));
}
later(linkRun);

/* ---------------- repos: grid ⇄ latent map tabs + tooltips ---------------- */
function tabs() {
  const btns = $$('.seg button');
  const show = (b) => {
    btns.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; });
  };
  btns.forEach((b, i) => {
    b.addEventListener('click', () => show(b));
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length]; show(n); n.focus(); } });
  });
  const wrap = $('.map-wrap'), tip = $('.map-tip');
  if (!wrap) return;
  $$('.pt', wrap).forEach((pt) => {
    const showTip = () => {
      const c = pt.querySelector('circle').getBoundingClientRect(), w = wrap.getBoundingClientRect();
      tip.innerHTML = `<b>${pt.dataset.name}</b>${pt.dataset.desc || ''}`;
      tip.style.left = `${c.left - w.left + c.width / 2}px`; tip.style.top = `${c.top - w.top}px`; tip.style.opacity = 1;
    };
    pt.addEventListener('pointerenter', showTip); pt.addEventListener('focus', showTip);
    pt.addEventListener('pointerleave', () => (tip.style.opacity = 0)); pt.addEventListener('blur', () => (tip.style.opacity = 0));
  });
}
later(tabs);

/* ---------------- contribution heatmap tooltip (cells are paths, so hit-test by position) ---------------- */
later(() => {
  const svg = $('.heat'), tip = $('.heat-tip');
  if (!svg) return;
  const v = svg.dataset.v.split(',').map(Number), first = +svg.dataset.first, start = new Date(svg.dataset.start);
  const vb = svg.viewBox.baseVal;
  svg.addEventListener('pointermove', (e) => {
    const b = svg.getBoundingClientRect(), sc = b.width / vb.width;
    const col = Math.floor((e.clientX - b.left) / sc / 14), row = Math.floor((e.clientY - b.top) / sc / 14);
    const i = col * 7 + row - first;
    if (i < 0 || i >= v.length || row > 6) { tip.style.opacity = 0; return; }
    const d = new Date(start.getTime() + i * 864e5);
    tip.textContent = `${v[i]} contribution${v[i] === 1 ? '' : 's'} · ${d.toISOString().slice(0, 10)}`;
    tip.style.left = `${(col * 14 + 5.5) * sc}px`; tip.style.top = `${row * 14 * sc}px`; tip.style.opacity = 1;
  });
  svg.addEventListener('pointerleave', () => (tip.style.opacity = 0));
});

/* ---------------- mail: assembled on click, never printed on the page ---------------- */
$$('[data-mail]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  location.href = `mailto:${a.dataset.mail}@${a.dataset.domain}?subject=${encodeURIComponent(a.dataset.subject || 'Hello')}`;
}));

/* ---------------- Ask: lazy-load the RAG module ---------------- */
let askMod;
const loadAsk = () => (askMod ||= import('/js/ask.js?v=' + (document.querySelector('script[src*="app.js"]')?.src.split('v=')[1] || '1')).then((m) => m.init($('[data-ask]'))));
const askEl = $('[data-ask]');
if (askEl) new IntersectionObserver(([e], o) => { if (e.isIntersecting) { loadAsk(); o.disconnect(); } }, { rootMargin: '400px' }).observe(askEl);
function openAsk(q) {
  $('#ask')?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  loadAsk().then((api) => { setTimeout(() => (q ? api.ask(q) : $('#ask-in')?.focus({ preventScroll: true })), RM ? 0 : 500); });
}
$('.ask-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const inp = $('#ask-in'), q = inp.value;
  inp.value = '';
  loadAsk().then((api) => api.ask(q));
});
// Deep links: info.sahaj.si/?q=your+question asks it on arrival.
const deepQ = new URLSearchParams(location.search).get('q');
if (deepQ) { history.replaceState(null, '', location.pathname + '#ask'); openAsk(deepQ.slice(0, 200)); }
$$('[data-open-ask]').forEach((a) => a.addEventListener('click', (e) => { if (location.pathname === '/' || location.pathname === '/index.html') { e.preventDefault(); openAsk(); } }));

/* ---------------- command palette (⌘K / Ctrl K / "/") ---------------- */
function palette() {
  const dlg = $('.kbar'), input = $('.kbar-in'), list = $('.kbar-list');
  if (!dlg) return;
  const go = (h) => () => { $(h)?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); history.replaceState(null, '', h); };
  const open = (u) => () => window.open(u, '_blank', 'noopener');
  const links = Object.fromEntries($$('.foot-links a').map((a) => [a.getAttribute('aria-label'), a.href]));
  const items = [
    ['Navigate', 'Model card', go('#about')], ['Navigate', 'Training run — experience', go('#experience')], ['Navigate', 'Selected work', go('#work')],
    ['Navigate', 'Latent map of repositories', () => { go('#work')(); $('#t-map')?.click(); }], ['Navigate', 'Skills attention map', go('#skills')],
    ['Navigate', 'Live signals', go('#activity')], ['Navigate', 'AI workflow', go('#ai')], ['Navigate', 'Credentials', go('#proof')], ['Navigate', 'Contact', go('#contact')],
    ['Actions', 'Ask my portfolio', () => openAsk()], ['Actions', 'Toggle light / dark', () => $('.theme').click()], ['Actions', 'Open résumé (PDF)', open('/resume/Sahaj_Saliya_Resume.pdf')],
    ['Actions', 'Write an email', () => $('[data-mail]').click()],
    ...Object.entries(links).map(([k, v]) => ['Profiles', `Open ${k}`, open(v)]),
  ];
  let shown = [], sel = 0, lastFocus;
  const score = (q, s) => { q = q.toLowerCase(); s = s.toLowerCase(); if (!q) return 1; if (s.includes(q)) return 2 - s.indexOf(q) / 100; let i = 0; for (const ch of s) if (ch === q[i]) i++; return i === q.length ? 0.5 : 0; };
  function render() {
    const q = input.value.trim();
    shown = items.map((it) => [it, score(q, it[1])]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    if (q) shown.push(['Ask', `Ask: “${q}”`, () => openAsk(q)]);
    sel = Math.min(sel, shown.length - 1);
    let g = '';
    list.innerHTML = shown.map((it, i) => { const head = it[0] !== g ? `<li class="grp" role="presentation">${(g = it[0])}</li>` : ''; return `${head}<li role="option" id="k${i}" data-i="${i}" aria-selected="${i === sel}">${it[1].replace(/</g, '&lt;')}${it[0] === 'Ask' ? '<kbd>↵</kbd>' : ''}</li>`; }).join('');
    input.setAttribute('aria-activedescendant', `k${sel}`);
    list.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' });
  }
  const show = () => { lastFocus = document.activeElement; dlg.hidden = false; input.value = ''; sel = 0; render(); input.focus(); };
  const hide = () => { dlg.hidden = true; lastFocus?.focus?.(); };
  const run = (i) => { const it = shown[i]; hide(); it && setTimeout(it[2], 10); };
  addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && dlg.hidden)) { e.preventDefault(); dlg.hidden ? show() : hide(); }
  });
  $('.kbar-open')?.addEventListener('click', show);
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) $('.kbar-open .kbd') && ($('.kbar-open .kbd').textContent = 'Ctrl K');
  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % shown.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; render(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') hide();
    else if (e.key === 'Tab') e.preventDefault();
  });
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) run(+li.dataset.i); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) hide(); });
}
later(palette);
