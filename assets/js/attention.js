// Attention on hover (or a tap on a phone): resting on a word draws curved lines to the most related words currently
// on screen (first hop, labelled with the weight), then fainter dashed lines from those words to their own
// neighbours (second hop, like attention flowing through a second layer), and softly marks every other place the
// same word occurs. Relatedness comes from data/attention.json (MiniLM cosine, blended with sentence co-occurrence,
// computed at build time). Line width ∝ attention weight.
const NS = 'http://www.w3.org/2000/svg';
// Every word of the running text can be pointed at (headings, titles, links and buttons are left alone).
const CONTENT = 'p, li, dd, dt, td, th, figcaption, blockquote, .lead, .layer-sub, .card-task, .metric-label, .chip, .sp-k, .sp-v';
const NOT_TEXT = 'a, button, input, textarea, select, .w-tok, .gt, script, style, svg, h1, h2, h3, h4, h5, h6, .layer-title, .card-title, .hero-title, .layer-tag, .metric-val, .brand, kbd, .hs-bar, .rail, .rail-mobile, .site-head, .palette, #ask-root, .mm, .attn-layer, [data-no-attn]';
// words that are only glue: a word can be hovered, but these are not picked as the other end of a context line
const GLUE = new Set('a an the and or but of to in on at by for with from into as is are was were be been it its this that these those i my me we you your he she they them their our not no so if then than also'.split(' '));

