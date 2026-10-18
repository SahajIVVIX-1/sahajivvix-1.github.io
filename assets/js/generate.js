// First-visit "generation": below the hero, text is sampled token by token, numbers are drawn from a
// distribution, the portrait is denoised and bars grow, each as it scrolls into view.
// The real content is always in the HTML and in the DOM: tokens are only wrapped (opacity 0 until sampled), so the
// layout is final from the first frame and nothing shifts. Only opacity and transform change.
// Return visits, reduced motion and ?noreplay get the plain page. ?replay forces the effect again.
import { placePopup } from './popup.js';
import { setBusy } from './busy.js';

const SEEN = 'sahaj:generated';
const TEXT = [
  '.layer-tag', '.layer-title', '.contact-title', '.contact-lede', '.lead', '.about-text p', '.facts dt', '.facts dd',
  '.card-kicker', '.card-title', '.card-task', '.card-body', '.metric-label', '.card-foot',
  '.sg-name', '.sg-items li', '.role-title', '.role-org', '.role-when', '.ck-t', '.ck-d',
  '.cert-name', '.cert-by', '.gh .sg-name', '.gh-sub', '.gh-recent li', '.lang-key li', '.contact-links li',
].join(',');
const NUMBERS = '.metric-val, .gh-stats b';
const BOXES = '.card, .skill-group, .role, .eval-grid > div, .facts';
const ALT = ['the', 'a', 'of', 'to', 'in', 'and', 'for', 'with', 'is', 'on', 'that', 'by'];

const q = (sel, root = document) => [...root.querySelectorAll(sel)];
const rand = (a, b) => a + Math.random() * (b - a);

export function shouldGenerate({ reducedMotion } = {}) {
  if (reducedMotion) return false;
  const params = new URLSearchParams(location.search);
  if (params.has('replay')) return true;
  try { return !localStorage.getItem(SEEN); } catch { return false; }
}

export function initGenerate({ reducedMotion = false, lowPower = false } = {}) {
  if (!shouldGenerate({ reducedMotion })) return;
  const main = document.querySelector('main');
  if (!main || !('IntersectionObserver' in window)) return;
  if (!new URLSearchParams(location.search).has('replay')) { try { localStorage.setItem(SEEN, String(Date.now())); } catch { /* private mode: the effect simply repeats */ } }

  const root = document.documentElement;
  const hero = main.querySelector('.hero');
  const outside = (el) => !hero || !hero.contains(el);
  const inMap = (el) => el.closest('.map, [data-map]');

  // ---- prepare: wrap tokens, mark boxes (all hidden, layout untouched) ----
  const jobs = [];
  const taken = new Set();
  for (const el of q(TEXT, main)) {
    if (!outside(el) || inMap(el) || taken.has(el) || el.closest('[data-gen-done]')) continue;
    if ([...taken].some((t) => t.contains(el))) continue;
    for (const t of [...taken]) if (el.contains(t)) taken.delete(t);
    taken.add(el);
  }
  for (const el of taken) {
    if (el.matches(NUMBERS)) continue;
    const toks = wrapTokens(el);
    if (toks.length) jobs.push(textJob(el, toks, lowPower));
  }
  for (const el of q(NUMBERS, main)) if (outside(el) && !inMap(el)) jobs.push(numberJob(el));
  const portrait = main.querySelector('.portrait-frame img');
  if (portrait) jobs.push(imageJob(portrait));
  for (const el of q('.lang-bar', main)) jobs.push(barJob(el));
  for (const el of q(BOXES, main)) if (outside(el) && !inMap(el)) jobs.push(boxJob(el));
  if (!jobs.length) return;
  root.classList.add('gen');

  // ---- scheduler: one rAF loop for every running job, faster while the visitor scrolls fast ----
  const running = new Set();
  let raf = 0, last = 0, vel = 0, lastY = scrollY, lastT = performance.now(), cull = 0;
  addEventListener('scroll', () => {
    const now = performance.now();
    vel = vel * 0.6 + 0.4 * (Math.abs(scrollY - lastY) / Math.max(8, now - lastT)); // smoothed px per ms
    lastY = scrollY; lastT = now;
  }, { passive: true });
  const speed = () => {
    const decay = performance.now() - lastT > 160 ? 0 : vel;
    // normal reading scroll (about 1 px/ms) keeps the designed pace; only a fast fling speeds generation up
    return 1 + Math.min(5, Math.max(0, decay - 2.5) * 1.2) + (running.size > 6 ? 1.5 : 0);
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40; };
  function tick(now) {
    const dt = Math.min(48, now - last); last = now;
    const k = speed();
    const check = now - cull > 250;
    if (check) cull = now;
    for (const j of [...running]) {
      // catch-up: whatever has been scrolled past is simply finished
      if (check && !visible(j.el)) { j.finish(); running.delete(j); continue; }
      j.t += dt * k;
      if (j.step(j.t)) { j.finish(); running.delete(j); }
    }
    raf = running.size ? requestAnimationFrame(tick) : 0;
    if (!running.size) setBusy('gen', false);
  }
  let batchAt = 0, batchN = 0;
  function start(j) {
    if (j.started) return;
    j.started = true;
    const now = performance.now();
    if (now - batchAt > 140) { batchAt = now; batchN = 0; }
    j.t = -batchN++ * (j.stagger ?? 70); // blocks that enter together are staggered
    running.add(j);
    setBusy('gen', true);
    j.begin?.();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }

  // ---- reveal when scrolled into view, but only once the hero has finished generating ----
  const ready = new Promise((res) => {
    if (window.__heroReady) res();
    else { document.addEventListener('hero:ready', res, { once: true }); setTimeout(res, 15000); }
  });
  let go = false;
  const pending = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      const j = en.target.__gen;
      io.unobserve(en.target);
      if (go) start(j); else pending.add(j);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  for (const j of jobs) { j.el.__gen = j; io.observe(j.el); }
  ready.then(() => { go = true; for (const j of pending) if (visible(j.el)) start(j); else j.finish(); pending.clear(); });

  // Safety net: never leave anything hidden (print, a failed job, a very long idle wait).
  const reveal = () => { for (const j of jobs) { try { j.finish(); } catch { /* ignore */ } } root.classList.remove('gen'); };
  addEventListener('beforeprint', reveal);
  setTimeout(() => { for (const j of jobs) if (j.started && !running.has(j)) j.finish(); }, 4000);
  window.__generate = { jobs, reveal, running };
}

