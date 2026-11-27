// Neuron: the orange output neuron that lands on the logo at the end of the loading screen, alive on the page.
//
// Once the hero has finished generating it hops out of the logo and lives on the text: it walks along the top of
// lines, hops from line to line, perches at the end of short lines (phones), rides the layer rail on a fast scroll
// (or floats under the header on a phone), and falls asleep after a while with nothing happening. Now and then it
// lifts a word overhead, "samples" a replacement with the same probability popup as the hero, shows it, and puts the
// original back. Its eyes follow the mouse, it wears glasses while the Lens is on, and the temperature switch sets
// its mood (τ 0.2 calm, τ 0.9 lively). A click opens a small menu: ask the chatbot, play with a word, or nap.
//
// It is decoration: hidden from screen readers and never in the tab order (everything it offers is also elsewhere).
// Off with reduced motion and plain view; "nap" is remembered on this device and the palette wakes it again.
// Cost: one small absolutely positioned element; animation frames only while it moves; the text it reads is limited
// to the blocks near the screen (an IntersectionObserver keeps that set).
import { headerBottom, placePopup } from './popup.js';
import { ACTS, REACT, EMOTES } from './neuron-acts.js';

const KEY = 'neuron';
const HUE_KEY = 'neuron-hue'; // its colour, kept across reloads like the nap (fresh.js)
// colours it can take; each has a darker shade on the light theme and a brighter one on the dark theme (main.css)
export const HUES = ['ember', 'leaf', 'gold', 'sky', 'violet', 'rose', 'mint'];
const CANDIDATES = 'main h1, main h2, main h3, main p, main li, main dd, main blockquote, .site-foot p';
const SKIP = '.nr, .nr-word, .dist, .sr, .sr-only, [aria-hidden="true"], [hidden], .stack, .card-chips, .focus-chips, .hs-bar, .map, [data-map], .palette, #ask-root, .persona-menu, .ad-plain, .heat, .ctx-tip, .rsa-pane, .rsa-tabs, .rsa-foot, .pc-lines, .pc-role, .pc-status'; // on the console it stands only on its top line; on the photo card only on the name
const SLEEP_AFTER = 20000; // ms without any input
const FAST = 2.2; // px per ms: a fling, not reading

