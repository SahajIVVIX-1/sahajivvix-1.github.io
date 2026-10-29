// Attention on hover: resting the cursor on a word draws curved lines to the most related
// words currently on screen. Relatedness comes from data/attention.json (MiniLM cosine,
// blended with sentence co-occurrence, computed at build time). Line width ∝ attention weight.
const NS = 'http://www.w3.org/2000/svg';

export async function initAttention({ lowPower = false } = {}) {
  const svg = document.querySelector('[data-attn-layer]');
  if (!svg) return;
  let map;
  // The boot screen may already have fetched this file; fall back to fetching it here.
  try { map = (await window.__data?.attention) || await (await fetch('/data/attention.json')).json(); } catch { return; }

  const keys = new Set(Object.keys(map));
  const targets = new Set(Object.values(map).flat().map(([w]) => w));
  const byWord = new Map();
  const maxLines = lowPower ? 3 : 6;

  for (const region of document.querySelectorAll('[data-attend]')) wrapRegion(region);
  document.addEventListener('gen:text-done', (e) => { const r = e.detail.el.closest('[data-attend]'); if (r) wrapRegion(r); });

  function wrapRegion(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      // .gt pieces are parts of words still being generated; they are wrapped once the block is plain text again
      acceptNode: (n) => (n.parentElement.closest('a, button, .w-tok, .gt, script, style') || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const re = /[A-Za-z][A-Za-z0-9+#.-]*[A-Za-z0-9+#]|[A-Za-z]/g;
      let m, last = 0, frag = null;
      while ((m = re.exec(text))) {
        const w = m[0].toLowerCase();
        if (!keys.has(w) && !targets.has(w)) continue;
        frag ||= document.createDocumentFragment();
        frag.append(text.slice(last, m.index));
        const span = document.createElement('span');
        span.className = 'w-tok' + (keys.has(w) ? ' has-attn' : '');
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

  let timer = 0, active = null, lit = [];

  document.addEventListener('pointerover', (e) => {
    const tok = e.target.closest?.('.w-tok.has-attn');
    // the Lens draws its own lines while it is on
    if (!tok || tok === active || document.documentElement.classList.contains('lens-on')) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(tok), 110); // a short dwell so a passing cursor does not spray lines
  });
  document.addEventListener('pointerout', (e) => {
    const tok = e.target.closest?.('.w-tok.has-attn');
    if (tok && !tok.contains(e.relatedTarget)) { clearTimeout(timer); hide(); }
  });
  addEventListener('scroll', hide, { passive: true });
  addEventListener('resize', hide);

  function show(q) {
    hide();
    active = q;
    q.classList.add('is-q');
    lit.push(q);
    const qr = q.getBoundingClientRect();
    const qx = qr.left + qr.width / 2, qy = qr.top;
    const vh = innerHeight, vw = innerWidth;

    const links = [];
    for (const [w, a] of map[q.dataset.w]) {
      const cands = (byWord.get(w) || []).map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.bottom > 60 && r.top < vh - 10 && r.right > 0 && r.left < vw && r.width > 0);
      if (!cands.length) continue;
      cands.sort((A, B) => Math.hypot(A.r.left - qx, A.r.top - qy) - Math.hypot(B.r.left - qx, B.r.top - qy));
      links.push({ w, a, ...cands[0] });
      if (links.length >= maxLines) break;
    }

    const amin = Math.min(...links.map((l) => l.a)), amax = Math.max(...links.map((l) => l.a));
    links.forEach((l, i) => {
      const t = amax > amin ? (l.a - amin) / (amax - amin) : 1;
      l.el.classList.add('is-k');
      l.el.style.setProperty('--a', (0.35 + 0.65 * t).toFixed(2));
      lit.push(l.el);
      const tx = l.r.left + l.r.width / 2, ty = l.r.top;
      const dx = tx - qx, dy = ty - qy, dist = Math.hypot(dx, dy);
      // Arc above both words; longer links arc higher, like attention arcs in BertViz.
      const lift = Math.min(160, 24 + dist * 0.28);
      const cx = (qx + tx) / 2, cy = Math.min(qy, ty) - lift;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${qx},${qy - 2} Q${cx},${cy} ${tx},${ty - 2}`);
      path.setAttribute('stroke-width', (0.8 + 3.2 * t).toFixed(2));
      path.style.setProperty('--len', String(Math.ceil(dist * 1.4 + lift)));
      path.style.animationDelay = `${i * 40}ms`;
      path.classList.add('draw');
      path.style.opacity = (0.35 + 0.55 * t).toFixed(2);
      svg.append(path);
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', String(tx + 4));
      label.setAttribute('y', String(ty - 6));
      label.textContent = l.a.toFixed(2);
      svg.append(label);
    });
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(qx)); dot.setAttribute('cy', String(qy - 2)); dot.setAttribute('r', '3');
    svg.append(dot);
  }

  function hide() {
    active = null;
    svg.replaceChildren();
    for (const el of lit) { el.classList.remove('is-q', 'is-k'); el.style.removeProperty('--a'); }
    lit = [];
  }
}
