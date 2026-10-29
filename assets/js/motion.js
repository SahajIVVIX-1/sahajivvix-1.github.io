// Smooth page changes for every control that changes the page (persona switch, theme, map controls, agents).
// smoothChange(update, { move }) runs `update` inside a View Transition: the elements in `move` get a
// view-transition-name for that one transition, so they glide to their new places and the rest cross-fades.
// Without the API it falls back to FLIP (measure, update, invert, play) on the same elements. The element at the
// top of the viewport stays where it was. With reduced motion it is a 150 ms crossfade only.
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE = 'cubic-bezier(.16, 1, .3, 1)';
let running = null;

export function smoothChange(update, { move = [], ms = 400 } = {}) {
  const els = move.filter(Boolean);
  const keep = anchor();
  const done = () => { keep?.(); };
  if (running) { running.skipTransition?.(); running = null; }
  const root = document.documentElement;
  root.style.setProperty('--vt-ms', `${reduced() ? 150 : ms}ms`);

  if (document.startViewTransition) {
    if (!reduced()) els.forEach((el, i) => { el.style.viewTransitionName = `vt-${i}`; });
    const vt = document.startViewTransition(() => { update(); done(); });
    running = vt;
    vt.finished.finally(() => { els.forEach((el) => { el.style.viewTransitionName = ''; }); if (running === vt) running = null; });
    return vt.finished.catch(() => {});
  }
  if (reduced()) { update(); done(); return fade(root, 150); }
  // FLIP
  const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
  update();
  done();
  const anims = [];
  for (const el of els) {
    const a = before.get(el), b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    anims.push(el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing: EASE }).finished);
  }
  return Promise.all(anims).catch(() => {});
}

function fade(el, ms) { return el.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' }).finished.catch(() => {}); }

// Remembers which element sits at the top of the viewport and returns a function that scrolls it back there.
function anchor() {
  const y = 90;
  let el = document.elementFromPoint(innerWidth / 2, y);
  while (el && el !== document.body && !el.matches('section, article, header.layer-head, footer')) el = el.parentElement;
  if (!el || el === document.body || scrollY < 40) return null;
  const top = el.getBoundingClientRect().top;
  return () => { const d = el.getBoundingClientRect().top - top; if (Math.abs(d) > 1) scrollBy({ top: d, behavior: 'instant' }); };
}

// Replaces an element's text as if it were sampled again: the new words fade in one after another.
export function retoken(el, text, { step = 45 } = {}) {
  if (!el || el.textContent === text) return;
  if (reduced()) { el.textContent = text; return; }
  el.textContent = '';
  text.split(/(\s+)/).forEach((w, i) => {
    if (!w) return;
    const s = document.createElement('span');
    s.className = 'rt-tok';
    s.textContent = w;
    s.style.animationDelay = `${Math.floor(i / 2) * step}ms`;
    el.append(s);
  });
  setTimeout(() => { if (el.querySelector('.rt-tok')) el.textContent = text; }, Math.ceil(text.split(/\s+/).length * step + 400));
}