// Words it may lift, with what it "samples" instead. Only words that appear on the page matter.
const VOCAB = {
  build: ['make', 'craft', 'ship'], builds: ['makes', 'crafts', 'ships'], built: ['made', 'crafted', 'shipped'],
  reads: ['parses', 'skims', 'scans'], sees: ['spots', 'notices', 'views'], acts: ['moves', 'decides', 'does'],
  model: ['network', 'system', 'predictor'], models: ['networks', 'systems', 'learners'],
  data: ['inputs', 'samples', 'records'], agent: ['bot', 'worker', 'helper'], agents: ['bots', 'workers', 'helpers'],
  learned: ['absorbed', 'studied', 'picked up'], learns: ['absorbs', 'studies', 'picks up'], learn: ['absorb', 'study', 'pick up'],
  small: ['tiny', 'compact', 'little'], fast: ['quick', 'rapid', 'swift'], real: ['actual', 'genuine', 'true'],
  every: ['each', 'all', 'any'], project: ['build', 'experiment', 'piece'], projects: ['builds', 'experiments', 'pieces'],
  runs: ['executes', 'works', 'operates'], finds: ['detects', 'spots', 'locates'], honest: ['candid', 'frank', 'open'],
  ordinary: ['regular', 'plain', 'everyday'], exact: ['precise', 'strict', 'exact-ish'], simple: ['plain', 'easy', 'clean'],
  clean: ['tidy', 'neat', 'clear'], best: ['top', 'finest', 'strongest'], new: ['fresh', 'novel', 'recent'],
  short: ['brief', 'compact', 'quick'], large: ['big', 'huge', 'vast'], problem: ['puzzle', 'challenge', 'question'],
  approach: ['method', 'plan', 'recipe'], limits: ['caveats', 'edges', 'gaps'], tested: ['checked', 'verified', 'probed'],
  trained: ['taught', 'fitted', 'tuned'], scores: ['grades', 'rates', 'ranks'], page: ['site', 'screen', 'canvas'],
  text: ['words', 'prose', 'tokens'], words: ['tokens', 'terms', 'phrases'], engineer: ['builder', 'maker', 'tinkerer'],
  student: ['learner', 'scholar', 'trainee'], working: ['focusing', 'building', 'tinkering'], visitor: ['reader', 'guest', 'human'],
  curious: ['inquisitive', 'eager', 'nosy'], research: ['study', 'inquiry', 'exploration'], world: ['planet', 'globe', 'earth'],
  quick: ['fast', 'swift', 'rapid'], careful: ['cautious', 'precise', 'thorough'], open: ['public', 'shared', 'visible'],
  things: ['ideas', 'lessons', 'skills'], heads: ['minds', 'units', 'experts'], eight: ['several', 'many', 'some'],
  work: ['craft', 'output', 'labour'], tools: ['gadgets', 'utilities', 'helpers'], private: ['hidden', 'closed', 'secret'],
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const caseLike = (w, like) => (like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w);

const SVG = `<svg class="nr-svg" viewBox="0 0 26 30" aria-hidden="true" focusable="false">
  <g class="nr-legs"><line class="nr-leg nr-leg-a" x1="10.2" y1="22.5" x2="9.2" y2="29.2"/><line class="nr-leg nr-leg-b" x1="15.8" y1="22.5" x2="16.8" y2="29.2"/></g>
  <g class="nr-core">
    <path class="nr-axon" d="M18.6 9.6C21.6 6.6 22.2 3.8 20.3 1.6"/><circle class="nr-tip" cx="20.3" cy="1.7" r="1.35"/>
    <g class="nr-arms"><line x1="5.6" y1="14" x2="2.6" y2="7.6"/><line x1="20.4" y1="14" x2="23.4" y2="7.6"/></g>
    <circle class="nr-body" cx="13" cy="15.4" r="8.6"/>
    <circle class="nr-shine" cx="9.9" cy="11.9" r="2.5"/>
    <g class="nr-eyes"><ellipse class="nr-eye" cx="10.3" cy="15.1" rx="2.25" ry="2.65"/><ellipse class="nr-eye" cx="16.1" cy="15.1" rx="2.25" ry="2.65"/><circle class="nr-pupil" cx="10.5" cy="15.4" r="1.15"/><circle class="nr-pupil" cx="16.3" cy="15.4" r="1.15"/></g>
    <g class="nr-lids"><path d="M8.2 15.4q2.1 1.7 4.2 0"/><path d="M14 15.4q2.1 1.7 4.2 0"/></g>
    <g class="nr-glass"><circle cx="10.3" cy="15.1" r="2.95"/><circle cx="16.1" cy="15.1" r="2.95"/><line x1="13.2" y1="14.6" x2="13.2" y2="14.6"/></g>
  </g>
</svg>`;

// Wakes it (after a nap) or sends it to nap. Used by the command palette and the "wake neuron" button.
export function toggleNeuron() {
  if (window.__neuron?.alive) { window.__neuron.nap(); return false; }
  try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
  document.querySelector('.nr-wake')?.remove();
  initNeuron({ force: true });
  return true;
}

// While it naps, a small button bottom-left brings it back (a real, focusable button: the bot itself is decorative).
export function wakeButton() {
  if (document.querySelector('.nr-wake') || window.__plain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nr-wake mono';
  try { const h = localStorage.getItem(HUE_KEY); if (HUES.includes(h)) b.dataset.hue = h; } catch { /* storage blocked */ }
  b.innerHTML = '<svg viewBox="0 0 26 26" width="18" height="18" aria-hidden="true" focusable="false"><circle class="nw-body" cx="13" cy="14" r="9"/><path class="nw-lid" d="M8.1 14q2.1 1.7 4.2 0M13.7 14q2.1 1.7 4.2 0"/></svg><span>wake neuron</span>';
  b.setAttribute('aria-label', 'Wake Neuron, the little bot (it is napping)');
  b.addEventListener('click', () => toggleNeuron());
  document.body.append(b);
}

export function initNeuron({ lowPower = false, force = false } = {}) {
  if (window.__neuron?.alive) return window.__neuron;
  if (window.__plain || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  if (!force) { try { if (localStorage.getItem(KEY) === 'off') return null; } catch { /* storage blocked */ } }

  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const passive = { passive: true, signal: ac.signal };
  const observers = [];
  let alive = true;

  // ---- the element ----
  const el = document.createElement('div');
  el.className = 'nr';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="nr-sq">${SVG}</div><span class="nr-z"><i>z</i><i>z</i><i>Z</i></span><span class="nr-say" hidden></span>
    <div class="nr-menu" hidden><p class="nr-menu-h">neuron · τ <b data-nr-tau></b></p><button type="button" tabindex="-1" data-nr="ask">Ask about Sahaj</button><button type="button" tabindex="-1" data-nr="word">Play with a word</button><button type="button" tabindex="-1" data-nr="act">Surprise me</button><button type="button" tabindex="-1" data-nr="hue">Change colour</button><button type="button" tabindex="-1" data-nr="nap">Nap (hide me)</button></div>`;
  document.body.append(el);
  let hue = 'ember';
  try { const h = localStorage.getItem(HUE_KEY); if (HUES.includes(h)) hue = h; } catch { /* storage blocked */ }
  const setHue = (h, save = false) => { el.dataset.hue = h; if (save) { hue = h; try { localStorage.setItem(HUE_KEY, h); } catch { /* storage blocked */ } } };
  setHue(hue);
  const sq = el.querySelector('.nr-sq');
  const menu = el.querySelector('.nr-menu');

  let S = 1, hw = 13, H = 30;
  const sizes = () => { S = innerWidth < 700 ? 0.95 : innerWidth < 1100 ? 1.1 : 1.25; hw = 13 * S; H = 30 * S; el.style.setProperty('--nr-s', String(S)); };
  sizes();
  const railPad = () => (innerWidth >= 1100 ? 64 : 0);

  const themeBtn = document.querySelector('[data-theme-toggle]');
  const tau = () => ({ light: 0.2, dark: 0.9 })[themeBtn?.dataset.themeState] ?? 0.55;

  // ---- state ----
  const pos = { x: 0, y: 0 }; // document coordinates of the feet
  let face = 1;
  let mode = 'idle'; // idle | stand | walk | hop | trick | sleep | ride | float | home
  let pose = '';
  let anc = null; // { el, kind: 'top' | 'end', ox, oy, rx1, rx2 } offsets from the element's box
  let anim = null, raf = 0, actT = 0, glideT = 0;
  let lastInput = performance.now(), lastTrick = performance.now() - 12000;
  let menuOpen = false;
  let trickState = null;
  let floatNap = false; // asleep while floating under the header
  let performing = false; // running something from the repertoire (neuron-acts.js)
  let lastSay = 0;
  const born = performance.now();
  const recent = new Map(); // act id -> when it last ran
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const setPose = (p) => { if (p === pose) return; if (pose) el.classList.remove(`nr--${pose}`); pose = p; if (p) el.classList.add(`nr--${p}`); };
  const restPose = () => setPose(anc?.kind === 'end' ? 'sit' : 'stand');
  const applyFace = () => el.style.setProperty('--face', String(face));
  const render = () => {
    pos.x = clamp(pos.x, 4 + hw, document.documentElement.clientWidth - 4 - hw - railPad() * (mode === 'ride' ? 0 : 1));
    el.style.transform = `translate3d(${(pos.x - hw).toFixed(1)}px,${(pos.y - H).toFixed(1)}px,0)`;
  };
  const at = (a) => {
    const r = a.el.getBoundingClientRect();
    return { x: r.left + a.ox + scrollX, y: r.top + a.oy + scrollY, vy: r.top + a.oy };
  };
  const visible = (p) => p.vy > headerBottom() + 4 && p.vy - H < innerHeight - 2;
  const stale = (a) => !a.el.isConnected || !!a.el.closest('.hs--on .card:not(.is-active)') || a.el.getClientRects().length === 0;
  const bounce = (h = 6) => sq.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-h}px)` }, { transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.3,.7,.4,1)' });
  const squash = () => sq.animate([{ transform: 'scale(1.18,.8)' }, { transform: 'scale(1,1)' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });

  // ---- reading the page: the lines it can stand on ----
  const seen = new Set();
  const io = new IntersectionObserver((es) => { for (const e of es) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); } }, { rootMargin: '200px 0px' });
  for (const e of document.querySelectorAll(CANDIDATES)) if (!e.closest(SKIP)) io.observe(e);
  observers.push(io);

  function lineBoxes(e) {
    const range = document.createRange();
    range.selectNodeContents(e);
    const rs = [...range.getClientRects()].filter((q) => q.width > 1 && q.height > 5);
    if (!rs.length) return null;
    let t0 = Infinity, b1 = -Infinity, hMin = Infinity;
    for (const q of rs) { t0 = Math.min(t0, q.top); b1 = Math.max(b1, q.bottom); hMin = Math.min(hMin, q.height); }
    const first = rs.filter((q) => q.top < t0 + hMin * 0.6);
    const last = rs.filter((q) => q.bottom > b1 - hMin * 0.6);
    return {
      top: t0, x1: Math.min(...first.map((q) => q.left)), x2: Math.max(...first.map((q) => q.right)),
      lastRight: Math.max(...last.map((q) => q.right)), bottom: b1, lastH: Math.max(...last.map((q) => q.height)), oneLine: b1 - t0 < hMin * 1.7,
    };
  }

  function platforms() {
    const top = headerBottom() + 34, bot = innerHeight - 28, right = document.documentElement.clientWidth - 10 - hw - railPad();
    const out = [];
    for (const e of seen) {
      if (e.closest('.hs--on .card:not(.is-active)') || e.closest('[data-gen]:not(.is-done)') || e.querySelector('.gt:not(.gt-on)')) continue;
      const r = e.getBoundingClientRect();
      if (r.bottom < top || r.top > bot || r.right < 40 || r.left > right) continue;
      const L = lineBoxes(e);
      if (!L) continue;
      const fs = parseFloat(getComputedStyle(e).fontSize) || 16;
      const x1 = Math.max(L.x1 + hw * 0.6, 10 + hw), x2 = Math.min(L.x2 - hw * 0.6, right);
      if (L.top > top && L.top < bot && x2 - x1 > 16) out.push({ el: e, kind: 'top', vy: L.top, vx1: x1, vx2: x2, oy: L.top - r.top, rx1: x1 - r.left, rx2: x2 - r.left, fs });
      // the end of a one-line block: it sits there, beside the last word
      const ex = L.lastRight + 3 + hw;
      const ey = L.bottom - L.lastH * 0.16;
      if (L.oneLine && ex < right && ey > top && ey < bot) out.push({ el: e, kind: 'end', vy: ey, vx1: ex, vx2: ex, oy: ey - r.top, rx1: ex - r.left, rx2: ex - r.left, fs });
    }
    return out;
  }

  // a weighted pick: near lines first, big headings and (on a phone) line ends favoured
  function choose(ps, here, maxD) {
    const opts = [];
    let total = 0;
    for (const p of ps) {
      const vx = clamp(here.vx + rand(-140, 140), p.vx1, p.vx2);
      const d = Math.hypot(vx - here.vx, p.vy - here.vy);
      if (d > maxD || d < 18) continue;
      const w = (1 / (1 + d / 170)) * (p.kind === 'end' ? (innerWidth < 700 ? 1.7 : 0.55) : 1) * (p.fs >= 28 ? 1.5 : 1);
      opts.push({ p, vx, w });
      total += w;
    }
    if (!opts.length) return null;
    let k = Math.random() * total;
    for (const o of opts) { k -= o.w; if (k <= 0) return o; }
    return opts[opts.length - 1];
  }

  // ---- motion ----
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };
  const cancelAnim = () => { anim = null; if (raf) { cancelAnimationFrame(raf); raf = 0; } el.style.setProperty('--sx', '1'); el.style.setProperty('--sy', '1'); };

  function frame(now) {
    raf = 0;
    if (!anim) return;
    const dt = Math.min(50, now - (anim.last ?? now));
    anim.last = now;
    if (anim.kind === 'hop') {
      if (now < anim.t0) { kick(); return; } // crouching before the jump
      if (!anim.started) { anim.started = true; setPose('air'); }
      const t = clamp((now - anim.t0) / anim.dur, 0, 1);
      const T = anim.target();
      pos.x = lerp(anim.sx, T.x, t);
      pos.y = lerp(anim.sy, T.y, t) - anim.arc * 4 * t * (1 - t);
      const s = Math.sin(Math.PI * t);
      el.style.setProperty('--sx', (1 - 0.1 * s).toFixed(3));
      el.style.setProperty('--sy', (1 + 0.14 * s).toFixed(3));
      render();
      if (t >= 1) { const done = anim.done; cancelAnim(); done(); return; }
    } else if (anim.kind === 'walk') {
      const step = (anim.speed * dt) / 1000;
      const gap = anim.to - anc.ox;
      anc.ox = Math.abs(gap) <= step ? anim.to : anc.ox + Math.sign(gap) * step;
      const p = at(anc);
      pos.x = p.x; pos.y = p.y;
      render();
      if (anc.ox === anim.to) { const done = anim.done; cancelAnim(); done(); return; }
    }
    kick();
  }

  function jump(target, onLand, { arcBoost = 0, as = 'hop' } = {}) {
    cancelAnim();
    mode = as;
    const T = target();
    const sx = pos.x, sy = pos.y;
    const d = Math.hypot(T.x - sx, T.y - sy);
    face = T.x >= sx ? 1 : -1;
    applyFace();
    setPose('crouch');
    anim = {
      kind: 'hop', t0: performance.now() + 110, dur: clamp(340 + d * 0.5, 360, 900), sx, sy, target, done: onLand,
      arc: clamp(26 + d * 0.22, 26, 150) + Math.max(0, sy - T.y) * 0.3 + arcBoost,
    };
    kick();
  }

  function hop(p, vx, then, opts) {
    const r = p.el.getBoundingClientRect();
    const a = { el: p.el, kind: p.kind, ox: vx - r.left, oy: p.oy, rx1: p.rx1, rx2: p.rx2 };
    jump(() => at(a), () => { anc = a; land(); then?.(); }, opts);
  }

  function land() {
    mode = 'stand';
    restPose();
    squash();
    schedule();
  }

  function walkTo(ox, then) {
    cancelAnim();
    mode = 'walk';
    setPose('walk');
    face = ox >= anc.ox ? 1 : -1;
    applyFace();
    anim = { kind: 'walk', to: ox, speed: 45 + 85 * tau(), done: () => { mode = 'stand'; restPose(); if (then) then(); else schedule(); } };
    kick();
  }

  function hopNear() {
    const here = { vx: pos.x - scrollX, vy: pos.y - scrollY };
    const ps = platforms().filter((p) => !(anc && p.el === anc.el && p.kind === anc.kind));
    const o = choose(ps, here, innerWidth < 700 ? 260 : 440);
    if (!o) return schedule();
    hop(o.p, o.vx);
  }

  function relocate() {
    const here = { vx: pos.x - scrollX, vy: clamp(pos.y - scrollY, 0, innerHeight) };
    const o = choose(platforms(), here, Infinity);
    if (!o) { if (mode !== 'float') toFloat(); schedule(1500); return; }
    hop(o.p, o.vx);
  }

  // a fling: stand on the rail's current tick (wide screens) or float under the header (phones)
  function placeFixed() {
    let vx = null, vy = null;
    if (mode === 'ride') {
      const r = document.querySelector('.rail-ticks a.is-on')?.getBoundingClientRect();
      if (r?.width) { vx = r.right - 13; vy = r.top + 11; }
    }
    if (vx == null) { vx = document.documentElement.clientWidth - 22 - hw - railPad(); vy = headerBottom() + H + 10; }
    pos.x = vx + scrollX; pos.y = vy + scrollY;
    render();
  }
  const glide = () => { el.classList.add('is-glide'); clearTimeout(glideT); glideT = setTimeout(() => el.classList.remove('is-glide'), 320); };
  function toFloat() { cancelAnim(); mode = 'float'; setPose('float'); face = -1; applyFace(); glide(); placeFixed(); }
  function toRide() {
    cancelAnim();
    if (Math.random() < 0.5) setTimeout(() => react('fling'), 50);
    if (innerWidth >= 1100 && document.querySelector('.rail-ticks a.is-on')) { mode = 'ride'; setPose('stand'); face = -1; applyFace(); glide(); placeFixed(); } else toFloat();
  }

  // ---- what it does next ----
  const rest = () => lerp(6500, 2200, tau()) * rand(0.7, 1.3) * (lowPower ? 1.3 : 1);
  function schedule(ms) { clearTimeout(actT); if (alive) actT = setTimeout(act, ms ?? rest()); }

  function act() {
    actT = 0;
    if (document.hidden || menuOpen) return schedule(1500);
    if (mode === 'float' && performance.now() - lastInput > SLEEP_AFTER) { floatNap = true; setPose('sleep'); return; }
    if (mode === 'float' && Math.random() < 0.45 && perform()) return; // over the map: no lines, but it can still talk
    if (mode === 'float' || mode === 'ride') return relocate();
    if (mode !== 'stand' || performing) return schedule(1200);
    if (performance.now() - lastInput > SLEEP_AFTER) return sleep();
    if (!anc || stale(anc) || !visible(at(anc))) return relocate();
    const t = tau();
    if (Math.random() < 0.36 + 0.14 * t && perform()) return;
    if (performance.now() - lastTrick > 22000 - 9000 * t && Math.random() < 0.24 + 0.12 * t && trick()) return;
    if (anc.kind === 'top' && Math.random() < 0.55) {
      const ox = rand(anc.rx1, anc.rx2);
      if (Math.abs(ox - anc.ox) > 30) return walkTo(ox);
    }
    hopNear();
  }

  function sleep() { cancelAnim(); mode = 'sleep'; setPose('sleep'); }
  function wake() { mode = 'stand'; restPose(); bounce(5); schedule(1400); if (Math.random() < 0.5) setTimeout(() => react('wake'), 400); }
  function poke() {
    lastInput = performance.now();
    if (mode === 'sleep') wake();
    else if (floatNap) { floatNap = false; if (mode === 'float') { setPose('float'); schedule(800); } }
  }

  // ---- the word trick: lift a word, sample a replacement, put the original back ----
  const STOP = /^(about|after|again|their|there|these|those|which|while|would|could|should|other|every|where|under|with|from|this|that|have|been|into|over|than|then|them|they|what|when|your|also|only|some|such|more|most|very)$/i;
  function findWord(kind = 'swap') {
    const here = pos.x - scrollX;
    const out = [];
    for (const p of platforms()) {
      if (p.kind !== 'top') continue;
      const tw = document.createTreeWalker(p.el, NodeFilter.SHOW_TEXT);
      let n, budget = 40;
      while ((n = tw.nextNode()) && budget-- > 0) {
        if (n.parentElement.closest(SKIP)) continue;
        const re = kind === 'swap' ? /[A-Za-z]{3,}/g : /[A-Za-z]{5,12}/g;
        let m;
        while ((m = re.exec(n.data))) {
          if (kind === 'swap' ? !VOCAB[m[0].toLowerCase()] : STOP.test(m[0])) continue;
          const rg = document.createRange();
          rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
          const r = rg.getBoundingClientRect();
          if (Math.abs(r.top - p.vy) > 8 || r.left < p.vx1 - hw - 6 || r.right > p.vx2 + hw + 6) continue;
          out.push({ p, node: n, start: m.index, word: m[0], rect: r, d: Math.abs(r.left + r.width / 2 - here) });
        }
      }
    }
    if (!out.length) return null;
    out.sort((a, b) => a.d - b.d);
    return out[Math.floor(Math.random() * Math.min(3, out.length))];
  }

  function trick(kind = 'swap', done) {
    if (mode !== 'stand' && mode !== 'sleep') return false;
    const c = findWord(kind);
    if (!c) return false;
    lastTrick = performance.now();
    const vx = clamp(c.rect.left + c.rect.width / 2, c.p.vx1, c.p.vx2);
    const go = () => { if (!lift(c, kind, done)) done?.(); };
    if (anc && c.p.el === anc.el && anc.kind === 'top') walkTo(vx - anc.el.getBoundingClientRect().left, go);
    else hop(c.p, vx, go);
    return true;
  }

  function lift(c, kind = 'swap', done) {
    if (mode !== 'stand' || !c.node.isConnected || c.node.data.substr(c.start, c.word.length) !== c.word) return false;
    clearTimeout(actT);
    const rg = document.createRange();
    rg.setStart(c.node, c.start); rg.setEnd(c.node, c.start + c.word.length);
    const hole = document.createElement('span');
    hole.className = 'nr-hole';
    try { rg.surroundContents(hole); } catch { schedule(); return false; }
    mode = 'trick';
    const cs = getComputedStyle(hole);
    const r = hole.getBoundingClientRect();
    const w = document.createElement('span');
    w.className = 'nr-word';
    w.setAttribute('aria-hidden', 'true');
    for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'color', 'fontFeatureSettings']) w.style[k] = cs[k];
    w.style.left = `${r.left + scrollX}px`;
    w.style.top = `${r.top + scrollY}px`;
    w.style.lineHeight = `${r.height}px`;
    w.style.setProperty('--lift', `${-(H + r.height * 0.9 + 2)}px`);
    const wt = document.createElement('span');
    wt.className = 'nr-wt';
    wt.textContent = c.word;
    w.append(wt);
    document.body.append(w);
    hole.style.visibility = 'hidden';
    const timers = [];
    trickState = { hole, w, timers, done };
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));
    face = 1; applyFace();
    if (kind === 'underline' || kind === 'count') { w.classList.add('is-mark'); T(() => play(kind, c, w, wt, T), 120); return true; }
    setPose('lift');
    requestAnimationFrame(() => w.classList.add('is-up'));
    T(() => (kind === 'swap' ? sample(c, w, wt, T) : play(kind, c, w, wt, T)), 450);
    return true;
  }

  // the other word tricks; each ends by lowering the word (when lifted) and putting it back
  const tokensOf = (word) => {
    const m = word.match(/^(.*?)(ing|tion|ions|ment|ness|able|ers|ed|ly|es)?$/i);
    const stem = m[1] || word, n = Math.ceil(stem.length / 4), size = Math.ceil(stem.length / n);
    const out = stem.match(new RegExp(`.{1,${size}}`, 'g')) || [word]; // even pieces: sam·pl·ing, not samp·l·ing
    if (m[2]) out.push(m[2]);
    return out;
  };
  const spans = (wt, parts, cls) => { wt.textContent = ''; return parts.map((p, i) => { const e = document.createElement('span'); e.className = cls; e.textContent = p; e.style.setProperty('--i', i); wt.append(e); return e; }); };
  const flipK = [{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }];
  function play(kind, c, w, wt, T) {
    const word = c.word;
    const end = (ms) => { T(() => { wt.textContent = word; wt.classList.remove('is-alt'); }, ms - 60); T(() => w.classList.remove('is-up', 'is-mark'), ms); T(finishTrick, ms + 420); };
    if (kind === 'shout') { wt.textContent = `${word.toUpperCase()}!`; wt.classList.add('is-alt'); wt.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 420 }); emote('shake'); return end(1700); }
    if (kind === 'reverse') { wt.animate(flipK, { duration: 600 }); T(() => { wt.textContent = [...word].reverse().join(''); wt.classList.add('is-alt'); }, 300); T(() => wt.animate(flipK, { duration: 600 }), 1500); return end(1920); }
    if (kind === 'spell' || kind === 'wave') {
      const ls = spans(wt, [...word], 'nr-l');
      ls.forEach((e, i) => e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-0.35em)' }, { transform: 'translateY(0)' }], { duration: 420, delay: i * 70, iterations: kind === 'wave' ? 3 : 1, easing: 'ease-in-out' }));
      return end(word.length * 70 + (kind === 'wave' ? 1400 : 700));
    }
    if (kind === 'juggle' || kind === 'tokens') {
      const parts = tokensOf(word);
      const ts = spans(wt, parts, kind === 'tokens' ? 'nr-tk' : 'nr-tk nr-tk-j');
      if (kind === 'juggle') ts.forEach((e, i) => e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-0.7em) rotate(8deg)' }, { transform: 'translateY(0)' }], { duration: 520, delay: i * 140, iterations: 2, easing: 'ease-in-out' }));
      say(`≈ ${parts.length} token${parts.length === 1 ? '' : 's'}: ${parts.join(' · ')}`, { force: true, ms: 2200 });
      return end(2300);
    }
    if (kind === 'shrinkword') { wt.animate([{ transform: 'scale(1)' }, { transform: 'scale(.45)' }, { transform: 'scale(.45)' }, { transform: 'scale(1)' }], { duration: 1300, easing: 'ease-in-out' }); say('Quantized.', { force: true, ms: 1300 }); return end(1500); }
    if (kind === 'count') { say(`"${word}": ${word.length} letters`, { force: true, ms: 1900 }); return end(2000); }
    return end(1400); // underline: the mark draws itself (CSS)
  }

  function sample(c, w, wt, T) {
    const alts = VOCAB[c.word.toLowerCase()].map((a) => caseLike(a, c.word));
    const pickI = Math.floor(Math.random() * alts.length);
    const pPick = rand(0.42, 0.55), pOrig = rand(0.2, 0.3);
    const others = alts.filter((_, i) => i !== pickI);
    const restP = 1 - pPick - pOrig;
    const rows = [{ t: alts[pickI], p: pPick, pick: true }, { t: c.word, p: pOrig }, ...others.map((t, i) => ({ t, p: restP * (i ? 0.38 : 0.62) }))].sort((a, b) => b.p - a.p);
    const dist = document.createElement('div');
    dist.className = 'dist nr-dist';
    const parts = rows.map((row) => {
      const d = document.createElement('div'); d.className = 'dist-row';
      const tk = document.createElement('span'); tk.className = 'dist-tok'; tk.textContent = row.t;
      const bar = document.createElement('span'); bar.className = 'dist-bar'; const i = document.createElement('i'); bar.append(i);
      const pv = document.createElement('span'); pv.className = 'dist-p';
      d.append(tk, bar, pv); dist.append(d);
      return { row, d, i, pv };
    });
    w.append(dist);
    placePopup(w, dist, { order: ['right', 'left', 'above', 'below'] });
    const frames = 6;
    for (let f = 0; f <= frames; f++) {
      T(() => {
        const noise = 0.5 * (1 - f / frames);
        const z = parts.map((x) => Math.max(0.01, x.row.p + (Math.random() - 0.5) * noise));
        const s = z.reduce((a, b) => a + b, 0);
        parts.forEach((x, k) => { x.i.style.setProperty('--p', `${((z[k] / s) * 100).toFixed(1)}%`); x.pv.textContent = (z[k] / s).toFixed(2); });
      }, f * 40);
    }
    T(() => {
      parts.find((x) => x.row.pick)?.d.classList.add('is-pick');
      wt.textContent = alts[pickI];
      wt.classList.add('is-alt');
      bounce(4);
    }, frames * 40 + 120);
    T(() => dist.classList.add('is-out'), frames * 40 + 1500);
    T(() => { dist.remove(); wt.textContent = c.word; wt.classList.remove('is-alt'); }, frames * 40 + 1820);
    T(() => w.classList.remove('is-up'), frames * 40 + 2200);
    T(finishTrick, frames * 40 + 2600);
  }

  function finishTrick() {
    const s = trickState;
    trickState = null;
    if (!s) return;
    s.timers.forEach(clearTimeout);
    s.w.remove();
    if (s.hole.isConnected) s.hole.replaceWith(...s.hole.childNodes);
    if (mode === 'trick') { mode = 'stand'; restPose(); schedule(); }
    s.done?.();
  }

  // ---- the repertoire (neuron-acts.js): speech, emotes, little scenes, reactions ----
  const sayEl = el.querySelector('.nr-say');
  let sayT = 0, sayR = null;
  function say(text, { force = false, ms } = {}) {
    if (!text || !alive) return Promise.resolve();
    const now = performance.now();
    if (!force && now - lastSay < 9000) return Promise.resolve(); // never chatty
    lastSay = now;
    const vx = pos.x - scrollX;
    sayEl.textContent = text;
    sayEl.dataset.side = vx > innerWidth - 170 ? 'left' : vx < 150 ? 'right' : 'mid';
    sayEl.dataset.v = pos.y - scrollY - H < headerBottom() + 70 ? 'below' : 'above';
    sayEl.hidden = false;
    sayEl.classList.remove('is-out');
    clearTimeout(sayT);
    sayR?.();
    const d = ms ?? clamp(1500 + text.length * 45, 1900, 5200);
    return new Promise((r) => {
      sayR = r;
      sayT = setTimeout(() => { sayEl.classList.add('is-out'); sayT = setTimeout(() => { sayEl.hidden = true; sayR = null; r(); }, 220); }, d);
    });
  }
  function emote(name) {
    const ms = EMOTES[name];
    if (!ms) return Promise.resolve();
    el.classList.add(`nr-e-${name}`);
    return wait(ms).then(() => el.classList.remove(`nr-e-${name}`));
  }
  function fx(text) {
    const f = document.createElement('span');
    f.className = 'nr-fx';
    f.textContent = text;
    el.append(f);
    setTimeout(() => f.remove(), 1500);
  }
  function ctx() {
    const at0 = document.elementFromPoint(innerWidth / 2, innerHeight * 0.45);
    const sec = at0?.closest('section[id]');
    const footer = at0?.closest('footer');
    const active = document.querySelector('.hs--on .hs-track > .card.is-active');
    let card = at0?.closest('article.card[id]') || null;
    if (!card && active) { const r = active.getBoundingClientRect(); if (r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.3) card = active; }
    if (card && card.getBoundingClientRect().bottom < headerBottom()) card = null;
    const q = (s) => card?.querySelector(s)?.textContent.trim().replace(/\s+/g, ' ') || '';
    const near = (id) => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.2; };
    const d = new Date();
    return {
      section: footer ? 'footer' : sec?.id || '',
      card: card ? { title: q('.card-title'), metric: q('.metric-val'), label: q('.metric-label'), kind: q('.chip-kind'), limits: !!card.querySelector('.cb-limits'), stack: [...card.querySelectorAll('.stack li')].slice(0, 3).map((x) => x.textContent.trim()).join(', ') } : null,
      cards: document.querySelectorAll('#work article.card').length,
      near: { adapters: near('adapters'), guinness: near('guinness') },
      hour: d.getHours(), day: d.getDay(), theme: themeBtn?.dataset.themeState || 'auto', tau: tau(), small: innerWidth < 700,
      depth: Math.round((scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 100),
      lens: el.classList.contains('nr--lens'), mins: (performance.now() - born) / 60000,
      verb: document.querySelector('.think-word')?.textContent.replace(/[.…\s]+$/, '') || '',
    };
  }
  const api = {
    get count() { return ACTS.length + Object.keys(REACT).length; },
    say, emote, fx, wait, hues: HUES, hueNow: () => hue, hue: (h) => setHue(HUES.includes(h) ? h : hue),
    hopNear: () => new Promise((r) => { hopNear(); setTimeout(r, 1000); }),
    trick: (k) => new Promise((r) => { if (!trick(k, r)) r(); }),
    hopTo: (sel) => new Promise((r) => {
      const e = document.querySelector(sel);
      if (!e || mode !== 'stand') return r(false);
      const L = lineBoxes(e), b = e.getBoundingClientRect();
      if (!L || L.top < headerBottom() + 34 || L.top > innerHeight - 28) return r(false);
      const right = document.documentElement.clientWidth - 10 - hw - railPad();
      const x1 = Math.max(L.x1 + hw * 0.6, 10 + hw), x2 = Math.min(L.x2 - hw * 0.6, right);
      if (x2 < x1) return r(false);
      hop({ el: e, kind: 'top', oy: L.top - b.top, rx1: x1 - b.left, rx2: x2 - b.left }, (x1 + x2) / 2, () => r(true));
    }),
  };
  const cooldown = (id) => (id.startsWith('emote-') || id.startsWith('trick-') ? 70000 : 300000);
  function perform(force = false) {
    if (performing || (mode !== 'stand' && mode !== 'float')) return false;
    const c = ctx(), now = performance.now();
    const pool = ACTS.filter((a) => { try { return (!a.when || a.when(c)) && (force || now - (recent.get(a.id) ?? -1e9) > cooldown(a.id)); } catch { return false; } });
    if (!pool.length) return false;
    let k = Math.random() * pool.reduce((sum, a) => sum + a.w, 0);
    const a = pool.find((x) => (k -= x.w) <= 0) || pool[0];
    recent.set(a.id, now);
    performing = true;
    clearTimeout(actT);
    Promise.resolve().then(() => a.run(api, c)).catch((e) => console.warn('neuron act', a.id, e)).finally(() => {
      performing = false;
      if (mode === 'stand') restPose();
      schedule(mode === 'float' ? 1500 : undefined);
    });
    return true;
  }
  const reacted = new Map();
  function react(key, data) {
    if (!alive || !REACT[key] || performing || menuOpen) return;
    if (!['stand', 'sleep', 'float', 'ride'].includes(mode)) return;
    const now = performance.now();
    if (now - (reacted.get(key) ?? -1e9) < (key === 'select' || key === 'copy' ? 6000 : 20000)) return;
    reacted.set(key, now);
    if (mode === 'sleep') { mode = 'stand'; restPose(); }
    performing = true;
    Promise.resolve().then(() => REACT[key](api, ctx(), data)).catch((e) => console.warn('neuron react', key, e)).finally(() => { performing = false; if (mode === 'stand') { restPose(); schedule(); } });
  }

  // ---- menu ----
  const tauEl = menu.querySelector('[data-nr-tau]');
  function openMenu() {
    menuOpen = true;
    clearTimeout(actT);
    tauEl.textContent = `${tau().toFixed(1)} · ${api.count} tricks`;
    menu.dataset.side = pos.x - scrollX > innerWidth / 2 ? 'left' : 'right';
    menu.dataset.v = pos.y - scrollY - H < headerBottom() + 170 ? 'below' : 'above'; // never under the header
    menu.hidden = false;
  }
  function closeMenu() { if (!menuOpen) return; menuOpen = false; menu.hidden = true; schedule(); }
  sq.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); poke(); if (menuOpen) closeMenu(); else openMenu(); }, sig);
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nr]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    closeMenu();
    if (b.dataset.nr === 'ask') window.__ask?.();
    else if (b.dataset.nr === 'word') { if (!trick(['swap', 'juggle', 'shout', 'reverse', 'spell', 'tokens', 'wave'][Math.floor(Math.random() * 7)]) && !trick()) hopNear(); }
    else if (b.dataset.nr === 'hue') { const next = HUES[(HUES.indexOf(hue) + 1) % HUES.length]; setHue(next, true); bounce(6); fx('✦'); say(`${next[0].toUpperCase()}${next.slice(1)}!`, { force: true, ms: 1300 }); }
    else if (b.dataset.nr === 'act') { if (!perform(true)) say('Hmm, give me a second.', { force: true }); }
    else if (b.dataset.nr === 'nap') nap();
  }, sig);
  document.addEventListener('pointerdown', (e) => { if (menuOpen && !el.contains(e.target)) closeMenu(); }, sig);

  // ---- nap: back into the logo, remembered on this device ----
  function nap() {
    try { localStorage.setItem(KEY, 'off'); } catch { /* storage blocked */ }
    finishTrick();
    clearTimeout(actT);
    const logo = document.querySelector('.brand-logo');
    if (!logo) return destroy();
    const target = () => { const r = logo.getBoundingClientRect(); return { x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + H * 0.5 + scrollY }; };
    jump(target, () => {
      el.classList.add('is-gone');
      logo.classList.add('is-landed');
      setTimeout(() => logo.classList.remove('is-landed'), 600);
      setTimeout(() => { destroy(); wakeButton(); }, 350);
    }, { arcBoost: 40, as: 'home' });
  }

  function destroy() {
    alive = false;
    ac.abort();
    observers.forEach((o) => o.disconnect());
    cancelAnim();
    clearTimeout(actT);
    if (trickState) finishTrick();
    el.remove();
    window.__neuron = { alive: false };
  }

  // ---- the page around it ----
  let lastY = scrollY, lastT = performance.now(), vel = 0, stopT = 0, sraf = 0;
  addEventListener('scroll', () => {
    const now = performance.now();
    vel = vel * 0.5 + (0.5 * Math.abs(scrollY - lastY)) / Math.max(8, now - lastT);
    lastY = scrollY; lastT = now;
    poke();
    if (!sraf) sraf = requestAnimationFrame(onScrollFrame);
    clearTimeout(stopT);
    stopT = setTimeout(onScrollStop, 220);
  }, passive);
  function onScrollFrame() {
    sraf = 0;
    if (menuOpen) closeMenu();
    if (mode === 'trick') finishTrick();
    if (mode === 'hop' || mode === 'home' || mode === 'idle') return;
    if (vel > FAST && mode !== 'ride' && mode !== 'float') return toRide();
    if (mode === 'ride' || mode === 'float') return placeFixed();
    if (!anc) return;
    if (stale(anc) || !visible(at(anc))) { cancelAnim(); relocate(); return; }
    if (mode !== 'walk') { const p = at(anc); pos.x = p.x; pos.y = p.y; render(); }
  }
  function onScrollStop() {
    vel = 0;
    if (mode === 'ride' || mode === 'float') relocate();
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 40) setTimeout(() => react('bottom'), 1200);
  }

  let ex = 0, ey = 0, eraf = 0;
  function look() {
    eraf = 0;
    const r = sq.getBoundingClientRect();
    const dx = ex - (r.left + r.width / 2), dy = ey - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 90);
    el.style.setProperty('--px', ((dx / len) * 1.25 * k * face).toFixed(2));
    el.style.setProperty('--py', ((dy / len) * 1.1 * k).toFixed(2));
  }
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; ex = e.clientX; ey = e.clientY; poke(); if (!eraf) eraf = requestAnimationFrame(look); }, passive);
  addEventListener('pointerdown', poke, passive);
  addEventListener('keydown', (e) => { poke(); if (e.key === 'Escape') closeMenu(); }, sig);
  addEventListener('wheel', poke, passive);
  addEventListener('resize', () => {
    sizes();
    if (anc && (mode === 'stand' || mode === 'sleep')) { const p = at(anc); if (stale(anc) || !visible(p)) relocate(); else { pos.x = p.x; pos.y = p.y; render(); } }
  }, passive);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); clearTimeout(actT); if (trickState) finishTrick(); }
    else { schedule(800); if (hiddenAt && performance.now() - hiddenAt > 30000) setTimeout(() => react('return'), 600); }
  }, sig);

  // ---- what the visitor does ----
  document.addEventListener('copy', () => setTimeout(() => react('copy'), 200), sig);
  let selT = 0;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selT);
    selT = setTimeout(() => {
      if (document.activeElement?.matches?.('input, textarea')) return;
      const t = String(getSelection?.() || '').trim();
      if (!t || t.length > 3000) return;
      react('select', { words: t.split(/\s+/).length, tokens: Math.max(1, Math.round(t.length / 4)) });
    }, 700);
  }, sig);
  document.addEventListener('rsa:result', (e) => react('rsaResult', e.detail), sig);
  document.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-palette-open]')) react('palette');
    else if (e.target.closest?.('[data-ask-open], .ask-fab')) react('ask');
  }, sig);
  let typed = '';
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { react('palette'); return; }
    if (e.target.closest?.('input, textarea, [contenteditable="true"]') || e.key.length !== 1) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === 'neuron') { typed = ''; react('secret'); }
  }, sig);
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (Math.random() < 0.4) react('resize'); }, 600); }, passive);
  addEventListener('offline', () => react('offline'), sig);
  addEventListener('online', () => react('online'), sig);
  // on the neuron itself: hover, double click, a flurry of clicks
  let hoverT = 0;
  const clicks = [];
  sq.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hoverT = setTimeout(() => { if (!menuOpen) react('hover'); }, 1200); }, sig);
  sq.addEventListener('pointerleave', () => clearTimeout(hoverT), sig);
  sq.addEventListener('dblclick', (e) => { e.preventDefault(); closeMenu(); react('dbl'); }, sig);
  sq.addEventListener('pointerdown', () => {
    clearTimeout(hoverT);
    const now = performance.now();
    clicks.push(now);
    while (clicks.length && now - clicks[0] > 1300) clicks.shift();
    if (clicks.length >= 3) { clicks.length = 0; setTimeout(() => { closeMenu(); react('poked'); }, 0); }
  }, sig);

  // glasses while the Lens is on; a little hop when the temperature changes
  const lensBtn = document.querySelector('[data-lens]');
  let lensWas = null;
  const syncLens = () => {
    const on = lensBtn?.getAttribute('aria-pressed') === 'true';
    el.classList.toggle('nr--lens', on);
    if (lensWas !== null && on !== lensWas) react(on ? 'lensOn' : 'lensOff');
    lensWas = on;
  };
  if (lensBtn) { const mo = new MutationObserver(syncLens); mo.observe(lensBtn, { attributes: true, attributeFilter: ['aria-pressed'] }); observers.push(mo); }
  syncLens();
  if (themeBtn) {
    const mo = new MutationObserver(() => { poke(); if (mode === 'stand') bounce(4 + 10 * tau()); react({ dark: 'themeHot', light: 'themeCold' }[themeBtn.dataset.themeState] || 'themeAuto'); });
    mo.observe(themeBtn, { attributes: true, attributeFilter: ['data-theme-state'] });
    observers.push(mo);
  }

  // ---- out of the logo ----
  function spawn() {
    if (!alive) return;
    const logo = document.querySelector('.brand-logo');
    const r = logo?.getBoundingClientRect();
    pos.x = (r?.width ? r.left + r.width / 2 : 40) + scrollX;
    pos.y = (r?.width ? r.top + r.height / 2 + H * 0.5 : 60) + scrollY;
    render();
    el.classList.add('is-in');
    if (logo) { logo.classList.add('is-landed'); setTimeout(() => logo.classList.remove('is-landed'), 600); }
    const o = choose(platforms(), { vx: pos.x - scrollX, vy: pos.y - scrollY }, Infinity);
    if (!o) { toFloat(); schedule(1500); return; }
    hop(o.p, o.vx, null, { arcBoost: 30 });
  }
  setTimeout(spawn, 500); // the observer reports the lines near the screen first

  window.__neuron = {
    alive: true, nap, play: (k) => trick(k), act: () => perform(true), react, count: () => api.count, ids: () => ACTS.map((a) => a.id),
    run: (id, force) => { const a = ACTS.find((x) => x.id === id); if (!a || performing || (mode !== 'stand' && mode !== 'float')) return false; try { if (!force && a.when && !a.when(ctx())) return 'skip'; } catch { return 'skip'; } performing = true; Promise.resolve().then(() => a.run(api, ctx())).catch((e) => console.warn('neuron act', id, e)).finally(() => { performing = false; if (mode === 'stand') restPose(); schedule(); }); return true; },
    state: () => ({ mode, pose, performing, x: Math.round(pos.x), y: Math.round(pos.y) }),
  };
  return window.__neuron;
}
