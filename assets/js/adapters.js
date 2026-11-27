// The Harvard ManageMentor completion badges as "adapters merged into the base model" (#adapters, rendered by
// build.mjs from content/harvard.json).
//  - merge: when the block comes into view each badge loads in turn: a progress line fills, its file name is
//    tokenised in with the hero's token tints, the badge settles and the counter on the base model card goes up. When
//    all are in, a line runs from every badge into the card, which ends on "9 / 9 ✓". About 3.5 s, on every load
//    (fresh.js holds the badges back from the first paint with html.ad-pending). Reduced motion, plain view and
//    ?noreplay show the merged state at once.
//  - flip: hover, keyboard focus or a first tap turns a badge over to its certificate in flip tiles, the portrait's
//    look (tiles.js: a 420 ms flip per tile in a wave from the pointer). Click, Enter or a second tap opens the
//    lightbox: the full certificate, the PDF and the issuer line. Esc closes it and focus goes back to the badge.
//  - attention: on hover, faint lines to the parts of the page a program relates to ("links" in harvard.json). A
//    program with no real counterpart on the page draws none.
import { headerBottom } from './popup.js';

const STEP = 280, LOAD = 420;          // one badge starts every STEP ms and takes LOAD ms to merge
const FLIP_MS = 420, WAVE_MS = 260;    // per-tile flip, and the spread of start times across the badge
const COLS = 4, ROWS = 5;              // tiles: the badge is 1000 x 1280, so these are close to square
const NS = 'http://www.w3.org/2000/svg';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function initAdapters({ reducedMotion = false } = {}) {
  const root = document.querySelector('[data-adapters]');
  if (!root) return null;
  const data = JSON.parse(root.querySelector('[data-ad-data]').textContent);
  const bySlug = new Map(data.map((d) => [d.slug, d]));
  const slots = [...root.querySelectorAll('.ad-slot')];
  const lb = lightbox(root, data);
  for (const s of slots) wireSlot(s, lb, reducedMotion);
  merge(root, slots, bySlug, reducedMotion);
  if (matchMedia('(hover: hover)').matches) attention(root, bySlug, reducedMotion);
  return {
    open: (slug) => lb.open(slug),
    find: (name) => {
      const k = String(name || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
      return data.find((d) => d.slug === k.replace(/ /g, '-') || d.program.toLowerCase() === k) || data.find((d) => k && d.program.toLowerCase().includes(k));
    },
  };
}

// "hmm_time_management_badge" -> hmm | _time | _manag | ement | _badge, grouped by word so a line can only wrap
// between words (and the tokens of a word sit flush, with no gap inside it)
function tokenWords(name) {
  return name.split(/(?=_)/).map((w) => (w.length > 8 ? [w.slice(0, Math.ceil(w.length / 2)), w.slice(Math.ceil(w.length / 2))] : [w]));
}

// ---------- merge ----------
function merge(root, slots, bySlug, reduced) {
  const html = document.documentElement;
  const nEl = root.querySelector('[data-ad-n]');
  const base = root.querySelector('[data-ad-base]');
  const rack = root.querySelector('[data-ad-rack]');
  const total = slots.length;
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    for (const s of slots) { s.classList.remove('is-loading'); s.classList.add('is-in'); }
    nEl.textContent = String(total);
    base.classList.add('is-merged');
    html.classList.remove('ad-pending', 'ad-armed');
  };
  if (reduced || !html.classList.contains('ad-pending') || !('IntersectionObserver' in window)) { done(); return; }
  nEl.textContent = '0';
  html.classList.add('ad-armed');
  addEventListener('beforeprint', done);

  // the phone strip follows the merge, unless the visitor has started scrolling it
  let touched = false;
  for (const ev of ['pointerdown', 'wheel', 'touchstart']) rack.addEventListener(ev, () => { touched = true; }, { once: true, passive: true });
  const strip = () => rack.scrollWidth > rack.clientWidth + 4;
  const follow = (left) => { if (strip() && !touched) rack.scrollTo({ left, behavior: 'smooth' }); };

  let count = 0;
  async function load(s) {
    const d = bySlug.get(s.dataset.ad);
    const file = s.querySelector('.ad-file');
    const words = tokenWords(d.file);
    const per = (LOAD - 140) / words.flat().length;
    s.classList.add('is-loading');
    let k = 0;
    for (const [wi, w] of words.entries()) {
      if (wi) file.append(document.createElement('wbr'));
      const run = document.createElement('span');
      run.className = 'ad-w';
      file.append(run);
      for (const t of w) {
        const tk = document.createElement('span');
        tk.className = `tkn c${k++ % 3}`;
        tk.textContent = t;
        run.append(tk);
        await wait(per);
      }
    }
    await wait(140);
    s.classList.remove('is-loading');
    s.classList.add('is-in');
    nEl.textContent = String(++count);
    nEl.classList.remove('is-bump'); void nEl.offsetWidth; nEl.classList.add('is-bump');
  }

  async function run() {
    try {
      const loads = [];
      for (const s of slots) {
        follow(Math.max(0, s.offsetLeft - (parseFloat(getComputedStyle(rack).scrollPaddingInlineStart) || 0)));
        loads.push(load(s));
        await wait(STEP);
      }
      await Promise.all(loads);
      if (strip() && !touched) { follow(0); await wait(420); }
      await wires(root, slots);
      base.classList.add('is-merged');
      await wait(200);
    } finally { done(); }
  }

  const grid = root.querySelector('.ad-grid');
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
  }, { threshold: 0.25 });
  io.observe(grid);
}

