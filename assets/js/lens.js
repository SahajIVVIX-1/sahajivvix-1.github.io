// The Lens: a header toggle that turns the page into an attention view. With it on, pointing at any word (or
// tapping it, or focusing something with the keyboard) draws faint lines from that word to the parts of the page it
// attends to most. The weights are precomputed by scripts/embed.mjs into data/lens.json: word -> part is MiniLM
// cosine plus a bonus when the part uses the word; a word it does not know falls back to its own part's nearest
// parts. Parts off screen get a tag at the top or bottom edge that scrolls to them. Off by default; Esc closes it.
import { reduced } from './motion.js';

const NS = 'http://www.w3.org/2000/svg';
const WORD = /[A-Za-z][A-Za-z0-9+#'-]*/g;
const root = document.documentElement;
let data, layer, svg, tags, hint, btn, on = false, ready = null;
let current = null, raf = 0, clearTimer = 0;

function load() {
  return (ready ||= fetch('/data/lens.json').then((r) => r.json()).then((d) => {
    data = d;
    d.index = new Map(d.parts.map((p, i) => [p.id, i]));
  }));
}

export async function toggleLens(force) {
  btn ||= document.querySelector('[data-lens]');
  const next = force ?? !on;
  if (next === on) return;
  if (next) {
    btn?.classList.add('is-loading');
    try { await load(); } catch { btn?.classList.remove('is-loading'); return; }
    btn?.classList.remove('is-loading');
    build();
    on = true;
    root.classList.add('lens-on');
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('click', onTap, true);
    addEventListener('keydown', onKey);
    addEventListener('focusin', onFocus);
    addEventListener('scroll', redraw, { passive: true });
    addEventListener('resize', redraw);
    hint.hidden = false;
  } else {
    on = false;
    clear();
    root.classList.remove('lens-on');
    removeEventListener('pointermove', onMove);
    removeEventListener('click', onTap, true);
    removeEventListener('keydown', onKey);
    removeEventListener('focusin', onFocus);
    removeEventListener('scroll', redraw);
    removeEventListener('resize', redraw);
  }
  btn?.setAttribute('aria-pressed', String(on));
  announce(on ? 'Lens on. Point at any word to see which parts of the page it attends to. Escape turns it off.' : 'Lens off.');
}

function build() {
  if (layer) return;
  layer = document.createElement('div');
  layer.className = 'lens-layer';
  layer.innerHTML = `<svg aria-hidden="true"></svg><div class="lens-tags"></div>
    <p class="lens-hint mono" hidden>lens on · point at any word · <kbd>Esc</kbd> to close</p>
    <p class="sr-only" aria-live="polite" data-lens-live></p>`;
  document.body.append(layer);
  svg = layer.querySelector('svg');
  tags = layer.querySelector('.lens-tags');
  hint = layer.querySelector('.lens-hint');
}

function announce(text) {
  const live = layer?.querySelector('[data-lens-live]');
  if (live) live.textContent = text;
}

// ---------- finding the word under the pointer ----------
function wordAt(x, y) {
  let node, offset;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (!p) return null;
    node = p.offsetNode; offset = p.offset;
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (!r) return null;
    node = r.startContainer; offset = r.startOffset;
  }
  if (!node || node.nodeType !== 3) return null;
  const host = node.parentElement;
  if (!host || host.closest('.site-head, .lens-layer, input, textarea, #ask-root, .palette, [aria-hidden="true"], script, style')) return null;
  const text = node.nodeValue;
  let m;
  WORD.lastIndex = 0;
  while ((m = WORD.exec(text))) {
    const a = m.index, b = a + m[0].length;
    if (offset < a || offset > b) continue;
    const range = document.createRange();
    range.setStart(node, a);
    range.setEnd(node, b);
    // The caret APIs snap to the nearest text; only count it when the pointer is really on the word.
    const r = [...range.getClientRects()].find((q) => x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2);
    return r ? { node, a, word: m[0], range, host } : null;
  }
  return null;
}

function partOf(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) if (n.id && data.index.has(n.id)) return n.id;
  return null;
}