// ---------- text ----------
function wrapTokens(el) {
  const out = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest('.dist, script, style, svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    for (const piece of n.nodeValue.match(/\s+|[A-Za-z0-9]{1,5}|[^\sA-Za-z0-9]/g) || []) {
      if (/^\s+$/.test(piece)) { frag.append(piece); continue; }
      const s = document.createElement('span');
      s.className = 'gt';
      s.textContent = piece;
      out.push(s);
      frag.append(s);
    }
    n.replaceWith(frag);
  }
  return out;
}

function textJob(el, toks, lowPower) {
  const heading = el.matches('.layer-title, .contact-title');
  // headings are sampled slowly (with a peek at the distribution); long paragraphs are capped at about 1.2 s
  const per = heading ? 50 : el.matches('.layer-tag, .sg-name, .metric-label, .card-kicker') ? 28 : Math.max(8, Math.min(22, 1200 / toks.length));
  const popAt = heading && !lowPower ? [1, Math.min(toks.length - 1, Math.max(3, Math.round(toks.length * 0.6)))] : [];
  let shown = 0, newest = null, done = false;
  const job = {
    el, t: 0, started: false, stagger: heading ? 90 : 55,
    step(t) {
      const n = Math.min(toks.length, Math.max(0, Math.floor(t / per) + 1));
      while (shown < n) {
        newest?.classList.remove('gt-new');
        const s = toks[shown];
        s.classList.add('gt-on', 'gt-new');
        newest = s;
        if (popAt.includes(shown)) peek(s);
        shown++;
      }
      return shown >= toks.length;
    },
    finish() {
      if (done) return;
      done = true;
      for (const s of toks) s.classList.add('gt-on');
      newest?.classList.remove('gt-new');
      for (const d of q('.dist.gt-dist', el)) d.remove();
    },
  };
  return job;
}

// A small "what else could come next" popup over a heading token (same look as the hero's).
function peek(tok) {
  const word = tok.textContent;
  const p1 = rand(0.62, 0.9), p2 = rand(0.04, 1 - p1 - 0.03), p3 = Math.max(0.01, 1 - p1 - p2 - rand(0, 0.03));
  const alts = [...ALT].sort(() => Math.random() - 0.5).slice(0, 2);
  const rows = [[word, p1], [alts[0], p2], [alts[1], p3]];
  const d = document.createElement('div');
  d.className = 'dist gt-dist';
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = rows.map(([t, p]) => `<div class="dist-row${t === word ? ' is-pick' : ''}"><span class="dist-tok">${t.replace(/[<&]/g, '')}</span><span class="dist-bar"><i style="--p:${(p * 100).toFixed(0)}%"></i></span><span class="dist-p">${p.toFixed(2)}</span></div>`).join('');
  tok.classList.add('gt-anchor');
  tok.append(d);
  placePopup(tok, d, { order: ['below', 'above', 'right', 'left'] });
  setTimeout(() => { d.classList.add('is-out'); setTimeout(() => d.remove(), 320); }, 460);
}