// A line from every badge in view into the base model card, drawn together, then faded out. Beside the card
// (desktop) each line leaves its badge sideways and runs left along its row like a bus (hidden behind the tiles, seen
// in the gaps), then curves into its own port on the card; under the card (phones) each rises straight into it.
async function wires(root, slots) {
  const svg = root.querySelector('[data-ad-wires]');
  const grid = svg.parentElement.getBoundingClientRect();
  const b = root.querySelector('[data-ad-base]').getBoundingClientRect();
  const rack = root.querySelector('[data-ad-rack]').getBoundingClientRect();
  const side = b.right <= rack.left + 1;
  const shown = slots.map((s) => s.querySelector('.ad-badge').getBoundingClientRect()).filter((r) => r.right > rack.left + 8 && r.left < rack.right - 8);
  const cols = [...new Set(shown.map((r) => Math.round(r.left)))].sort((x, y) => x - y);
  const f = (v) => v.toFixed(1);
  svg.replaceChildren();
  svg.classList.remove('is-out');
  const paths = shown.map((r, i) => {
    const t = shown.length > 1 ? i / (shown.length - 1) : 0.5;
    let d;
    if (side) {
      const col = cols.indexOf(Math.round(r.left));
      const x1 = r.left - grid.left + 12, y1 = r.top + r.height * 0.45 + (col - 1) * 6 - grid.top;
      const xg = rack.left - grid.left - 10, x2 = b.right - grid.left, y2 = b.top + b.height * (0.18 + 0.64 * t) - grid.top;
      const k = (xg - x2) * 0.6;
      d = `M${f(x1)} ${f(y1)}H${f(xg)}C${f(xg - k)} ${f(y1)} ${f(x2 + k)} ${f(y2)} ${f(x2)} ${f(y2)}`;
    } else {
      const x1 = r.left + r.width / 2 - grid.left, y1 = r.top - grid.top + 2;
      const x2 = b.left + b.width * (0.12 + 0.76 * t) - grid.left, y2 = b.bottom - grid.top;
      const my = (y1 + y2) / 2;
      d = `M${f(x1)} ${f(y1)}C${f(x1)} ${f(my)} ${f(x2)} ${f(my)} ${f(x2)} ${f(y2)}`;
    }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    p.style.transitionDelay = `${i * 30}ms`;
    svg.append(p);
    return p;
  });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (const p of paths) p.classList.add('is-draw');
  await wait(520 + paths.length * 30);
  setTimeout(() => { svg.classList.add('is-out'); setTimeout(() => svg.replaceChildren(), 600); }, 900);
}