// Which parts a word attends to: its own row in lens.json, without the part it sits in; or that part's neighbours.
function targetsFor(word, from) {
  const w = word.toLowerCase().replace(/'s$/, '');
  const row = data.words[w] || data.words[w.replace(/s$/, '')] || data.words[w.replace(/(ing|ed)$/, '')];
  const own = from == null ? -1 : data.index.get(from);
  let t = (row || []).filter(([j]) => j !== own);
  if (!t.length && own >= 0) t = data.near[own];
  return t.slice(0, 4).map(([j, a]) => ({ id: data.parts[j].id, label: data.parts[j].label, a }));
}

// ---------- events ----------
function onMove(e) {
  if (e.pointerType === 'touch') return;
  const { clientX: x, clientY: y } = e;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const hit = wordAt(x, y);
    if (!hit) { if (current?.kind === 'word') clearSoon(); return; }
    if (current?.kind === 'word' && current.node === hit.node && current.a === hit.a) { clearTimeout(clearTimer); return; }
    clearTimeout(clearTimer);
    show({ kind: 'word', ...hit, from: partOf(hit.host) });
  });
}

function onTap(e) {
  if (e.target.closest('.lens-tag, [data-lens]')) return;
  if (e.pointerType ? e.pointerType === 'mouse' : matchMedia('(hover: hover)').matches) return;
  // On touch a tap on a word shows its lines instead of following a link under it.
  const hit = wordAt(e.clientX, e.clientY);
  if (!hit) { clear(); return; }
  if (hit.host.closest('a, button')) { e.preventDefault(); e.stopPropagation(); }
  show({ kind: 'word', ...hit, from: partOf(hit.host) });
}

function onKey(e) {
  if (e.key === 'Escape') { toggleLens(false); btn?.focus(); }
}

function onFocus(e) {
  const from = partOf(e.target);
  if (!from || e.target.closest('.lens-layer, .site-head')) return;
  const own = data.index.get(from);
  show({ kind: 'focus', el: e.target, from, targets: data.near[own].map(([j, a]) => ({ id: data.parts[j].id, label: data.parts[j].label, a })) });
}

function clearSoon() {
  clearTimeout(clearTimer);
  clearTimer = setTimeout(clear, 220);
}

// ---------- drawing ----------
function show(q) {
  q.targets ||= targetsFor(q.word, q.from);
  if (!q.targets.length) { clear(); return; }
  current = q;
  if (hint && !hint.hidden) hint.hidden = true;
  root.classList.add('lens-active');
  const ids = new Set([q.from, ...q.targets.map((t) => t.id)]);
  for (const p of data.parts) {
    const el = document.getElementById(p.id);
    if (!el) continue;
    const t = q.targets.find((x) => x.id === p.id);
    el.classList.toggle('lens-dim', !ids.has(p.id));
    el.classList.toggle('lens-hit', !!t);
    if (t) el.style.setProperty('--la', weight(t.a, q.targets).toFixed(2)); else el.style.removeProperty('--la');
  }
  draw(true);
  const where = q.kind === 'word' ? `“${q.word}”` : 'This part';
  announce(`${where} attends to ${q.targets.map((t) => `${t.label} (${t.a.toFixed(2)})`).join(', ')}.`);
}

const weight = (a, all) => {
  const lo = Math.min(...all.map((t) => t.a)), hi = Math.max(...all.map((t) => t.a));
  return hi > lo ? 0.35 + 0.65 * (a - lo) / (hi - lo) : 1;
};

function redraw() {
  if (!current) return;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => draw(false));
}

