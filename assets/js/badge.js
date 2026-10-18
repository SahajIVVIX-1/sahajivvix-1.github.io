// Hero Guinness World Records badge, "predicted" last.
//  - On a first visit (html.gen, set by generate.js) it waits for the last hero token. Its slot is reserved from the
//    start and shows a dim "<next> ..." chip; when the hero has finished, a small probability popup appears over the
//    chip, then the logo assembles from scattered points, the star shimmers once and the two text lines are generated
//    token by token. On return visits, and with reduced motion, it is simply there.
//  - Wide screens put it in the hero's right column; if the name leaves no room it becomes a compact pill under the
//    chips. Clicking scrolls to the "recognition" row in the About facts and highlights it for a moment.
import { placePopup } from './popup.js';
import { wrapTokens } from './generate.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function initBadge({ reducedMotion = false } = {}) {
  const badge = document.querySelector('[data-badge]');
  if (!badge) return;
  const grid = badge.closest('.hero-grid');
  layoutMode(badge, grid);
  addEventListener('resize', () => layoutMode(badge, grid), { passive: true });
  badge.addEventListener('click', (e) => { e.preventDefault(); goToRow(reducedMotion); });

  const first = document.documentElement.classList.contains('gen') && !reducedMotion;
  if (!first) return;
  badge.classList.add('is-pending');
  const name = wrapTokens(badge.querySelector('.hb-name'));
  const sub = wrapTokens(badge.querySelector('.hb-sub'));
  const done = () => { badge.classList.remove('is-pending', 'is-decoding'); for (const s of [...name, ...sub]) s.classList.add('gt-on'); badge.querySelector('.hb-ph')?.remove(); };
  // The badge is predicted IN PARALLEL with the name and the tagline: from the first hero token its slot shows a live
  // next-token distribution (a second stream next to the hero's), and once the name is finished it resolves to
  // "guinness_world_records" while the tagline is still being generated: the logo assembles and the text is
  // sampled token by token alongside the tagline.
  let resolved = false;
  let stopFlicker = () => {};
  const resolve = async () => {
    if (resolved) return;
    resolved = true;
    const pop = stopFlicker();
    await wait(380);
    pop?.classList.add('is-out');
    setTimeout(() => pop?.remove(), 320);
    badge.classList.add('is-decoding');
    await assemble(badge);
    badge.classList.remove('is-pending');
    badge.classList.add('is-shimmer');
    for (const s of [...name, ...sub]) { s.classList.add('gt-on'); await wait(40); }
    await wait(250);
    done();
  };
  const begin = () => { stopFlicker = flicker(badge.querySelector('.hb-ph')); };
  if (window.__heroReady) { begin(); resolve(); }
  else {
    if (window.__heroStarted) begin(); else document.addEventListener('hero:start', begin, { once: true });
    document.addEventListener('hero:part', (e) => { if (e.detail?.index === 0) resolve(); });
    document.addEventListener('hero:ready', resolve, { once: true });
  }
  setTimeout(done, 45000); // safety net
}

// Wide column when the name leaves room on the right, otherwise a compact pill under the chips.
function layoutMode(badge, grid) {
  const name = grid.querySelector('.hero-name');
  if (!name) return;
  const probe = document.createElement('span');
  const cs = getComputedStyle(name);
  probe.textContent = 'Sahaj Saliya';
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
  grid.append(probe);
  const nameW = probe.getBoundingClientRect().width;
  probe.remove();
  const room = grid.clientWidth - nameW;
  badge.classList.toggle('is-wide', innerWidth > 1100 && room >= 200);
}

