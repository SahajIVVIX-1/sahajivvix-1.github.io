// The portrait as flip tiles. A canvas over the real <img> (which keeps its alt text) splits the photo into square
// tiles. On first appearance every tile flips 180° from a dark back to its piece of the photo, in a wave that starts
// at the face (~1.2 s). Idle: now and then a small cluster away from the face turns 90–180° and back (never more than
// ~5% of tiles at once). Hover: tiles near the cursor tilt toward it (max 20°) and settle when it leaves.
// Rendering is at devicePixelRatio with tile edges rounded to whole device pixels, and a settled frame is drawn as
// the whole photo in one piece, so there are no seams. Paused off-screen and in hidden tabs; reduced motion keeps
// the plain photo.
const FACE = [0.5, 0.33];           // where the wave starts (fraction of the frame)
const FLIP_MS = 420, WAVE_MS = 780;  // per-tile flip, and the spread of start times across the frame
const TILT = 20 * Math.PI / 180;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function initTiles({ reducedMotion = false, lowPower = false } = {}) {
  const frame = document.querySelector('[data-tiles]');
  if (!frame) return;
  const img = frame.querySelector('img');
  if (reducedMotion || !img) { frame.classList.add('tiles-off'); return; }
  const cv = document.createElement('canvas');
  cv.className = 'tiles-cv';
  cv.setAttribute('aria-hidden', 'true');
  frame.append(cv);
  const g = cv.getContext('2d');
  const photo = document.createElement('canvas');
  const pg = photo.getContext('2d');

  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, xs = [], ys = [], tiles = [];
  let back = '#16140F', revealed = false, revealT0 = 0, visible = false, raf = 0, idleTimer = 0, ready = false;
  let pointer = null;

  // the dark back of every tile: near-black ink on paper, a deeper navy on the dark theme
  const readBack = () => { back = document.documentElement.dataset.effectiveTheme === 'dark' ? '#05070F' : '#1E1B15'; };

  function layout() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
    cv.width = photo.width = W; cv.height = photo.height = H;
    cols = Math.max(16, Math.min(36, Math.round(r.width / (lowPower ? 16 : 10))));
    rows = Math.max(1, Math.round(cols * r.height / r.width));
    xs = Array.from({ length: cols + 1 }, (_, i) => Math.round(i * W / cols));
    ys = Array.from({ length: rows + 1 }, (_, j) => Math.round(j * H / rows));
    // the photo, cropped like the <img> (object-fit: cover; object-position: 50% 38%) and with its CSS filter
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    pg.filter = 'grayscale(.12) contrast(1.02)';
    pg.drawImage(img, (W - dw) * 0.5, (H - dh) * 0.38, dw, dh);
    const old = tiles;
    tiles = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) / cols, cy = (j + 0.5) / rows;
      const d = Math.hypot(cx - FACE[0], (cy - FACE[1]) * (H / W));
      tiles.push({ i, j, cx, cy, d, a: revealed ? 0 : Math.PI, axis: (i + j) % 2, from: Math.PI, delay: 0, t0: -1, dur: 0, peak: 0, tx: 0, ty: 0, kx: 0, ky: 0 });
    }
    const maxD = Math.max(...tiles.map((t) => t.d)) || 1;
    tiles.forEach((t) => { t.delay = (t.d / maxD) * WAVE_MS; });
    void old;
    return true;
  }

  const settled = () => revealed && tiles.every((t) => t.t0 < 0 && t.a === 0 && Math.abs(t.kx) < 0.002 && Math.abs(t.ky) < 0.002);

  function draw() {
    g.clearRect(0, 0, W, H);
    if (settled()) { g.drawImage(photo, 0, 0); return; }
    for (const t of tiles) {
      const x0 = xs[t.i], x1 = xs[t.i + 1], y0 = ys[t.j], y1 = ys[t.j + 1], w = x1 - x0, h = y1 - y0;
      // flip angle a (0 = photo facing out, π = dark back) plus the hover tilt on both axes
      const c = Math.cos(t.a);
      let sx = Math.cos(t.ky), sy = Math.cos(t.kx);
      if (t.axis) sx *= Math.abs(c); else sy *= Math.abs(c);
      const dw = w * sx, dh = h * sy, dx = x0 + (w - dw) / 2, dy = y0 + (h - dh) / 2;
      if (c >= 0) g.drawImage(photo, x0, y0, w, h, dx, dy, dw, dh);
      else { g.fillStyle = back; g.fillRect(dx, dy, dw, dh); }
      const shade = 0.42 * (1 - Math.abs(c)) + 0.5 * (Math.abs(t.kx) + Math.abs(t.ky)) / TILT * 0.18;
      if (shade > 0.01) { g.fillStyle = `rgba(0,0,0,${Math.min(0.5, shade).toFixed(3)})`; g.fillRect(dx, dy, dw, dh); }
    }
  }

  function step(now) {
    raf = 0;
    let moving = false;
    for (const t of tiles) {
      if (!revealed || t.t0 >= 0) {
        const start = t.t0 >= 0 ? t.t0 : revealT0 + t.delay;
        const u = Math.min(1, Math.max(0, (now - start) / (t.t0 >= 0 ? t.dur : FLIP_MS)));
        if (t.t0 >= 0) { t.a = t.peak * Math.sin(Math.PI * ease(u)); if (u >= 1) { t.t0 = -1; t.a = 0; } }
        else t.a = Math.PI * (1 - ease(u));
        if (u < 1) moving = true;
      }
      // hover tilt toward the cursor, eased
      let gx = 0, gy = 0;
      if (pointer) {
        const ddx = pointer[0] - t.cx, ddy = (pointer[1] - t.cy) * (H / W), d = Math.hypot(ddx, ddy), R = 3.2 / cols;
        if (d < R) { const k = (1 - d / R) * TILT; gx = -Math.sign(ddy) * k * Math.min(1, Math.abs(ddy) / (R * 0.5)); gy = Math.sign(ddx) * k * Math.min(1, Math.abs(ddx) / (R * 0.5)); }
      }
      t.kx += (gx - t.kx) * 0.18; t.ky += (gy - t.ky) * 0.18;
      if (Math.abs(gx - t.kx) > 0.002 || Math.abs(gy - t.ky) > 0.002) moving = true; else { t.kx = gx; t.ky = gy; }
    }
    if (!revealed && now - revealT0 > WAVE_MS + FLIP_MS) { revealed = true; tiles.forEach((t) => { t.a = 0; }); frame.classList.add('tiles-revealed'); }
    draw();
    if ((moving || !revealed || pointer) && visible && !document.hidden) raf = requestAnimationFrame(step);
  }
  const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(step); };

  // a small random cluster away from the face turns over and back
  function idle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (visible && !document.hidden && revealed && !pointer) {
        const far = tiles.filter((t) => t.d > 0.32);
        const c = far[Math.floor(Math.random() * far.length)];
        const max = Math.max(1, Math.floor(tiles.length * 0.05));
        const r = 1.6 / cols;
        const group = far.filter((t) => Math.hypot(t.cx - c.cx, (t.cy - c.cy) * (H / W)) < r).slice(0, max);
        const now = performance.now();
        group.forEach((t, k) => { t.t0 = now + k * 40; t.dur = 1100; t.peak = (Math.PI / 2) * (1 + Math.random()); });
        kick();
      }
      idle();
    }, 2600 + Math.random() * 2600);
  }

  async function start() {
    try { await img.decode(); } catch { /* fall back to the plain photo below */ }
    if (!layout()) { frame.classList.add('tiles-off'); return; }
    readBack();
    ready = true;
    frame.classList.add('tiles-on');
    draw();
    if (visible) { revealT0 = performance.now() + 120; kick(); }
    idle();
  }

  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && ready && !revealed && !revealT0) revealT0 = performance.now() + 120;
    if (visible) kick();
  }, { threshold: 0.25 }).observe(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  document.addEventListener('themechange', () => { readBack(); kick(); });
  new ResizeObserver(() => { if (ready && layout()) { draw(); kick(); } }).observe(frame);
  frame.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const r = frame.getBoundingClientRect(); pointer = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; kick(); });
  frame.addEventListener('pointerleave', () => { pointer = null; kick(); });
  // image may be lazy: start once it is loaded
  if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start, { once: true });
}