function draw(animate) {
  const q = current;
  svg.replaceChildren();
  tags.replaceChildren();
  const src = q.kind === 'word' ? [...q.range.getClientRects()][0] : q.el.getBoundingClientRect();
  if (!src) return clear();
  const vw = innerWidth, vh = innerHeight;
  const top = (document.querySelector('.site-head')?.getBoundingClientRect().bottom || 0) + 8;
  const qx = src.left + src.width / 2, qy = src.top + src.height / 2;
  const anim = animate && !reduced();

  const box = el('rect', { x: src.left - 3, y: src.top - 2, width: src.width + 6, height: src.height + 4, rx: 4, class: 'lens-q' });
  svg.append(box);

  const edge = { up: [], down: [] };
  q.targets.forEach((t, i) => {
    const part = document.getElementById(t.id);
    if (!part) return;
    const r = part.getBoundingClientRect();
    const w = weight(t.a, q.targets);
    let tx, ty, tag = null;
    if (r.bottom < top + 12 || r.top > vh - 12) {
      // Off screen: point at a tag on the nearest edge.
      const dir = r.bottom < top + 12 ? 'up' : 'down';
      tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'lens-tag mono';
      tag.innerHTML = `<span aria-hidden="true">${dir === 'up' ? '↑' : '↓'}</span> ${escape(t.label)} <b>${t.a.toFixed(2)}</b>`;
      tag.style.setProperty('--la', w.toFixed(2));
      tag.addEventListener('click', () => part.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }));
      edge[dir].push({ tag, t, w, i });
      return;
    }
    // On screen: the nearest point on the part's box (but not right on its corner).
    const ix = Math.max(r.left + 10, Math.min(r.right - 10, qx));
    const iy = Math.max(Math.max(r.top, top) + 10, Math.min(Math.min(r.bottom, vh) - 10, qy));
    const inside = qx > r.left && qx < r.right && qy > r.top && qy < r.bottom;
    if (inside) { tx = qx < (r.left + r.right) / 2 ? r.left : r.right; ty = iy; }
    else { tx = ix; ty = qy < r.top ? Math.max(r.top, top) : qy > r.bottom ? Math.min(r.bottom, vh) : iy; if (qy >= r.top && qy <= r.bottom) tx = qx < r.left ? r.left : r.right; }
    line(qx, qy, tx, ty, w, i, anim);
    label(tx, ty, `${t.label} ${t.a.toFixed(2)}`, w);
  });

  // Edge tags spread along the top or bottom, in as many rows as the width needs; each gets a line from the word.
  for (const dir of ['up', 'down']) {
    const list = edge[dir];
    list.forEach(({ tag }) => tags.append(tag));
    const widths = list.map(({ tag }) => Math.min(tag.getBoundingClientRect().width, vw - 24));
    const rows = [[]];
    let used = 0;
    list.forEach((item, k) => {
      if (rows.at(-1).length && used + 8 + widths[k] > vw - 24) { rows.push([]); used = 0; }
      used += (rows.at(-1).length ? 8 : 0) + widths[k];
      rows.at(-1).push(k);
    });
    rows.forEach((row, r) => {
      const total = row.reduce((a, k) => a + widths[k], 0) + 8 * (row.length - 1);
      let x = Math.max(12, Math.min(vw - total - 12, qx - total / 2));
      // the bottom rows sit above the Ask button and the agents chip in the corners
      const y = dir === 'up' ? top + 4 + r * 40 : vh - 100 - (rows.length - 1 - r) * 40;
      for (const k of row) {
        const { tag, w, i } = list[k];
        tag.style.maxWidth = `${vw - 24}px`;
        tag.style.transform = `translate(${x}px, ${y}px)`;
        line(qx, qy, x + widths[k] / 2, dir === 'up' ? y + 30 : y, w, i, anim);
        x += widths[k] + 8;
      }
    });
  }
  svg.append(el('circle', { cx: qx, cy: qy, r: 2.5, class: 'lens-dot' }));
}

function line(x1, y1, x2, y2, w, i, anim) {
  const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
  // A gentle S-curve, like attention links in a transformer diagram.
  const bend = Math.min(140, dist * 0.35);
  const vertical = Math.abs(dy) > Math.abs(dx);
  const c1 = vertical ? [x1 + Math.min(40, dist * 0.08) * Math.sign(dx || 1), y1 + dy * 0.5] : [x1 + dx * 0.4, y1 - bend * 0.5];
  const c2 = vertical ? [x2, y2 - dy * 0.5] : [x2 - dx * 0.2, y2 - bend * 0.5];
  const p = el('path', { d: `M${x1},${y1} C${c1} ${c2} ${x2},${y2}`, 'stroke-width': (0.8 + 2.4 * w).toFixed(2) });
  p.style.opacity = (0.25 + 0.5 * w).toFixed(2);
  if (anim) {
    p.style.setProperty('--len', String(Math.ceil(dist * 1.5 + bend)));
    p.style.animationDelay = `${i * 50}ms`;
    p.classList.add('draw');
  }
  svg.append(p, el('circle', { cx: x2, cy: y2, r: 2 + w * 1.5, class: 'lens-end' }));
}

function label(x, y, text, w) {
  const t = el('text', { x: x + 6, y: y - 6, class: 'lens-label' });
  t.textContent = text;
  t.style.opacity = (0.55 + 0.45 * w).toFixed(2);
  svg.append(t);
  // keep labels inside the viewport
  const b = t.getBBox();
  if (b.x + b.width > innerWidth - 8) t.setAttribute('x', String(innerWidth - 8 - b.width));
}

function el(name, attrs) {
  const n = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function clear() {
  clearTimeout(clearTimer);
  current = null;
  svg?.replaceChildren();
  tags?.replaceChildren();
  root.classList.remove('lens-active');
  for (const n of document.querySelectorAll('.lens-dim, .lens-hit')) { n.classList.remove('lens-dim', 'lens-hit'); n.style.removeProperty('--la'); }
}