// A live next-token distribution over the placeholder chip (logits plus decaying noise, softmax at T = 0.7, like the
// hero's own tokens). Returns a function that settles it on the pick and hands back the popup element.
function flicker(anchor) {
  if (!anchor) return () => null;
  const T = 0.7;
  const cands = [['guinness_world_records', 0.91], ['award', 0.05], ['<eos>', 0.04]];
  const logits = cands.map(([, p]) => Math.log(p) * T);
  const d = document.createElement('div');
  d.className = 'dist';
  d.setAttribute('aria-hidden', 'true');
  d.style.width = 'max-content';
  d.innerHTML = cands.map(([t]) => `<div class="dist-row"><span class="dist-tok">${t.replace(/</g, '&lt;')}</span><span class="dist-bar"><i></i></span><span class="dist-p"></span></div>`).join('');
  anchor.append(d);
  placePopup(anchor, d, { order: ['below', 'left', 'above', 'right'] });
  const bars = [...d.querySelectorAll('.dist-bar i')];
  const ps = [...d.querySelectorAll('.dist-p')];
  const rows = [...d.querySelectorAll('.dist-row')];
  const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((x, y) => x + y, 0); return e.map((v) => v / s); };
  const paint = (noise) => {
    const p = softmax(logits.map((l) => (l + (Math.random() - 0.5) * 2 * noise) / T));
    p.forEach((v, i) => { bars[i].style.setProperty('--p', `${(v * 100).toFixed(1)}%`); ps[i].textContent = v.toFixed(2); });
  };
  const t0 = performance.now();
  let timer = 0;
  const tick = () => {
    // the noise shrinks while the hero is still sampling, but never to zero until the badge is picked
    const age = (performance.now() - t0) / 1000;
    paint(Math.max(0.5, 1.6 - age * 0.35));
    timer = setTimeout(tick, 110);
  };
  tick();
  return () => {
    clearTimeout(timer);
    paint(0);
    rows[0].classList.add('is-pick');
    return d;
  };
}

// The logo assembles from scattered points onto the real <img>, which then fades in.
async function assemble(badge) {
  const cv = badge.querySelector('.hb-cv');
  const img = badge.querySelector('.hb-img');
  if (!cv || !img) return;
  try { await img.decode(); } catch { /* use whatever loaded */ }
  const box = cv.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const S = Math.max(1, Math.round(box.width * dpr));
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  // sample the logo's coloured pixels (the white inner circle is skipped)
  const off = document.createElement('canvas'); off.width = off.height = S;
  const oc = off.getContext('2d', { willReadFrequently: true });
  const inset = S * 0.06;
  oc.drawImage(img, inset, inset, S - inset * 2, S - inset * 2);
  const px = oc.getImageData(0, 0, S, S).data;
  const step = Math.max(2, Math.round(S / 46));
  const pts = [];
  for (let y = 0; y < S; y += step) for (let x = 0; x < S; x += step) {
    const i = (y * S + x) * 4;
    if (px[i + 3] > 128 && px[i] + px[i + 1] + px[i + 2] < 700) pts.push({ x, y, c: `rgb(${px[i]},${px[i + 1]},${px[i + 2]})`, sx: Math.random() * S, sy: Math.random() * S });
  }
  const DUR = 950, t0 = performance.now(), sz = Math.max(2, step - 0.5);
  await new Promise((res) => {
    const f = (now) => {
      const t = Math.min(1, (now - t0) / DUR);
      const e = 1 - (1 - t) ** 3;
      ctx.clearRect(0, 0, S, S);
      for (const p of pts) { ctx.fillStyle = p.c; ctx.fillRect(p.sx + (p.x - p.sx) * e, p.sy + (p.y - p.sy) * e, sz, sz); }
      if (t < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  img.classList.add('is-in');
  cv.classList.add('is-out');
  await wait(280);
  cv.remove();
}

// Smooth-scroll to the recognition row (centred, so the fixed header never covers it), then glow it briefly.
function goToRow(reducedMotion) {
  const row = document.getElementById('recognition');
  if (!row) return;
  const target = row.getBoundingClientRect().top + scrollY - innerHeight / 2 + row.getBoundingClientRect().height / 2;
  scrollTo({ top: Math.max(0, target), behavior: reducedMotion ? 'auto' : 'smooth' });
  const flash = () => { row.classList.add('is-flash'); setTimeout(() => row.classList.remove('is-flash'), 1400); };
  if (reducedMotion) { flash(); return; }
  // wait until the scroll has settled
  let last = -1, still = 0;
  const poll = () => {
    if (Math.abs(scrollY - last) < 1) still++; else still = 0;
    last = scrollY;
    if (still >= 6) flash(); else requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}