// ---------- flip to the certificate ----------
function wireSlot(slot, lb, reduced) {
  const btn = slot.querySelector('[data-ad-open]');
  const card = slot.querySelector('.ad-card');
  const front = card.querySelector('.ad-front');
  let flipped = false, tiles = null, timer = 0, pointer = 'mouse';

  const build = () => {
    tiles = document.createElement('span');
    tiles.className = 'ad-tiles';
    tiles.setAttribute('aria-hidden', 'true');
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const t = document.createElement('i');
      t.style.cssText = `--x:${i};--y:${j}`;
      if ((i + j) % 2) t.className = 'ax';
      t.append(document.createElement('b'), document.createElement('b'));
      tiles.append(t);
    }
    card.append(tiles);
  };

  const set = (on, at = [0.5, 0.33]) => {
    if (on === flipped) return;
    flipped = on;
    slot.classList.toggle('is-flipped', on);
    if (on) for (const other of slot.parentElement.querySelectorAll('.ad-slot.is-flipped')) if (other !== slot) other.__adFlip?.(false);
    if (reduced) { card.classList.toggle('is-back', on); return; }
    if (!tiles) build();
    card.style.setProperty('--front', `url("${front.currentSrc || front.src}")`);
    // the wave starts where the pointer came in (the face of the badge for keyboard and touch)
    const kids = tiles.children;
    let maxD = 0;
    const ds = [...kids].map((_, n) => { const i = n % COLS, j = Math.floor(n / COLS); const d = Math.hypot((i + 0.5) / COLS - at[0], ((j + 0.5) / ROWS - at[1]) * 1.28); maxD = Math.max(maxD, d); return d; });
    ds.forEach((d, n) => kids[n].style.setProperty('--d', `${Math.round((d / (maxD || 1)) * WAVE_MS)}ms`));
    card.classList.add('is-tiling');
    void tiles.offsetWidth;
    card.classList.toggle('is-turned', on);
    clearTimeout(timer);
    timer = setTimeout(() => { card.classList.remove('is-tiling'); card.classList.toggle('is-back', flipped); }, FLIP_MS + WAVE_MS + 60);
  };
  slot.__adFlip = set;
  const where = (e) => { const r = card.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };

  btn.addEventListener('pointerdown', (e) => { pointer = e.pointerType; });
  btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') set(true, where(e)); });
  btn.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !btn.matches(':focus-visible')) set(false, where(e)); });
  btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) set(true); });
  btn.addEventListener('blur', () => { if (!btn.matches(':hover')) set(false); });
  btn.addEventListener('click', (e) => {
    // touch: the first tap turns the badge over, the second opens the certificate
    if (pointer !== 'mouse' && pointer !== 'pen' && e.detail && !flipped) { set(true); return; }
    pointer = 'mouse';
    lb.open(slot.dataset.ad);
  });
  document.addEventListener('pointerdown', (e) => { if (flipped && e.pointerType !== 'mouse' && !slot.contains(e.target)) set(false); });
}

// ---------- lightbox ----------
function lightbox(root, data) {
  let box = null, idx = 0, prevOverflow = '';
  const slotBtn = (i) => root.querySelector(`.ad-slot[data-ad="${data[i].slug}"] [data-ad-open]`);

  function fill() {
    const d = data[idx];
    box.querySelector('[data-t]').innerHTML = `${esc(d.program)} <span class="mono">· ${esc(d.month)}</span>`;
    const img = box.querySelector('img');
    img.width = d.w; img.height = d.h;
    img.alt = `Harvard ManageMentor certificate: Sahaj Saliya completed ${d.program}, ${d.month}. Presented by Harvard Business Impact in collaboration with HBI Education.`;
    img.src = d.cert;
    box.querySelector('[data-q]').textContent = `“Sahaj Saliya has completed the program and understands the principles, approaches, and best practices presented in ${d.program}.”`;
    const a = box.querySelector('[data-dl]');
    a.href = d.pdf;
    a.setAttribute('download', `Sahaj-Saliya-Harvard-ManageMentor-${d.slug}.pdf`);
    box.querySelector('[data-pos]').textContent = `${idx + 1} / ${data.length}`;
  }

  function open(slug) {
    const i = data.findIndex((d) => d.slug === slug);
    if (i < 0) return false;
    idx = i;
    if (!box) {
      box = document.createElement('div');
      box.className = 'ad-lb';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'ad-lb-t');
      box.innerHTML = `<div class="ad-lb-panel">
        <div class="ad-lb-bar"><p class="ad-lb-t" id="ad-lb-t" data-t></p><button type="button" data-close>Close <svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div>
        <figure class="ad-lb-fig"><img alt="" decoding="async"></figure>
        <p class="ad-lb-q" data-q></p>
        <p class="ad-lb-issuer mono">Presented by Harvard Business Impact in collaboration with HBI Education · Harvard ManageMentor® · a short online program, not a degree</p>
        <div class="ad-lb-actions"><a class="ad-lb-dl" data-dl>Download certificate (PDF)</a><span class="sp"></span><button type="button" data-step="-1" aria-label="Previous certificate"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13 8H3.2M7.4 3.6 3 8l4.4 4.4"/></svg></button><span class="mono ad-lb-pos" data-pos aria-live="polite"></span><button type="button" data-step="1" aria-label="Next certificate"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h9.8M8.6 3.6 13 8l-4.4 4.4"/></svg></button></div>
      </div>`;
      box.addEventListener('click', (e) => {
        if (e.target === box || e.target.closest('[data-close]')) { close(); return; }
        const s = e.target.closest('[data-step]');
        if (s) step(Number(s.dataset.step));
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); return; }
        if (e.key !== 'Tab') return;
        const f = [...box.querySelectorAll('button, a[href]')];
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }
    fill();
    if (!box.isConnected) {
      document.body.append(box);
      prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      box.querySelector('[data-close]').focus();
    }
    return true;
  }
  function step(k) { idx = (idx + k + data.length) % data.length; fill(); }
  function close() {
    if (!box?.isConnected) return;
    box.remove();
    document.documentElement.style.overflow = prevOverflow;
    // back to the badge of the certificate that was showing (the one opened, unless the visitor stepped on)
    slotBtn(idx)?.focus({ preventScroll: false });
  }
  return { open, close };
}

