// Footer behaviour: the "last forward pass" time in the visitor's local time (UTC on hover) with a ticking
// relative time, the build check, and the back-to-top button. The footer itself is rendered at build time by
// footer() in scripts/build.mjs, so every page gets the same one.
import { checkOrigin } from './origin.js';

// Data files up to this size are re-hashed in the browser; the larger ones are listed in /data/build.json.
const CHECK_BYTES = 40000;

export function initFooter({ reducedMotion = false } = {}) {
  const foot = document.querySelector('[data-foot]');
  if (!foot) return;
  clock(foot);
  liveAgo();
  build(foot);
  foot.querySelector('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
}

// Any [data-live-ago] time (the training log) reads "N min ago" and keeps ticking, like the footer clock.
function liveAgo() {
  const els = [...document.querySelectorAll('[data-live-ago]')];
  if (!els.length) return;
  const tick = () => els.forEach((el) => {
    const at = Date.parse(el.getAttribute('datetime'));
    if (isNaN(at)) return;
    const m = Math.max(0, Math.floor((Date.now() - at) / 60000));
    el.textContent = m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`;
    el.title = new Date(at).toLocaleString();
  });
  tick();
  setInterval(() => { if (!document.hidden) tick(); }, 30000);
}

function clock(foot) {
  const time = foot.querySelector('[data-foot-time]');
  const ago = foot.querySelector('[data-foot-ago]');
  if (!time) return;
  const at = new Date(time.getAttribute('datetime'));
  if (isNaN(at)) return;
  const pad = (n) => String(n).padStart(2, '0');
  time.textContent = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const rel = () => {
    const m = Math.max(0, Math.floor((Date.now() - at) / 60000));
    ago.textContent = m < 1 ? '· just now' : m < 60 ? `· ${m} min ago` : m < 1440 ? `· ${Math.floor(m / 60)} h ago` : `· ${Math.floor(m / 1440)} d ago`;
  };
  rel();
  setInterval(() => { if (!document.hidden) rel(); }, 30000);
}

// "build a1b2c3d · verified ✓": this page and /data/build.json name the same commit, the small data files hash to
// the values in the manifest, and the page is served from the original address. Runs when the footer is near view.
function build(foot) {
  const box = foot.querySelector('[data-build]');
  const out = box?.querySelector('[data-build-state]');
  if (!out) return;
  const set = (state, text, title) => { box.dataset.state = state; out.textContent = text; box.title = title; };
  const run = async () => {
    if (!checkOrigin()) return set('bad', ' · unverified copy', 'This page is not served from info.sahaj.si.');
    if (!crypto.subtle) return;
    try {
      const m = await (await fetch('/data/build.json', { cache: 'no-cache' })).json();
      if (m.sha !== box.dataset.build) return set('stale', ' · newer build, reload', `This page is build ${box.dataset.build.slice(0, 7)}; the latest is ${m.sha.slice(0, 7)}.`);
      const small = Object.entries(m.files).filter(([, f]) => f.bytes <= CHECK_BYTES);
      const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
      const ok = await Promise.all(small.map(async ([url, f]) => hex(await crypto.subtle.digest('SHA-256', await (await fetch(url, { cache: 'no-cache' })).arrayBuffer())) === f.sha256));
      const when = new Date(m.built_at).toLocaleString();
      if (ok.every(Boolean)) set('ok', ' · verified ✓', `Built ${when} from commit ${m.sha.slice(0, 7)}. ${small.length} data files re-hashed in your browser match the build manifest (/data/build.json).`);
      else set('bad', ' · unverified', `${ok.filter((x) => !x).length} of ${small.length} data files do not match the build manifest.`);
    } catch { /* offline or no manifest: leave the plain build id */ }
  };
  const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { rootMargin: '600px 0px' });
  io.observe(box);
}
