// Footer behaviour: copy email, live "n min ago", theme + back-to-top buttons, the probability popup on the
// accent word, and a faint attention-line background that only runs while the sign-off is on screen.
import { placePopup } from './popup.js';

export function initFooter({ reducedMotion = false, lowPower = false } = {}) {
  const foot = document.querySelector('[data-foot]');
  if (!foot) return;
  copyButton(foot);
  clock(foot);
  buttons(foot, reducedMotion);
  accentPopup(foot);
  if (!reducedMotion && !lowPower) attentionLines(foot);
}

function copyButton(foot) {
  const btn = foot.querySelector('[data-copy]');
  if (!btn) return;
  const label = btn.querySelector('[data-copy-label]');
  const live = foot.querySelector('[data-copy-live]');
  let timer = 0;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
      document.body.append(t); t.select();
      try { document.execCommand('copy'); } catch { /* nothing more to try */ }
      t.remove();
    }
    label.textContent = 'copied ✓';
    btn.classList.add('is-done');
    if (live) live.textContent = 'Email address copied';
    clearTimeout(timer);
    timer = setTimeout(() => { label.textContent = 'copy'; btn.classList.remove('is-done'); if (live) live.textContent = ''; }, 1800);
  });
}

// "last forward pass": the visitor's local time (UTC on hover) and a ticking relative time.
function clock(foot) {
  const time = foot.querySelector('[data-foot-time]');
  const ago = foot.querySelector('[data-foot-ago]');
  if (!time) return;
  const at = new Date(time.getAttribute('datetime'));
  if (isNaN(at)) return;
  const pad = (n) => String(n).padStart(2, '0');
  const tz = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value || '';
  time.textContent = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())} ${tz}`;
  const rel = () => {
    const m = Math.max(0, Math.floor((Date.now() - at) / 60000));
    if (!ago) return;
    ago.textContent = m < 1 ? '· just now' : m < 60 ? `· ${m} min ago` : m < 1440 ? `· ${Math.floor(m / 60)} h ago` : `· ${Math.floor(m / 1440)} d ago`;
  };
  rel();
  setInterval(() => { if (!document.hidden) rel(); }, 30000);
}

function buttons(foot, reducedMotion) {
  foot.querySelector('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  const mine = foot.querySelector('[data-foot-theme]');
  const head = document.querySelector('[data-theme-toggle]');
  if (!mine || !head) { mine?.remove(); return; }
  const val = mine.querySelector('[data-foot-theme-val]');
  const sync = () => { val.textContent = head.querySelector('[data-theme-val]')?.textContent || 'auto'; };
  mine.addEventListener('click', () => { head.click(); sync(); });
  document.addEventListener('themechange', sync);
  sync();
}

// Hovering (or focusing) the accent word shows what else the model could have said.
function accentPopup(foot) {
  const word = foot.querySelector('[data-foot-accent]');
  if (!word) return;
  const alts = [['intelligent', 0.71], ['useful', 0.13], ['reliable', 0.09]];
  let pop = null, hide = 0;
  const open = () => {
    clearTimeout(hide);
    if (pop) return;
    pop = document.createElement('div');
    pop.className = 'dist';
    pop.setAttribute('aria-hidden', 'true');
    pop.style.fontStyle = 'normal';
    pop.innerHTML = alts.map(([t, p], i) => `<div class="dist-row${i ? '' : ' is-pick'}"><span class="dist-tok">${t}</span><span class="dist-bar"><i style="--p:${Math.round(p * 100)}%"></i></span><span class="dist-p">${p.toFixed(2)}</span></div>`).join('');
    word.style.position = 'relative';
    word.append(pop);
    placePopup(word, pop);
  };
  const close = () => {
    const p = pop; if (!p) return;
    p.classList.add('is-out');
    hide = setTimeout(() => { p.remove(); if (pop === p) pop = null; }, 300);
  };
  word.addEventListener('pointerenter', open);
  word.addEventListener('pointerleave', close);
  word.addEventListener('focus', open);
  word.addEventListener('blur', close);
}

// Faint drifting nodes joined by lines, like the attention lines elsewhere. Paused off-screen.
function attentionLines(foot) {
  const cv = foot.querySelector('[data-foot-attn]');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const N = 16;
  const nodes = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.00002, vy: (Math.random() - 0.5) * 0.00002 }));
  let w = 0, h = 0, raf = 0, last = 0, inView = false, on = false;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const size = () => {
    const r = cv.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  };
  const color = () => getComputedStyle(foot).getPropertyValue('--accent').trim() || '#ff8a5b';
  const frame = (t) => {
    raf = on ? requestAnimationFrame(frame) : 0;
    if (t - last < 33) return; // about 30 fps is plenty for a slow drift
    const dt = Math.min(64, t - last); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const n of nodes) {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < 0 || n.x > 1) n.vx *= -1;
      if (n.y < 0 || n.y > 1) n.vy *= -1;
    }
    ctx.strokeStyle = color();
    ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = nodes[i], b = nodes[j];
      const d = Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
      const max = Math.min(w, h) * 0.55;
      if (d > max) continue;
      ctx.globalAlpha = 0.16 * (1 - d / max);
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.quadraticCurveTo((a.x + b.x) * w / 2, (a.y + b.y) * h / 2 - d * 0.15, b.x * w, b.y * h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const update = () => {
    on = inView && !document.hidden;
    if (on && !raf) { size(); last = 0; raf = requestAnimationFrame(frame); }
  };
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; update(); }).observe(cv);
  document.addEventListener('visibilitychange', update);
  new ResizeObserver(() => { if (on) size(); }).observe(foot);
}
