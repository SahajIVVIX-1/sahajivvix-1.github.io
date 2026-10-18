// A slow, faint "CNN is looking at this photo" loop on the portrait.
// A canvas sits on top of the real <img> (the photo stays the source of truth) and cycles through three views of
// the same picture, each revealed by a scan line like a kernel sliding down the image:
//   conv1 edges (Sobel, glowing in the accent colour), conv3 feature tiles (a 4x4 grid of pooled activations),
//   and a Grad-CAM style attention heatmap over the face.
// The overlay never goes above 35% opacity and the clean photo is shown more than half the time. Hovering freezes
// it on the clean photo. It pauses off-screen and in hidden tabs, and reduced motion shows only the clean photo.

const W = 240, H = 300; // internal resolution of the maps (the frame is 4:5)
const MAX_OPACITY = 0.35;
// seconds: [clean gap before, scan, hold, fade out] per layer; the clean photo is on screen 8 of every 15.2 s
const LAYERS = [
  { id: 'edges', gap: 4, scan: 1.0, hold: 0.9, out: 0.5, caption: 'conv1 · 64 filters · edges' },
  { id: 'tiles', gap: 2, scan: 1.0, hold: 0.9, out: 0.5, caption: 'conv3 · 256 maps' },
  { id: 'cam', gap: 2, scan: 1.0, hold: 0.9, out: 0.5, caption: 'grad-cam · class: sahaj · p=0.99' },
];
const CYCLE = LAYERS.reduce((n, l) => n + l.gap + l.scan + l.hold + l.out, 0);

export function initCnn({ reducedMotion = false } = {}) {
  const frame = document.querySelector('[data-cnn]');
  if (!frame || reducedMotion) return;
  const img = frame.querySelector('img');
  const cv = frame.querySelector('[data-cnn-cv]');
  const cap = document.querySelector('[data-cnn-cap]');
  if (!img || !cv || !cap) return;
  const base = cap.textContent;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  let maps = null;
  let visible = false, hovering = false, hiddenTab = document.hidden, started = false, raf = 0, last = 0, t = 0;
  let layerShown = null;

  const afterPortrait = () => new Promise((res) => {
    // On a first visit the portrait is denoised first (generate.js); the CNN loop starts once that has finished.
    if (document.documentElement.classList.contains('gen') && !window.__portraitReady) document.addEventListener('portrait:ready', res, { once: true });
    else res();
  });

  async function build() {
    try { await img.decode(); } catch { /* a broken image just means no overlay */ }
    if (!img.naturalWidth) return;
    maps = computeMaps(img, getAccent());
  }

  const run = () => { const on = visible && !hovering && !hiddenTab && maps; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(frameTick); } };

  function frameTick(now) {
    raf = 0;
    if (!(visible && !hovering && !hiddenTab)) return;
    t = (t + Math.min(0.1, (now - last) / 1000)) % CYCLE;
    last = now;
    draw(t);
    raf = requestAnimationFrame(frameTick);
  }

  function draw(time) {
    // which layer, and where in its timeline?
    let acc = 0, layer = null, local = 0;
    for (const l of LAYERS) {
      const len = l.gap + l.scan + l.hold + l.out;
      if (time < acc + len) { layer = l; local = time - acc - l.gap; break; }
      acc += len;
    }
    if (!layer || local < 0) { setIdle(); return; }
    if (layerShown !== layer.id) { layerShown = layer.id; cap.textContent = layer.caption; }
    const s = Math.min(1, local / layer.scan);
    let alpha = 1;
    if (local < 0.25) alpha = local / 0.25;
    else if (local > layer.scan + layer.hold) alpha = Math.max(0, 1 - (local - layer.scan - layer.hold) / layer.out);
    cv.style.opacity = String((alpha * MAX_OPACITY).toFixed(3));
    ctx.clearRect(0, 0, W, H);
    const y = Math.round(s * H);
    if (y > 0) ctx.drawImage(maps[layer.id], 0, 0, W, y, 0, 0, W, y);
    if (s < 1) { // the scan line: a thin bright line with a soft trail behind it
      const g = ctx.createLinearGradient(0, y - 26, 0, y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, maps.accentSoft);
      ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, y - 26), W, Math.min(26, y));
      ctx.fillStyle = maps.accent; ctx.fillRect(0, Math.min(H - 1, y), W, 1.5);
    }
  }

  function setIdle() {
    if (layerShown !== null) { layerShown = null; cap.textContent = base; }
    cv.style.opacity = '0';
  }

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) run(); }, { threshold: 0.2 }).observe(frame);
  document.addEventListener('visibilitychange', () => { hiddenTab = document.hidden; if (!hiddenTab) run(); });
  // hovering freezes the clean photo (and restarts the cycle from its clean beginning on leave)
  frame.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; hovering = true; setIdle(); t = 0; });
  frame.addEventListener('pointerleave', () => { hovering = false; run(); });
  document.addEventListener('themechange', () => { if (maps) maps = computeMaps(img, getAccent()); });

  (async () => {
    await afterPortrait();
    await build();
    started = true;
    run();
  })();
  void started;
}

