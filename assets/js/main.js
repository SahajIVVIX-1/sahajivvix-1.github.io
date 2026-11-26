// Entry point. Small modules run immediately; heavy ones load when they are about to be needed.
import { initTheme } from './theme.js';
import { initHero } from './hero.js';
import { initRail } from './rail.js';
import { initHScroll } from './hscroll.js';
import { initLoss } from './loss.js';
import { initPersona } from './persona.js';
import { initThink } from './think.js';
import { initGenerate } from './generate.js';
import { initGwr } from './gwr.js';
import { initBadge } from './badge.js';
import { initFooter } from './footer.js';
import { initBrand } from './brand.js';
import { initTiles } from './tiles.js';
import { checkOrigin } from './origin.js';
import { initResume } from './resume.js';
import { initContext } from './context.js';

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Phones, low core counts and data-saver get lighter versions of the effects.
export const lowPower = matchMedia('(max-width: 700px), (pointer: coarse)').matches
  || (navigator.hardwareConcurrency || 8) <= 4
  || navigator.connection?.saveData === true;

// Start-up is split into several short tasks instead of one long one, so the browser can paint and answer input in
// between (on a slow phone the single task took close to a second). While the loading screen covers the page
// nothing below it is visible, so the first steps may pause too; otherwise only the steps after the hero do.
const pause = () => new Promise((r) => setTimeout(r, 0));
const covered = () => document.documentElement.classList.contains('booting');

// Off-screen sections skip layout until they come near (content-visibility in main.css), so their heights are
// estimates and a jump within the page would land in the wrong place. The first jump (any scrollIntoView: links,
// rail, palette, chat tools, lens tags, or a #hash in the address) lays the whole page out for the rest of the visit.
const fullLayout = () => document.documentElement.classList.add('cv-off');
const intoView = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (...args) { fullLayout(); return intoView.apply(this, args); };
if (location.hash.length > 1) fullLayout();
addEventListener('hashchange', fullLayout);

checkOrigin();
initTheme();
// Persona first: it reorders and renumbers the layers that the rail and hero then read.
initPersona();
initRail();
// The projects and products tracks scroll sideways while the page scrolls down (hscroll.js); it also redirects every
// jump to a card, so it has to be in place before anything can link to one.
initHScroll();
if (covered()) await pause();
initHero();
initThink();
initGenerate({ reducedMotion, lowPower });
// generate.js has hidden what it will animate (or decided not to): the early "hold everything" class can go
document.documentElement.classList.remove('gen-pending');
if (covered()) await pause();
initGwr({ reducedMotion });
initBadge({ reducedMotion });
// The persona line and badge are placed: the hero can show (see "hero layout settles" in main.css).
document.documentElement.classList.add('hero-laid');
await pause();
initFooter({ reducedMotion, lowPower });
initBrand({ reducedMotion });
initTiles({ reducedMotion, lowPower });
initLoss();
await pause();
initHeader();
initResume();
initContext({ reducedMotion });
initAnchors();
initTransitions();
initLazy();
initSessionTag();
initPlain();
// Tells the inline boot screen that the main script is ready (part of its real progress).
window.__boot?.mark('js');

// The visitor's public IP (looked up by the inline head script) in the footer, behind a "show" button so it is
// never on screen unasked.
function initSessionTag() {
  const el = document.querySelector('[data-session]');
  if (!el) return;
  (window.__ipPromise || Promise.resolve(null)).then((ip) => {
    if (!ip) return;
    const b = el.querySelector('b');
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'foot-show';
    show.textContent = 'show';
    show.setAttribute('aria-label', 'Show your IP address');
    show.addEventListener('click', () => { b.textContent = ip; b.focus?.(); });
    b.replaceChildren(show);
    el.hidden = false;
  });
}

// Plain view on or off (fresh.js reads ?plain= before anything runs): the page reloads in the other mode.
function initPlain() {
  const on = !!window.__plain;
  for (const b of document.querySelectorAll('[data-plain-toggle]')) {
    b.textContent = on ? 'full view' : 'plain view';
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Turn the loading screen and animation back on' : 'No loading screen, no animation';
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-plain-toggle]')) return;
    const q = new URLSearchParams(location.search);
    q.delete('for');
    q.set('plain', on ? '0' : '1');
    location.assign(`${location.pathname}?${q}${location.hash}`);
  });
}

function initHeader() {
  const head = document.querySelector('[data-head]');
  if (!head) return;
  const onScroll = () => head.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// In-page links (#contact, /#work and so on): scroll to the section without reloading, also when the address is
// /ip=<address>. The header height is handled by scroll-padding-top in the stylesheet.
function initAnchors() {
  const isHome = (p) => p === '/' || p === '/index.html' || /^\/ip=/.test(p);
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (!(url.pathname === location.pathname || (isHome(url.pathname) && isHome(location.pathname)))) return;
    if (!url.hash && url.pathname === location.pathname && url.search === location.search) return;
    let el = null;
    try { el = url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null; } catch { /* bad escape */ }
    if (!url.hash || url.hash === '#') { e.preventDefault(); scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }); return; }
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', location.pathname + location.search + url.hash);
  });
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
    if (e.target.closest('[data-lens]')) import('./lens.js').then((m) => m.toggleLens());
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); window.__palette(); }
    else if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '') && !document.activeElement?.isContentEditable) { e.preventDefault(); window.__palette(); }
  });

  // Attention lines: after the page is idle. Hover draws them with a mouse; on a touch screen a tap pins them.
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
  if ((matchMedia('(hover: hover)').matches || matchMedia('(pointer: coarse)').matches) && !reducedMotion) {
    // Wrapping ~400 words in spans is DOM work; wait until the boot screen has finished so it cannot cause jank.
    const afterBoot = (fn) => (document.documentElement.classList.contains('booting')
      ? document.addEventListener('boot:done', () => setTimeout(fn, 1200), { once: true })
      : fn());
    idle(() => afterBoot(() => import('./attention.js').then((m) => m.initAttention({ lowPower }))));
  }

  // Harvard ManageMentor adapters (#adapters): the module when the block is near; the merge starts once it is in
  // view. The chat's tools load it on demand too.
  let adMod;
  window.__adapters = () => (adMod ||= import('./adapters.js').then((m) => m.initAdapters({ reducedMotion })));
  const ad = document.querySelector('[data-adapters]');
  if (ad) {
    const ao = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { ao.disconnect(); window.__adapters(); }
    }, { rootMargin: '900px 0px' });
    ao.observe(ad);
  }

  // Recruiter mode (paste a job description): its small module when the section is near; the model only on submit.
  const fit = document.querySelector('[data-fit]');
  if (fit) {
    const fo = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { fo.disconnect(); import('./fit.js').then((m) => m.initFit()); }
    }, { rootMargin: '600px 0px' });
    fo.observe(fit);
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