// ---------- attention lines on hover ----------
function attention(root, bySlug, reduced) {
  const svg = document.querySelector('[data-attn-layer]');
  if (!svg) return;
  let timer = 0, on = null;
  const clear = () => { clearTimeout(timer); if (on) { svg.replaceChildren(); on = null; } };
  root.addEventListener('pointerover', (e) => {
    const slot = e.target.closest?.('.ad-slot');
    if (!slot || slot === on || e.pointerType !== 'mouse') return;
    clear();
    if (!bySlug.get(slot.dataset.ad)?.links.length) return;
    timer = setTimeout(() => draw(slot), 120);
  });
  root.addEventListener('pointerout', (e) => { const slot = e.target.closest?.('.ad-slot'); if (slot && !slot.contains(e.relatedTarget)) clear(); });
  addEventListener('scroll', clear, { passive: true });
  document.addEventListener('pointerdown', clear);

  function draw(slot) {
    if (document.documentElement.classList.contains('lens-on') || document.querySelector('.ad-lb')) return;
    on = slot;
    svg.replaceChildren();
    const c = slot.querySelector('.ad-card').getBoundingClientRect();
    const qx = c.left + c.width / 2, qy = c.top + 4;
    const top = headerBottom() + 24, bottom = innerHeight - 24;
    bySlug.get(slot.dataset.ad).links.forEach((l, i) => {
      const el = document.querySelector(l.sel);
      if (!el || !el.getClientRects().length) return;
      const r = el.getBoundingClientRect();
      const seen = r.bottom > top && r.top < bottom;
      // a target off screen gets a line to the edge it lies beyond, labelled with where it is
      const tx = Math.min(innerWidth - 24, Math.max(24, r.left + Math.min(r.width / 2, 140)));
      const ty = seen ? r.top : r.top < top ? top : bottom;
      const dist = Math.hypot(tx - qx, ty - qy), lift = Math.min(160, 24 + dist * 0.28);
      const cy = Math.min(qy, ty) - (seen || ty < qy ? lift : -lift * 0.4);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${qx},${qy} Q${(qx + tx) / 2},${cy} ${tx},${ty}`);
      path.setAttribute('stroke-width', '1.2');
      path.classList.add('ad-attn');
      path.style.setProperty('--len', String(Math.ceil(dist * 1.4 + lift)));
      if (!reduced) { path.classList.add('draw'); path.style.animationDelay = `${i * 40}ms`; }
      const label = document.createElementNS(NS, 'text');
      const right = tx > innerWidth - 220;
      label.setAttribute('x', String(right ? tx - 6 : tx + 6));
      label.setAttribute('y', String(seen ? ty - 6 : ty < qy ? ty + 14 : ty - 6));
      if (right) label.setAttribute('text-anchor', 'end');
      label.classList.add('ad-attn');
      label.textContent = `${seen ? '' : ty < qy ? '↑ ' : '↓ '}${l.label}`;
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', String(tx)); dot.setAttribute('cy', String(ty)); dot.setAttribute('r', '2.5');
      dot.classList.add('ad-attn');
      svg.append(path, dot, label);
    });
  }
}