function getAccent() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a5b';
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = v; c.fillRect(0, 0, 1, 1);
  const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

function computeMaps(img, accent) {
  const [ar, ag, ab] = accent;
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  const sc = src.getContext('2d', { willReadFrequently: true });
  // object-fit: cover (the photo is already 4:5, so this is a straight fit)
  const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  sc.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const px = sc.getImageData(0, 0, W, H).data;
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;

  // conv1: Sobel gradient magnitude
  const mag = new Float32Array(W * H);
  let max = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const gx = -gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1] + gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1];
    const gy = -gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1] + gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1];
    const m = Math.hypot(gx, gy);
    mag[i] = m; if (m > max) max = m;
  }
  const edges = document.createElement('canvas'); edges.width = W; edges.height = H;
  const ec = edges.getContext('2d');
  const ed = ec.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    const v = Math.min(1, (mag[i] / (max * 0.45)) ** 0.9);
    ed.data[i * 4] = ar; ed.data[i * 4 + 1] = ag; ed.data[i * 4 + 2] = ab; ed.data[i * 4 + 3] = Math.round(v * 255);
  }
  ec.putImageData(ed, 0, 0);

  // conv3: a 4x4 grid of tiny activation tiles (each a pooled, pixelated feature map of its patch)
  const tiles = document.createElement('canvas'); tiles.width = W; tiles.height = H;
  const tc = tiles.getContext('2d');
  const GX = 4, GY = 4, gap = 3;
  const tw = (W - gap * (GX + 1)) / GX, th = (H - gap * (GY + 1)) / GY;
  const CX = 10, CY = 12; // cells per tile
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const x0 = gap + i * (tw + gap), y0 = gap + j * (th + gap);
    tc.fillStyle = 'rgba(0,0,0,.45)'; tc.fillRect(x0, y0, tw, th);
    const cw = tw / CX, ch = th / CY;
    // each tile uses a different filter flavour so they do not all look alike
    const flavour = (i + j * GX) % 4;
    for (let cy = 0; cy < CY; cy++) for (let cx = 0; cx < CX; cx++) {
      let sum = 0, n = 0;
      const sx = Math.floor(x0 + cx * cw), sy = Math.floor(y0 + cy * ch);
      for (let yy = sy; yy < Math.min(H, sy + Math.ceil(ch)); yy++) for (let xx = sx; xx < Math.min(W, sx + Math.ceil(cw)); xx++) {
        const idx = yy * W + xx;
        sum += flavour === 0 ? mag[idx] / max : flavour === 1 ? gray[idx] : flavour === 2 ? 1 - gray[idx] : Math.abs(gray[idx] - 0.5) * 2;
        n++;
      }
      const v = Math.min(1, (n ? sum / n : 0) * (flavour === 0 ? 2.2 : 1));
      tc.fillStyle = `rgba(${ar},${ag},${ab},${(0.1 + v * 0.9).toFixed(3)})`;
      tc.fillRect(x0 + cx * cw, y0 + cy * ch, Math.ceil(cw), Math.ceil(ch));
    }
  }

  // Grad-CAM: a coarse map (so it upsamples into soft blobs) centred on the face, with the eyes and mouth hot
  const gw = 15, gh = 19;
  const cam = document.createElement('canvas'); cam.width = gw; cam.height = gh;
  const cc = cam.getContext('2d');
  const cd = cc.createImageData(gw, gh);
  const blobs = [[0.5, 0.4, 0.2, 0.17, 0.85], [0.42, 0.37, 0.07, 0.05, 0.7], [0.6, 0.37, 0.07, 0.05, 0.7], [0.5, 0.5, 0.09, 0.05, 0.6]];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const u = (x + 0.5) / gw, v = (y + 0.5) / gh;
    let a = 0;
    for (const [bx, by, sx, sy, amp] of blobs) a += amp * Math.exp(-(((u - bx) / sx) ** 2 + ((v - by) / sy) ** 2) / 2);
    a = Math.min(1, a);
    // warm colour map: dark accent -> accent -> amber
    const r = Math.round(ar * (0.6 + 0.4 * a) + (255 - ar) * a * a * 0.6);
    const g = Math.round(ag * (0.5 + 0.5 * a) + (210 - ag) * a * a * 0.6);
    const b = Math.round(ab * (0.5 + 0.5 * a) * (1 - a * 0.4));
    const i = (y * gw + x) * 4;
    cd.data[i] = r; cd.data[i + 1] = g; cd.data[i + 2] = b; cd.data[i + 3] = Math.round(Math.min(1, a * 1.15) ** 1.2 * 255);
  }
  cc.putImageData(cd, 0, 0);
  const camFull = document.createElement('canvas'); camFull.width = W; camFull.height = H;
  const fc = camFull.getContext('2d');
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high';
  fc.drawImage(cam, 0, 0, W, H);

  return { edges, tiles, cam: camFull, accent: `rgb(${ar},${ag},${ab})`, accentSoft: `rgba(${ar},${ag},${ab},.35)` };
}
