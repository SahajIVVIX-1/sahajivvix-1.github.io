// The About photo as an animated card (from Sahaj's profile-hero kit, fitted to this site).
// The HTML already holds a complete still card (scripts/build.mjs, content/profile-card.json): the colour photo, the
// status pill, the first six skill chips and the CV / GitHub buttons. This animates it:
//   - skill chips pop in 6 at a time at the sides of the photo and swap to the next set;
//   - the photo turns through its four versions (colour, halftone, green halftone, greyscale; assets/img/card/).
//     Each change runs as a grid of small "pixels", each a 3D cube that rotates a quarter turn to show the next
//     version on its side face, in a wave that starts at the face. The axis alternates between turns.
// Drawn on one canvas inside the photo, only while a change runs. Paused off-screen and in hidden tabs; still with
// reduced motion or in plain view.
const FACE = [0.5, 0.3];      // where each wave starts (fraction of the photo)
const HOLD_MS = 5200;         // how long each version stays
const TURN_MS = 560;          // one cube's quarter turn
const WAVE_MS = 1000;         // spread of start times across the photo

export function initProfileCard({ reducedMotion = false } = {}) {
  const root = document.querySelector('[data-pc]');
  if (!root) return;
  if (reducedMotion || window.__plain) { root.classList.add('pc-still'); return; }
  let data;
  try { data = JSON.parse(root.querySelector('[data-pc-data]').textContent); } catch { return; }
  const slots = [...root.querySelectorAll('.pc-skill')];
  let paused = true;
  // a wait that stands still while the card is paused
  const wait = (ms) => new Promise((res) => { (function tick(left) { if (left <= 0) return res(); setTimeout(() => tick(paused ? left : left - 50), 50); })(ms); });

  async function skills() {
    const n = data.skills.length;
    let page = 0;
    const fill = (offset) => slots.forEach((s, i) => {
      const [t, c] = data.skills[(offset + i) % n];
      s.textContent = t;
      s.style.setProperty('--c', `var(--pc-${c})`);
      s.style.animationDelay = `${-i * 0.5}s`;
    });
    slots.forEach((s) => s.classList.remove('is-on'));
    await wait(900);
    for (;;) {
      fill(page * 6);
      for (const s of slots) { s.classList.add('is-on'); await wait(220); }
      await wait(3600);
      for (const s of slots) { s.classList.remove('is-on'); await wait(90); }
      await wait(600);
      page = (page + 1) % Math.ceil(n / 6);
    }
  }

  // ---- the photo, cube by cube ----
  const photo = root.querySelector('.pc-photo');
  const cv = document.createElement('canvas');
  cv.className = 'pc-cubes';
  cv.setAttribute('aria-hidden', 'true');
  photo.querySelector('picture').after(cv);
  const g = cv.getContext('2d');
  const load = (src) => new Promise((res) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    const r = photo.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const drawWhole = (im) => { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(im, 0, 0, cv.width, cv.height); };

  // one change: every tile is a cube turning a quarter turn; its front face is the old version, the face coming
  // round is the new one. Faces are drawn squeezed by cos/sin of the angle, with a little depth and shading.
  function turn(from, to, vertical) {
    return new Promise((done) => {
      const T = Math.max(10, Math.round(W / 24)); // a "pixel" of the card, in CSS px
      const cols = Math.ceil(W / T), rows = Math.ceil(H / T);
      const fx = FACE[0] * W, fy = FACE[1] * H, far = Math.hypot(Math.max(fx, W - fx), Math.max(fy, H - fy));
      const tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = c * T, y = r * T, d = Math.hypot(x + T / 2 - fx, y + T / 2 - fy) / far;
        tiles.push({ x, y, delay: d * WAVE_MS + Math.random() * 120 });
      }
      const sx = from.naturalWidth / W, sy = from.naturalHeight / H; // all four versions share a size
      const total = WAVE_MS + 120 + TURN_MS;
      drawWhole(from);
      let t0 = 0, last = 0, spent = 0;
      const frame = (now) => {
        if (!t0) { t0 = now; last = now; }
        if (paused) { last = now; requestAnimationFrame(frame); return; } // stands still (and draws nothing) while paused
        spent += now - last;
        last = now;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        // only the cubes that are turning are redrawn; a finished one is drawn once; one that has not started is
        // still the old version already on the canvas
        for (const k of tiles) {
          if (k.done) continue;
          const p = Math.max(0, Math.min(1, (spent - k.delay) / TURN_MS));
          if (p <= 0) continue;
          const w = Math.min(T, W - k.x), h = Math.min(T, H - k.y);
          if (p >= 1) { k.done = true; g.drawImage(to, k.x * sx, k.y * sy, w * sx, h * sy, k.x, k.y, w, h); continue; }
          const a = ease(p) * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
          const depth = Math.sin(p * Math.PI) * 0.12; // the cube recedes a little mid-turn
          g.fillStyle = '#0b0b09'; // the gap around a receding cube
          g.fillRect(k.x, k.y, w, h);
          if (!vertical) {
            const inset = h * depth / 2, wa = w * ca, wb = w * sa;
            g.drawImage(from, k.x * sx, k.y * sy, w * sx, h * sy, k.x, k.y + inset, wa, h - inset * 2);
            g.drawImage(to, k.x * sx, k.y * sy, w * sx, h * sy, k.x + wa, k.y + inset, wb, h - inset * 2);
            g.fillStyle = `rgba(0,0,0,${(0.55 * sa).toFixed(3)})`; g.fillRect(k.x, k.y + inset, wa, h - inset * 2);
            g.fillStyle = `rgba(0,0,0,${(0.55 * ca).toFixed(3)})`; g.fillRect(k.x + wa, k.y + inset, wb, h - inset * 2);
          } else {
            const inset = w * depth / 2, ha = h * ca, hb = h * sa;
            g.drawImage(from, k.x * sx, k.y * sy, w * sx, h * sy, k.x + inset, k.y, w - inset * 2, ha);
            g.drawImage(to, k.x * sx, k.y * sy, w * sx, h * sy, k.x + inset, k.y + ha, w - inset * 2, hb);
            g.fillStyle = `rgba(0,0,0,${(0.55 * sa).toFixed(3)})`; g.fillRect(k.x + inset, k.y, w - inset * 2, ha);
            g.fillStyle = `rgba(0,0,0,${(0.55 * ca).toFixed(3)})`; g.fillRect(k.x + inset, k.y + ha, w - inset * 2, hb);
          }
        }
        if (spent < total) requestAnimationFrame(frame);
        else { drawWhole(to); done(); }
      };
      requestAnimationFrame(frame);
    });
  }

  async function photos() {
    const ims = (await Promise.all(data.images.map(load))).filter(Boolean);
    if (ims.length < 2) return;
    size();
    addEventListener('resize', () => { size(); drawWhole(ims[cur]); }, { passive: true });
    let cur = 0, vertical = false;
    drawWhole(ims[0]);
    cv.classList.add('is-on');
    for (;;) {
      await wait(HOLD_MS);
      const next = (cur + 1) % ims.length;
      await turn(ims[cur], ims[next], vertical);
      cur = next;
      vertical = !vertical;
    }
  }

  const setPaused = (v) => { paused = v; root.classList.toggle('pc-paused', v); };
  let started = false;
  new IntersectionObserver((es) => {
    const on = es[es.length - 1].isIntersecting && !document.hidden;
    setPaused(!on);
    if (on && !started) { started = true; root.classList.add('pc-live'); skills(); photos(); }
  }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  setPaused(true);
}