// ---------- numbers ----------
function numberJob(el) {
  const final = el.textContent;
  const over = document.createElement('span');
  over.className = 'gn';
  over.setAttribute('aria-hidden', 'true');
  over.style.color = getComputedStyle(el).color;
  over.textContent = final.replace(/\d/g, '0');
  el.classList.add('gn-host');
  el.append(over);
  const DUR = 950;
  let lastDraw = -1e9;
  return {
    el, t: 0, started: false, stagger: 90,
    step(t) {
      if (t < lastDraw + 55 && t < DUR) return false;
      lastDraw = t;
      const settled = Math.floor(Math.max(0, t) / DUR * (final.length + 1));
      let s = '';
      for (let i = 0; i < final.length; i++) s += i < settled || !/\d/.test(final[i]) ? final[i] : String(Math.floor(Math.random() * 10));
      over.textContent = s;
      return t >= DUR;
    },
    finish() { over.remove(); el.classList.remove('gn-host'); },
  };
}

// ---------- image: diffusion-style denoising over the real <img> ----------
function imageJob(img) {
  const box = img.closest('.portrait-frame') || img.parentElement;
  const STEPS = 8;
  const STEP_MS = 135;
  const cv = document.createElement('canvas');
  cv.className = 'gen-cv';
  cv.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'gen-lab mono';
  label.setAttribute('aria-hidden', 'true');
  const S = 192, SH = 240; // the frame is 4:5
  cv.width = S; cv.height = SH;
  const c = cv.getContext('2d');
  const noise = document.createElement('canvas');
  noise.width = S; noise.height = SH;
  const nc = noise.getContext('2d');
  const id = nc.createImageData(S, SH);
  for (let i = 0; i < id.data.length; i += 4) { const v = 90 + Math.random() * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  nc.putImageData(id, 0, 0);
  const tiny = document.createElement('canvas');
  const blocks = [6, 9, 14, 22, 36, 60, 100, S];
  let drawn = -1, done = false;
  const draw = (step) => {
    if (step === drawn) return;
    drawn = step;
    const b = blocks[Math.min(step, STEPS - 1)];
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, S, SH);
    if (img.complete && img.naturalWidth) {
      tiny.width = b; tiny.height = Math.max(1, Math.round(b * 1.25));
      tiny.getContext('2d').drawImage(img, 0, 0, tiny.width, tiny.height);
      c.drawImage(tiny, 0, 0, S, SH);
    } else { c.fillStyle = '#888'; c.fillRect(0, 0, S, SH); }
    c.globalAlpha = Math.max(0, 0.85 * (1 - step / (STEPS - 1)) ** 1.3);
    c.drawImage(noise, Math.floor(rand(0, 60)) - 60, Math.floor(rand(0, 60)) - 60);
    c.drawImage(noise, 0, 0);
    c.globalAlpha = 1;
    label.textContent = `denoising · step ${Math.min(step + 1, STEPS)}/${STEPS}`;
  };
  box.classList.add('gen-box');
  box.append(cv, label);
  draw(0);
  return {
    el: box, t: 0, started: false, stagger: 0,
    step(t) { draw(Math.min(STEPS - 1, Math.floor(Math.max(0, t) / STEP_MS))); return t >= STEPS * STEP_MS; },
    finish() {
      if (done) return;
      done = true;
      cv.classList.add('is-out'); label.classList.add('is-out');
      setTimeout(() => { cv.remove(); label.remove(); box.classList.remove('gen-box'); window.__portraitReady = true; document.dispatchEvent(new Event('portrait:ready')); }, 420);
    },
  };
}

// ---------- bars: grow like a chart being drawn ----------
function barJob(el) {
  el.classList.add('gen-bars');
  return { el, t: 0, started: false, stagger: 0, begin() { el.classList.add('gen-on'); }, step(t) { return t > 900; }, finish() { el.classList.add('gen-on'); } };
}

// ---------- boxes (cards, groups, entries): fade up as their content starts to generate ----------
function boxJob(el) {
  el.classList.add('gbox');
  let off = 0;
  return {
    el, t: 0, started: false, stagger: 80,
    begin() { el.classList.add('gbox-on'); },
    step(t) { return t > 700; },
    finish() { el.classList.add('gbox-on'); clearTimeout(off); off = setTimeout(() => el.classList.remove('gbox', 'gbox-on'), 800); },
  };
}
