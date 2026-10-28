// The embedding map: ~400 real chunks of my work, laid out by a real t-SNE run that the visitor scrolls through
// (noise -> clusters), then queried with semantic search that is visible on the map.
// Data: /data/map.json (points, 30 layout keyframes, KL loss per epoch, clusters, keyword index, 5 projects)
//       /data/map-vectors.json (int8 vectors, loaded lazily for semantic search).
import { decodeVec, cosineInt8, placeLabels, stem } from './map-core.js';
import { checkOrigin } from './origin.js';

const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export async function initMap(root, { lowPower = false, reducedMotion = false } = {}) {
  if (!root) return null;
  checkOrigin();
  const stage = root.querySelector('.map-stage');
  const canvas = stage.querySelector('.map-canvas');
  const labelsEl = stage.querySelector('.map-labels');
  const hud = stage.querySelector('.map-hud');
  const legendEl = root.querySelector('.map-legend');
  const tip = stage.querySelector('.map-tip');
  const card = stage.querySelector('.map-card');
  const nodesEl = stage.querySelector('.map-nodes');
  const pin = root.closest('[data-map-pin]');
  const input = root.querySelector('.map-q');
  const form = root.querySelector('.map-ask');
  const statusEl = root.querySelector('[data-map-status]');
  const resultsEl = root.querySelector('[data-map-results]');
  const resultsHead = root.querySelector('[data-map-mode]');
  const g = canvas.getContext('2d');

  let data;
  try { data = (await window.__data?.map) || await (await fetch('/data/map.json')).json(); } catch { data = null; }
  if (!data) { stage.insertAdjacentHTML('beforeend', '<p class="map-error mono">The map data could not be loaded.</p>'); return null; }

  /* ---------- data ---------- */
  const N = data.points.length, K = data.kf.length;
  const KF = data.kf.map((a) => Float32Array.from(a, (v) => v / 1000));
  const FINAL = KF[K - 1];
  const P = data.points;
  const projIdx = data.projects.map((p) => p.i);
  const isProj = new Set(projIdx);
  const phone = matchMedia('(max-width: 700px)').matches || lowPower;
  // phones get fewer points (every project node stays)
  const vis = new Uint8Array(N).fill(1);
  if (phone) for (let i = 0; i < N; i++) if (!isProj.has(i) && i % 2 === 1) vis[i] = 0;

  /* ---------- state ---------- */
  let W = 0, H = 0, dpr = 1;
  let zoom = 1, panX = 0, panY = 0;
  let tp = 0;                 // training progress 0..1
  let tpForced = null;        // used by tests to freeze a state
  let trainedOnce = false;
  let hoverI = -1, selI = -1, focusC = -1;
  let Q = null;               // { text, pos:[x,y], hits:[{i, sim}], mode }
  let dim = 0, dimTarget = 0;
  let running = false, visible = false, viewVersion = 0, labelVersion = -1, labelsPlaced = false;
  const SP = new Float32Array(N * 2);   // screen position of every point, per frame
  const pos = new Float32Array(N * 2);  // map position of every point at the current training progress
  const colors = { m: [], ink: '#000', accent: '#c00', paper: '#fff', dark: false };
  const sprites = [];

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    colors.m = [0, 1, 2, 3, 4].map((k) => cs.getPropertyValue(`--m${k}`).trim() || '#888');
    colors.ink = cs.getPropertyValue('--ink').trim();
    colors.accent = cs.getPropertyValue('--accent').trim();
    colors.paper = cs.getPropertyValue('--paper').trim();
    colors.dark = document.documentElement.dataset.effectiveTheme === 'dark';
    sprites.length = 0;
    colors.m.forEach((c) => { const s = document.createElement('canvas'); s.width = s.height = 64; const x = s.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, c); gr.addColorStop(1, 'transparent'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); sprites.push(s); });
    legendEl.querySelectorAll('i').forEach((el, k) => { el.style.background = colors.m[k % 5]; });
    labelsEl.querySelectorAll('.map-label').forEach((el) => { el.style.setProperty('--c', colors.m[Number(el.dataset.c) % 5]); });
  }
  document.addEventListener('themechange', () => { readColors(); });

  /* ---------- geometry ---------- */
  const SX = () => W * 0.43 * zoom;
  const SY = () => H * 0.43 * zoom;
  const tx = (x) => W / 2 + panX + x * SX();
  const ty = (y) => H / 2 + panY + y * SY();

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(200, Math.round(r.width)); H = Math.max(200, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    glow.width = Math.ceil(W / 4); glow.height = Math.ceil(H / 4);
    labelsPlaced = false; viewVersion++;
    kick();
  }
  const glow = document.createElement('canvas');
  const gg = glow.getContext('2d');

  /* ---------- training progress ---------- */
  const pinned = () => !!pin && getComputedStyle(root).position === 'sticky';
  function scrollProgress() {
    if (!pin) return 1;
    const r = pin.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(root).top) || 0;
    const span = r.height - root.getBoundingClientRect().height;
    if (span <= 0) return 1;
    return clamp((top - r.top) / span, 0, 1);
  }
  let timeAnim = null;
  // Plays (or finishes) the training over `ms`, continuing from the current progress.
  function playTraining(ms) {
    if (timeAnim || trainedOnce) return;
    const t0 = performance.now(), p0 = tp;
    timeAnim = (now) => { const u = clamp((now - t0) / ms, 0, 1); tp = p0 + (1 - p0) * smooth(u); if (u >= 1) { timeAnim = null; trainedOnce = true; tp = 1; } };
    kick();
  }
  function driveTraining(now) {
    if (tpForced !== null) { tp = tpForced; return; }
    if (reducedMotion) { tp = 1; return; }
    if (pinned()) { tp = smooth(clamp(scrollProgress() / 0.85, 0, 1)); if (tp >= 1) trainedOnce = true; }
    else if (timeAnim) timeAnim(now);
    else if (trainedOnce) tp = 1;
  }

  function layoutAt(p) {
    const f = p * (K - 1), a = Math.min(K - 2, Math.floor(f)), t = smooth(f - a), A = KF[a], B = KF[a + 1];
    for (let i = 0; i < N * 2; i++) pos[i] = A[i] + (B[i] - A[i]) * t;
    const e0 = data.kfEpochs[a], e1 = data.kfEpochs[a + 1];
    const epoch = e0 + (e1 - e0) * t;
    return epoch;
  }

  /* ---------- drawing ---------- */
  function frame(now) {
    if (!running) return;
    driveTraining(now);
    const epoch = layoutAt(clamp(tp, 0, 1));
    // screen positions (with a little idle "breathing" once trained)
    const br = tp >= 0.999 && !reducedMotion ? 1 : 0;
    for (let i = 0; i < N; i++) {
      SP[i * 2] = tx(pos[i * 2]) + (br ? Math.sin(now * 0.0009 + i * 2.1) * 0.9 : 0);
      SP[i * 2 + 1] = ty(pos[i * 2 + 1]) + (br ? Math.cos(now * 0.0011 + i * 1.3) * 0.9 : 0);
    }
    dim += (dimTarget - dim) * (reducedMotion ? 1 : 0.18);
    if (Math.abs(dimTarget - dim) < 0.005) dim = dimTarget;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // soft glow behind each cluster (no outlines): coloured sprites on a quarter-resolution layer
    const glowAmt = smooth(clamp((tp - 0.3) / 0.6, 0, 1)) * (1 - dim * 0.7);
    if (glowAmt > 0.02) {
      gg.setTransform(1, 0, 0, 1, 0, 0);
      gg.clearRect(0, 0, glow.width, glow.height);
      gg.globalAlpha = 0.1 * glowAmt * (colors.dark ? 1.35 : 1);
      const R = (phone ? 34 : 46) * Math.sqrt(zoom);
      for (let i = 0; i < N; i++) { if (!vis[i]) continue; gg.drawImage(sprites[P[i].c % 5], SP[i * 2] / 4 - R / 4, SP[i * 2 + 1] / 4 - R / 4, R / 2, R / 2); }
      gg.globalAlpha = 1;
      g.imageSmoothingEnabled = true;
      g.drawImage(glow, 0, 0, W, H);
    }

    // query lines (behind the points); opacity = similarity
    if (Q && dim > 0.02) {
      const qx = tx(Q.pos[0]), qy = ty(Q.pos[1]);
      g.lineWidth = 1;
      for (const h of Q.hits) {
        g.strokeStyle = colors.accent; g.globalAlpha = clamp(h.sim, 0.12, 1) * dim * 0.9;
        g.beginPath(); g.moveTo(qx, qy); g.lineTo(SP[h.i * 2], SP[h.i * 2 + 1]); g.stroke();
      }
      g.globalAlpha = 1;
    }

    const hitSet = Q ? new Set(Q.hits.map((h) => h.i)) : null;
    const r0 = phone ? 2.1 : 2.5;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < N; i++) {
        if (!vis[i] || (pass === 0) === isProj.has(i)) continue;
        const x = SP[i * 2], y = SP[i * 2 + 1];
        if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
        let a = 0.88;
        if (hitSet) a = hitSet.has(i) ? 1 : 1 - dim * 0.85;
        if (focusC >= 0 && P[i].c !== focusC) a *= 0.22;
        const col = colors.m[P[i].c % 5];
        if (isProj.has(i)) {
          g.globalAlpha = a;
          if (colors.dark) { g.fillStyle = colors.accent; g.globalAlpha = a * 0.16; g.beginPath(); g.arc(x, y, 17, 0, 6.2832); g.fill(); g.globalAlpha = a; }
          g.fillStyle = colors.accent; g.beginPath(); g.arc(x, y, i === hoverI || i === selI ? 8.5 : 7, 0, 6.2832); g.fill();
          g.strokeStyle = colors.ink; g.lineWidth = 1.4; g.globalAlpha = a * 0.7; g.beginPath(); g.arc(x, y, 11, 0, 6.2832); g.stroke();
        } else {
          g.globalAlpha = a; g.fillStyle = col;
          g.beginPath(); g.arc(x, y, (i === hoverI || i === selI) ? r0 + 2 : hitSet && hitSet.has(i) ? r0 + 1.6 : r0, 0, 6.2832); g.fill();
        }
      }
    }
    g.globalAlpha = 1;

    // the query itself: a bright new point where it belongs in the space
    if (Q && dim > 0.02) {
      const qx = tx(Q.pos[0]), qy = ty(Q.pos[1]);
      const pulse = reducedMotion ? 0 : (Math.sin(now * 0.005) + 1) / 2;
      g.globalAlpha = dim; g.fillStyle = colors.accent; g.beginPath(); g.arc(qx, qy, 5.5, 0, 6.2832); g.fill();
      g.strokeStyle = colors.accent; g.lineWidth = 1.5; g.globalAlpha = dim * (0.7 - 0.5 * pulse); g.beginPath(); g.arc(qx, qy, 9 + pulse * 7, 0, 6.2832); g.stroke();
      g.globalAlpha = 1;
    }

    updateHud(epoch);
    updateLabels();
    updateNodes();
    if (cardFor >= 0) positionCard();
    if (visible && (tp < 1 || timeAnim || !reducedMotion || Math.abs(dimTarget - dim) > 0.005 || tpForced !== null)) requestAnimationFrame(frame); else running = false;
  }
  // Draws a frame soon. While the map is on screen the loop keeps running; off screen it draws once and stops.
  function kick() { if (running) return; running = true; requestAnimationFrame(frame); }

  /* ---------- HUD: epoch, real KL loss, loss curve ---------- */
  const lossMin = Math.min(...data.loss), lossMax = Math.max(...data.loss);
  const svgPts = [];
  for (let e = 0; e <= data.epochs; e += 3) svgPts.push(`${((e / data.epochs) * 116 + 2).toFixed(1)},${(34 - ((data.loss[e] - lossMin) / (lossMax - lossMin || 1)) * 30).toFixed(1)}`);
  hud.innerHTML = `<span class="hud-line"><b data-h-epoch>0</b> / ${data.epochs} epoch · KL <b data-h-kl>${data.loss[0].toFixed(2)}</b> → ${data.loss[data.epochs].toFixed(2)} · perplexity ${data.perplexity}</span>
    <svg viewBox="0 0 120 36" class="hud-curve" aria-hidden="true"><polyline class="hud-base" points="${svgPts.join(' ')}"/><polyline class="hud-draw" pathLength="1" points="${svgPts.join(' ')}"/><circle class="hud-dot" r="2.4" cx="2" cy="4"/></svg>`;
  const hE = hud.querySelector('[data-h-epoch]'), hK = hud.querySelector('[data-h-kl]'), hDraw = hud.querySelector('.hud-draw'), hDot = hud.querySelector('.hud-dot');
  let lastHud = -1;
  function updateHud(epoch) {
    const e = Math.round(epoch);
    if (e === lastHud) return;
    lastHud = e;
    hE.textContent = e;
    hK.textContent = data.loss[Math.min(data.epochs, e)].toFixed(2);
    hDraw.style.strokeDashoffset = String(1 - e / data.epochs);
    const li = Math.min(data.epochs, e);
    hDot.setAttribute('cx', ((li / data.epochs) * 116 + 2).toFixed(1));
    hDot.setAttribute('cy', (34 - ((data.loss[li] - lossMin) / (lossMax - lossMin || 1)) * 30).toFixed(1));
    stage.classList.toggle('is-trained', e >= data.epochs);
  }

  /* ---------- legend and cluster labels ---------- */
  legendEl.innerHTML = data.clusters.map((c) => `<li><button type="button" data-c="${c.id}"><i></i>${esc(c.name)} <b>${c.n}</b></button></li>`).join('');
  legendEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const c = Number(b.dataset.c);
    focusC = focusC === c ? -1 : c;
    legendEl.querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', Number(x.dataset.c) === focusC));
    kick();
  });
  labelsEl.innerHTML = data.clusters.map((c) => `<span class="map-label" data-c="${c.id}">${esc(c.name)}</span>`).join('');
  const labelEls = [...labelsEl.children];
  const labelPos = labelEls.map(() => ({ mx: 0, my: 0, hidden: true }));

  function placeAllLabels() {
    const info = data.clusters.map((c) => {
      const pts = []; for (let i = 0; i < N; i++) if (vis[i] && P[i].c === c.id) pts.push([FINAL[i * 2], FINAL[i * 2 + 1]]);
      const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
      const sc = pts.map((p) => Math.hypot((p[0] - cx) * SX(), (p[1] - cy) * SY())).sort((a, b) => a - b);
      const el = labelEls[c.id];
      return { cx: tx(cx), cy: ty(cy), r: sc[Math.floor(0.85 * (sc.length - 1))] || 30, w: el.offsetWidth + 10, h: el.offsetHeight + 6, priority: c.n };
    });
    const obstacles = projIdx.map((i) => ({ x: tx(FINAL[i * 2]), y: ty(FINAL[i * 2 + 1]), r: 13 }));
    // the HUD, zoom buttons and (on wide screens) the legend sit on top of the stage: labels keep clear of them
    const sr = stage.getBoundingClientRect();
    for (const el of [hud, stage.querySelector('.map-zoom'), getComputedStyle(legendEl).position === 'absolute' ? legendEl : null]) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      obstacles.push({ x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width + 16, h: r.height + 12 });
    }
    const all = []; for (let i = 0; i < N; i++) if (vis[i]) all.push({ x: tx(FINAL[i * 2]), y: ty(FINAL[i * 2 + 1]) });
    const out = placeLabels(info, obstacles, all, { w: W, h: H });
    out.forEach((o, k) => { labelPos[k] = { mx: (o.x - W / 2 - panX) / SX(), my: (o.y - H / 2 - panY) / SY(), hidden: o.hidden }; });
    labelsPlaced = true; labelVersion = viewVersion;
  }
  let placeTimer = 0;
  function updateLabels() {
    const on = tp >= 0.97;
    labelsEl.classList.toggle('on', on);
    if (!on) return;
    if (!labelsPlaced) placeAllLabels();
    labelEls.forEach((el, k) => {
      const lp = labelPos[k];
      el.classList.toggle('is-off', lp.hidden || (Q && dim > 0.5));
      el.style.transform = `translate(${tx(lp.mx).toFixed(1)}px, ${ty(lp.my).toFixed(1)}px) translate(-50%, -50%)`;
    });
  }
  // after a zoom or resize settles, find fresh label spots (labels must never overlap)
  function relayoutSoon() { clearTimeout(placeTimer); placeTimer = setTimeout(() => { labelsPlaced = false; kick(); }, 220); }

  /* ---------- project nodes: keyboard-reachable buttons + a clean card ---------- */
  nodesEl.innerHTML = data.projects.map((p, k) => `<button type="button" class="map-node" data-i="${p.i}" aria-label="Project: ${esc(p.name)}. Press Enter to open its model card."></button>`).join('');
  const nodeEls = [...nodesEl.children];
  function updateNodes() { nodeEls.forEach((el) => { const i = Number(el.dataset.i); el.style.transform = `translate(${SP[i * 2] - 16}px, ${SP[i * 2 + 1] - 16}px)`; }); }
  let cardFor = -1, cardHide = 0;
  function showCard(i) {
    clearTimeout(cardHide);
    const p = data.projects.find((x) => x.i === i);
    if (!p) return;
    cardFor = i;
    card.innerHTML = `<p class="mc-kicker mono">${esc(data.clusters[P[i].c % data.clusters.length].name)}</p><h3 class="mc-title">${esc(p.name)}</h3><p class="mc-text">${esc(P[i].s)}</p><a class="mc-link tok-link mono" href="#p-${esc(p.id)}">Open model card →</a>`;
    card.hidden = false;
    positionCard();
  }
  function positionCard() {
    const i = cardFor, x = SP[i * 2], y = SP[i * 2 + 1];
    const cw = card.offsetWidth || 260, ch = card.offsetHeight || 140;
    let left = x + 18, top = y - ch / 2;
    if (left + cw > W - 8) left = x - 18 - cw;
    card.style.transform = `translate(${clamp(left, 8, W - cw - 8)}px, ${clamp(top, 8, H - ch - 8)}px)`;
  }
  function hideCard(delay = 220) { clearTimeout(cardHide); cardHide = setTimeout(() => { if (!card.matches(':hover') && !card.contains(document.activeElement) && !nodeEls.includes(document.activeElement)) { card.hidden = true; cardFor = -1; selI = -1; kick(); } }, delay); }
  card.addEventListener('pointerleave', () => hideCard(160));
  nodeEls.forEach((el) => {
    const i = Number(el.dataset.i);
    el.addEventListener('focus', () => { selI = i; showCard(i); kick(); });
    el.addEventListener('blur', () => hideCard(250));
    el.addEventListener('click', () => openTarget(P[i].u));
  });

  function openTarget(u) {
    if (!u) return;
    if (u.startsWith('#')) {
      document.querySelector(u)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      // keep the path (/ip=...) and any query in the address bar: only the hash changes
      history.replaceState(null, '', location.pathname + location.search + u);
    } else window.open(u, '_blank', 'noopener');
  }

  /* ---------- hover tooltip ---------- */
  // The closest visible point within `max` px (project nodes get a bigger hit area).
  function nearest(mx, my, max) {
    let best = -1, bd = Infinity;
    for (let i = 0; i < N; i++) {
      if (!vis[i]) continue;
      const dx = SP[i * 2] - mx, dy = SP[i * 2 + 1] - my, d = dx * dx + dy * dy, lim = isProj.has(i) ? (max + 6) ** 2 : max * max;
      if (d < lim && d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function showTip(i, mx, my) {
    const p = P[i];
    tip.innerHTML = `<b>${esc(p.t)}</b><span>${esc(p.s)}</span><small>${esc(p.src)}</small>`;
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.transform = `translate(${clamp(mx + 14, 6, W - tw - 6)}px, ${clamp(my + 16, 6, H - th - 6)}px)`;
  }
  let dragging = false, moved = 0, last = null;
  const pointers = new Map();
  let pinch = null;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch); }
      pinch = d; moved = 99; return;
    }
    if (dragging && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 4) { panX += dx; panY += dy; viewVersion++; last = { x: e.clientX, y: e.clientY }; tip.hidden = true; kick(); relayoutSoon(); }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const i = nearest(mx, my, 9);
    if (i !== hoverI) { hoverI = i; kick(); }
    if (i < 0) { tip.hidden = true; if (cardFor >= 0 && document.activeElement && !nodeEls.includes(document.activeElement)) hideCard(); stage.style.cursor = ''; return; }
    stage.style.cursor = 'pointer';
    if (isProj.has(i)) { tip.hidden = true; showCard(i); } else { showTip(i, mx, my); }
  });
  stage.addEventListener('pointerleave', () => { hoverI = -1; tip.hidden = true; hideCard(); kick(); });
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.map-card, .map-zoom, .map-legend, .map-node')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragging = pointers.size === 1; moved = 0; last = { x: e.clientX, y: e.clientY }; pinch = null;
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });
  const endPtr = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { dragging = false; last = null; } };
  stage.addEventListener('pointerup', (e) => {
    const wasTap = moved <= 4 && pointers.size <= 1;
    endPtr(e);
    if (!wasTap) return;
    const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    const i = nearest(mx, my, e.pointerType === 'mouse' ? 9 : 16);
    if (i < 0) { tip.hidden = true; hideCard(0); return; }
    if (isProj.has(i)) { if (e.pointerType === 'mouse') openTarget(P[i].u); else { selI = i; showCard(i); kick(); } }
    else if (e.pointerType !== 'mouse') { selI = i; showTip(i, mx, my); kick(); }
    else if (P[i].u) openTarget(P[i].u);
  });
  stage.addEventListener('pointercancel', endPtr);
  stage.addEventListener('dblclick', () => resetView());

  // zoom: Ctrl/Cmd + wheel (and trackpad pinch), touch pinch, and buttons. A plain wheel always scrolls the page.
  function zoomAt(mx, my, factor) {
    const nz = clamp(zoom * factor, 0.6, 4), k = nz / zoom;
    panX = (mx - W / 2) - ((mx - W / 2) - panX) * k; panY = (my - H / 2) - ((my - H / 2) - panY) * k;
    zoom = nz; viewVersion++; kick(); relayoutSoon();
  }
  function resetView() { zoom = 1; panX = 0; panY = 0; viewVersion++; kick(); relayoutSoon(); }
  stage.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.002)); // gentle: a mouse notch is ~20%, a trackpad pinch is smooth
  }, { passive: false });
  stage.querySelector('.map-zoom').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.z === 'in') zoomAt(W / 2, H / 2, 1.35); else if (b.dataset.z === 'out') zoomAt(W / 2, H / 2, 1 / 1.35); else resetView();
  });

  /* ---------- ask the map: semantic search you can see ---------- */
  let extractor = null, vectors = null, modelP = null, modelState = 'idle';
  const inv = data.inv;
  const idf = (s) => Math.log(1 + N / ((inv[s] || []).length || 1));
  // the same stemmer the build used (map-core.js), so query words meet the keyword index
  function tokens(q) { return q.toLowerCase().match(/[a-z][a-z0-9+#-]*[a-z0-9+#]|[a-z]/g)?.map((w) => stem(w)).filter((w) => w.length > 1) || []; }
  const STOPQ = new Set('the and for with from that this what how who why can you about show find tell me ask of in on to is are a an'.split(' '));

  function keywordSearch(q) {
    const ts = tokens(q).filter((t) => !STOPQ.has(t));
    const score = new Map();
    let maxS = 0;
    for (const t of new Set(ts)) { const w = idf(t); maxS += w; for (const i of inv[t] || []) score.set(i, (score.get(i) || 0) + w); }
    if (!maxS) return [];
    return [...score].map(([i, s]) => ({ i, sim: s / maxS })).sort((a, b) => b.sim - a.sim || (isProj.has(b.i) - isProj.has(a.i))).slice(0, 5);
  }
  function status(t) { statusEl.textContent = t; }
  function ensureModel() {
    if (modelP) return modelP;
    modelState = 'loading'; status('loading semantic model…');
    modelP = (async () => {
      try {
        const [vj, tf] = await Promise.all([fetch('/data/map-vectors.json').then((r) => r.json()), import(/* @vite-ignore */ TRANSFORMERS)]);
        vectors = vj.v.map(decodeVec);
        tf.env.allowLocalModels = false;
        extractor = await tf.pipeline('feature-extraction', data.model, { dtype: 'q8', progress_callback: (p) => { if (p.status === 'progress' && p.progress != null) status(`loading semantic model… ${Math.round(p.progress)}%`); } });
        modelState = 'ready'; status('semantic search on');
        if (lastQ) ask(lastQ, true); // redo the last question with real semantics
        return true;
      } catch { modelState = 'failed'; status('keyword search (semantic model unavailable)'); return false; }
    })();
    return modelP;
  }
  async function semanticSearch(q) {
    const t = await extractor([q], { pooling: 'mean', normalize: true });
    const f = t.data;
    const sims = vectors.map((v, i) => ({ i, sim: cosineInt8(f, v) }));
    sims.sort((a, b) => b.sim - a.sim);
    return sims.slice(0, 5);
  }

  let askToken = 0, lastQ = '';
  async function ask(text, fromModel = false) {
    const q = text.trim();
    if (!q) return clearQuery();
    lastQ = q;
    const my = ++askToken;
    let hits = keywordSearch(q), mode = 'keyword';
    if (extractor) { try { hits = await semanticSearch(q); mode = 'semantic'; } catch { /* keep keyword */ } }
    else if (!fromModel) { ensureModel(); }
    if (my !== askToken) return;
    showResults(q, hits, mode);
    if (!hits.length) { Q = null; dimTarget = 0; kick(); return; }
    // the query lands where it belongs: weighted average of its nearest neighbours' positions in the trained space
    let wx = 0, wy = 0, ws = 0;
    for (const h of hits) { const w = Math.max(0, h.sim) ** 3 + 1e-6; wx += FINAL[h.i * 2] * w; wy += FINAL[h.i * 2 + 1] * w; ws += w; }
    Q = { text: q, pos: [wx / ws, wy / ws], hits, mode };
    dimTarget = 1;
    if (tp < 0.999 && tpForced === null) {
      // finish training first so the query lands in the trained space
      if (pinned() && pin) { const end = pin.getBoundingClientRect().bottom + scrollY - innerHeight; scrollTo({ top: end, behavior: reducedMotion ? 'auto' : 'smooth' }); }
      else playTraining(700);
    }
    kick();
  }
  function showResults(q, hits, mode) {
    resultsHead.textContent = hits.length ? (mode === 'semantic' ? 'Top matches · semantic similarity' : 'Top matches · keyword match (semantic model loading…)') : 'No match';
    if (!hits.length) { resultsEl.innerHTML = `<li class="mr-empty">Nothing close to “${esc(q)}”. Try other words, like “computer vision” or “agents”.</li>`; return; }
    resultsEl.innerHTML = hits.map((h) => {
      const p = P[h.i];
      return `<li><a href="${esc(p.u)}" data-i="${h.i}"><span class="mr-score mono">${h.sim.toFixed(2)}</span><span class="mr-body"><b>${esc(p.t)}</b><span>${esc(p.s)}</span><small class="mono">${esc(p.src)}</small></span></a></li>`;
    }).join('');
  }
  function clearQuery() {
    askToken++; Q = null; lastQ = ''; dimTarget = 0; input.value = '';
    resultsEl.innerHTML = '<li class="mr-empty">Ask the map something and the closest passages appear here, with their similarity.</li>';
    resultsHead.textContent = 'Top matches';
    kick();
  }
  resultsEl.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); openTarget(a.getAttribute('href'));
  });
  resultsEl.addEventListener('pointerover', (e) => { const a = e.target.closest('a'); const i = a ? Number(a.dataset.i) : -1; if (i !== hoverI) { hoverI = i; kick(); } });
  resultsEl.addEventListener('pointerleave', () => { hoverI = -1; kick(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('focus', () => { if (!phone) ensureModel(); });
  root.querySelector('.map-chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; input.value = b.dataset.q; ask(b.dataset.q); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { clearQuery(); card.hidden = true; cardFor = -1; selI = -1; } });
  clearQuery();

  /* ---------- lifecycle ---------- */
  readColors();
  new ResizeObserver(() => resize()).observe(stage);
  resize();
  new IntersectionObserver((entries) => {
    const en = entries[0];
    visible = en.isIntersecting;
    if (visible) {
      if (!pinned() && !reducedMotion && !trainedOnce && !timeAnim) playTraining(phone ? 2000 : 2800);
      kick();
    }
  }, { threshold: [0, 0.35] }).observe(stage);
  addEventListener('scroll', () => { if (visible) kick(); }, { passive: true });
  if (reducedMotion) { tp = 1; trainedOnce = true; }

  // small hook so the states can be inspected and frozen (used for screenshots and tests)
  const api = {
    ask, clear: clearQuery,
    freeze(p) { tpForced = p; kick(); },
    unfreeze() { tpForced = null; kick(); },
    state() {
      return { tp, N, visible: vis.reduce((a, b) => a + b, 0), epoch: lastHud, pinned: pinned(), zoom, query: Q && { text: Q.text, mode: Q.mode, hits: Q.hits.map((h) => ({ title: P[h.i].t, src: P[h.i].src, sim: +h.sim.toFixed(3) })) }, model: modelState,
        labels: labelEls.map((el, k) => { const r = el.getBoundingClientRect(); return { text: el.textContent, hidden: labelPos[k].hidden, x: r.x, y: r.y, w: r.width, h: r.height }; }),
        projects: data.projects.map((p) => ({ name: p.name, x: SP[p.i * 2], y: SP[p.i * 2 + 1] })) };
    },
    ensureModel,
  };
  window.__map = api;
  return api;
}