export async function initAttention({ lowPower = false } = {}) {
  const svg = document.querySelector('[data-attn-layer]');
  if (!svg) return;
  let map;
  // The boot screen may already have fetched this file; fall back to fetching it here.
  try { map = (await window.__data?.attention) || await (await fetch('/data/attention.json')).json(); } catch { return; }

  const keys = new Set(Object.keys(map));
  const targets = new Set(Object.values(map).flat().map(([w]) => w));
  const byWord = new Map();
  const maxLines = lowPower ? 4 : 7; // first hop
  const hop2From = lowPower ? 2 : 3; // how many first-hop words are followed a second hop
  const hop2Max = lowPower ? 3 : 7;

  // Text blocks are wrapped when they come near the screen (a few thousand words, so not all at once), and again when
  // generate.js has finished sampling a block in.
  // wrapping happens in small slices while the browser is idle, so it never stalls a scroll
  const queue = [];
  let busy = false;
  const later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 500 }) : setTimeout(fn, 60));
  const pump = () => {
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 6) wrapRegion(queue.shift());
    busy = queue.length > 0;
    if (busy) later(pump);
  };
  const enqueue = (el) => { queue.push(el); if (!busy) { busy = true; later(pump); } };
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { enqueue(e.target); near.unobserve(e.target); }
  }, { rootMargin: '900px 500px' });
  const watch = (root) => { for (const el of root.querySelectorAll(CONTENT)) if (!el.closest(NOT_TEXT)) near.observe(el); };
  watch(document.querySelector('main') || document.body);
  document.addEventListener('gen:text-done', (e) => {
    const el = e.detail.el;
    if (el.matches?.(CONTENT)) wrapRegion(el); else for (const c of el.querySelectorAll?.(CONTENT) || []) wrapRegion(c);
  });

  function wrapRegion(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      // .gt pieces are parts of words still being generated; they are wrapped once the block is plain text again
      acceptNode: (n) => (n.parentElement.closest(NOT_TEXT) || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const re = /[A-Za-z][A-Za-z0-9+#.-]*[A-Za-z0-9+#]|[A-Za-z]/g;
      let m, last = 0, frag = null;
      while ((m = re.exec(text))) {
        const w = m[0].toLowerCase();
        frag ||= document.createDocumentFragment();
        frag.append(text.slice(last, m.index));
        const span = document.createElement('span');
        span.className = 'w-tok has-attn';
        span.dataset.w = w;
        span.textContent = m[0];
        frag.append(span);
        if (!byWord.has(w)) byWord.set(w, []);
        byWord.get(w).push(span);
        last = m.index + m[0].length;
      }
      if (frag) { frag.append(text.slice(last)); node.replaceWith(frag); }
    }
  }

  let timer = 0, active = null, lit = [], pinned = false;

  document.addEventListener('pointerover', (e) => {
    const tok = e.target.closest?.('.w-tok.has-attn');
    // the Lens draws its own lines while it is on
    if (!tok || tok === active || e.pointerType === 'touch' || document.documentElement.classList.contains('lens-on')) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(tok), 110); // a short dwell so a passing cursor does not spray lines
  });
  document.addEventListener('pointerout', (e) => {
    const tok = e.target.closest?.('.w-tok.has-attn');
    if (tok && !tok.contains(e.relatedTarget) && !pinned) { clearTimeout(timer); hide(); }
  });
  // Phones have no hover: a tap on a word pins its lines until the next tap elsewhere (or a scroll).
  document.addEventListener('click', (e) => {
    const tok = e.target.closest?.('.w-tok.has-attn');
    if (!tok || e.pointerType !== 'touch' && !matchMedia('(hover: none)').matches) return;
    if (document.documentElement.classList.contains('lens-on')) return;
    if (tok === active && pinned) { pinned = false; hide(); return; }
    show(tok); pinned = true;
  });
  document.addEventListener('pointerdown', (e) => { if (pinned && !e.target.closest?.('.w-tok')) { pinned = false; hide(); } });
  addEventListener('scroll', () => { pinned = false; hide(); }, { passive: true });
  addEventListener('resize', () => { pinned = false; hide(); });

  const onScreen = (r) => r.bottom > 60 && r.top < innerHeight - 10 && r.right > 0 && r.left < innerWidth && r.width > 0;
  // the occurrence of a word nearest to a point, among those on screen
  const nearest = (w, x, y) => {
    let best = null, bd = Infinity;
    for (const el of byWord.get(w) || []) {
      const r = el.getBoundingClientRect();
      if (!onScreen(r)) continue;
      const d = Math.hypot(r.left - x, r.top - y);
      if (d < bd) { bd = d; best = { el, r }; }
    }
    return best;
  };

  function arc(x1, y1, x2, y2, { width, opacity, delay = 0, second = false }) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    // Arc above both words; longer links arc higher, like attention arcs in BertViz. Second-hop arcs bow lower.
    const lift = Math.min(second ? 110 : 160, 20 + dist * (second ? 0.2 : 0.28));
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - lift;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${x1},${y1 - 2} Q${cx},${cy} ${x2},${y2 - 2}`);
    path.setAttribute('stroke-width', width.toFixed(2));
    path.style.opacity = opacity.toFixed(2);
    path.style.animationDelay = `${delay}ms`;
    if (second) path.classList.add('hop2');
    else { path.style.setProperty('--len', String(Math.ceil(dist * 1.4 + lift))); path.classList.add('draw'); }
    svg.append(path);
  }

  function show(q) {
    hide();
    active = q;
    q.classList.add('is-q');
    lit.push(q);
    const w0 = q.dataset.w;
    const qr = q.getBoundingClientRect();
    const qx = qr.left + qr.width / 2, qy = qr.top;
    const used = new Set([w0]);

    // every other place the same word is used on screen
    for (const el of GLUE.has(w0) ? [] : byWord.get(w0) || []) {
      if (el === q || !onScreen(el.getBoundingClientRect())) continue;
      el.classList.add('is-echo');
      lit.push(el);
    }

    const links = [];
    for (const [w, a] of map[w0] || []) {
      if (used.has(w)) continue;
      const c = nearest(w, qx, qy);
      if (!c) continue;
      used.add(w);
      links.push({ w, a, ...c });
      if (links.length >= maxLines) break;
    }

    // A word the index does not know (a short word, a number, a name used once) or that has few neighbours on screen
    // attends to the words around it in its own sentence, nearer ones more strongly.
    if (links.length < Math.min(4, maxLines)) {
      const block = q.closest(CONTENT);
      const toks = block ? [...block.querySelectorAll('.w-tok')] : [];
      const qi = toks.indexOf(q);
      const cand = [];
      toks.forEach((t, i) => {
        const w = t.dataset.w;
        if (t === q || used.has(w) || GLUE.has(w) || w === w0) return;
        const r = t.getBoundingClientRect();
        if (!onScreen(r)) return;
        cand.push({ w, el: t, r, d: Math.abs(i - qi) });
      });
      cand.sort((A, B) => A.d - B.d);
      for (const c of cand) {
        if (links.length >= Math.min(4, maxLines) || used.has(c.w)) continue;
        used.add(c.w);
        links.push({ w: c.w, a: +(0.58 / (1 + c.d * 0.28)).toFixed(2), el: c.el, r: c.r });
      }
    }

    const amin = Math.min(...links.map((l) => l.a)), amax = Math.max(...links.map((l) => l.a));
    links.forEach((l, i) => {
      const t = amax > amin ? (l.a - amin) / (amax - amin) : 1;
      l.el.classList.add('is-k');
      l.el.style.setProperty('--a', (0.35 + 0.65 * t).toFixed(2));
      lit.push(l.el);
      const tx = l.r.left + l.r.width / 2, ty = l.r.top;
      arc(qx, qy, tx, ty, { width: 0.8 + 3.2 * t, opacity: 0.35 + 0.55 * t, delay: i * 40 });
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', String(tx + 4));
      label.setAttribute('y', String(ty - 6));
      label.textContent = l.a.toFixed(2);
      svg.append(label);
    });

    // second hop: where the strongest linked words look in turn
    let n2 = 0;
    for (const l of links.slice(0, hop2From)) {
      const hx = l.r.left + l.r.width / 2, hy = l.r.top;
      let k = 0;
      for (const [w2, a2] of map[l.w] || []) {
        if (used.has(w2)) continue;
        const c = nearest(w2, hx, hy);
        if (!c) continue;
        used.add(w2);
        c.el.classList.add('is-k2');
        lit.push(c.el);
        arc(hx, hy, c.r.left + c.r.width / 2, c.r.top, { width: 0.6 + 1.4 * a2, opacity: 0.3 + 0.35 * a2, delay: 220 + n2 * 35, second: true });
        n2++; k++;
        if (k >= 2 || n2 >= hop2Max) break;
      }
      if (n2 >= hop2Max) break;
    }

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(qx)); dot.setAttribute('cy', String(qy - 2)); dot.setAttribute('r', '3');
    svg.append(dot);
  }

  function hide() {
    active = null;
    svg.replaceChildren();
    for (const el of lit) { el.classList.remove('is-q', 'is-k', 'is-k2', 'is-echo'); el.style.removeProperty('--a'); }
    lit = [];
  }
}
