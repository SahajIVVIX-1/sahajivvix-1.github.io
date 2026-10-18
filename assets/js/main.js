// Entry point. Small modules run immediately; heavy ones load when they are about to be needed.
import { initTheme } from './theme.js';
import { initHero } from './hero.js';
import { initRail } from './rail.js';
import { initLoss } from './loss.js';
import { initPersona } from './persona.js';
import { initThink } from './think.js';

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Phones, low core counts and data-saver get lighter versions of the effects.
export const lowPower = matchMedia('(max-width: 700px), (pointer: coarse)').matches
  || (navigator.hardwareConcurrency || 8) <= 4
  || navigator.connection?.saveData === true;

initTheme();
// Persona first: it reorders and renumbers the layers that the rail and hero then read.
initPersona();
initRail();
initHero();
initThink();
initLoss();
initHeader();
initTransitions();
initLazy();
initSessionTag();
// Tells the inline boot screen that the main script is ready (part of its real progress).
window.__boot?.mark('js');

// Shows the visitor's public IP (looked up by the inline head script) in the footer once it is known.
function initSessionTag() {
  const el = document.querySelector('[data-session]');
  if (!el) return;
  (window.__ipPromise || Promise.resolve(null)).then((ip) => {
    if (!ip) return;
    el.querySelector('b').textContent = ip;
    el.hidden = false;
  });
}

function initHeader() {
  const head = document.querySelector('[data-head]');
  if (!head) return;
  const onScroll = () => head.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Softmax-style fade between pages: blur out, then the next page sharpens in.
function initTransitions() {
  if (reducedMotion) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.hash && url.pathname === location.pathname) return;
    if (/\.(xml|json|png|pdf)$/.test(url.pathname)) return;
    e.preventDefault();
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 300);
  });
  addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('is-leaving'); });
}

function initLazy() {
  // Command palette and chat: load on first intent.
  let paletteMod;
  const palette = () => (paletteMod ||= import('./palette.js').then((m) => m.initPalette()));
  let askMod;
  const ask = () => (askMod ||= import('./ask/ask.js').then((m) => m.initAsk()));
  window.__ask = (q) => ask().then((api) => api.open(q));
  window.__palette = () => palette().then((api) => api.open());

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ask-open]')) { e.preventDefault(); window.__ask(); }
    if (e.target.closest('[data-palette-open]')) { e.preventDefault(); window.__palette(); }
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); window.__palette(); }
    else if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); window.__palette(); }
  });

  // Attention lines: after the page is idle, only for fine pointers (hover does not exist on touch).
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  if (matchMedia('(hover: hover)').matches && !reducedMotion) {
    // Wrapping ~400 words in spans is DOM work; wait until the boot screen has finished so it cannot cause jank.
    const afterBoot = (fn) => (document.documentElement.classList.contains('booting')
      ? document.addEventListener('boot:done', () => setTimeout(fn, 1200), { once: true })
      : fn());
    idle(() => afterBoot(() => import('./attention.js').then((m) => m.initAttention({ lowPower }))));
  }

  // Latent map: when it is about to scroll into view.
  const stage = document.querySelector('[data-map]');
  if (stage) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        io.disconnect();
        import('./map.js').then((m) => m.initMap(stage, { lowPower, reducedMotion }));
      }
    }, { rootMargin: '400px 0px' });
    io.observe(stage);
  }
}
