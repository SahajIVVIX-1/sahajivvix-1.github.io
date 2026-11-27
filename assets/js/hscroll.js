// Sideways scrolling for the projects and products tracks ([data-hs]).
//
// Wide screens (the same query main.css uses for .hs--on): the track is pinned under the header and the page's
// vertical scroll moves it sideways, one card per stretch of scroll with a short pause on each card, until the last
// card; then the pin lets go and the page scrolls on. Everywhere else (phones, reduced motion, no JavaScript) the
// track is a plain swipeable row and this module only keeps the counter and the rail in step with it.
//
// Anything that jumps to a card (links, the rail, the palette, chat tools, the embedding map, #hash in the address,
// Tab focus) is turned into the right vertical scroll position, because the cards are moved with a transform and the
// browser's own "scroll into view" cannot know where along the scroll a sideways card is shown.
const WIDE = '(min-width: 1100px) and (min-height: 680px) and (prefers-reduced-motion: no-preference)';
const TOP = 76; // keep in step with .hs--on .hs-pin { top } in main.css
const HOLD = 0.05; // share of each step during which the card stays put at either end
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep: slow start, slow finish

const byTrack = new WeakMap();

function setup(hs) {
  const pin = hs.querySelector('.hs-pin');
  const track = hs.querySelector('[data-hs-track]');
  if (!pin || !track) return null;
  const nEl = hs.querySelector('[data-hs-n]');
  const nameEl = hs.querySelector('[data-hs-name]');
  const tabsEl = hs.querySelector('[data-hs-tabs]');
  const fill = hs.querySelector('[data-hs-fill]');
  const cards = () => [...track.children].filter((c) => c.classList.contains('card'));
  const st = { hs, track, on: false, step: 800, offsets: [0], index: -1, inBand: false, pos: 0 };

  // One small tab per card: jump straight to it. The current one is marked, and so is its card.
  let tabs = [];
  const buildTabs = () => {
    if (!tabsEl) return;
    tabsEl.replaceChildren(...cards().map((c, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'hs-tab';
      b.textContent = c.querySelector('.card-title')?.textContent || String(i + 1);
      b.title = b.textContent;
      b.addEventListener('click', () => { if (st.on) st.reveal(c, { behavior: 'smooth' }); else c.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); });
      return b;
    }));
    tabs = [...tabsEl.children];
  };
  let lastMark = -1, lastName = '';
  const mark = (i) => {
    const cs = cards();
    if (tabs.length !== cs.length) { buildTabs(); lastMark = -1; }
    if (i === lastMark) return;
    lastMark = i;
    tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); if (k === i) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    cs.forEach((c, k) => c.classList.toggle('is-active', k === i));
    const on = tabs[i];
    if (on && tabsEl.scrollWidth > tabsEl.clientWidth) tabsEl.scrollTo({ left: on.offsetLeft - tabsEl.clientWidth / 2 + on.offsetWidth / 2, behavior: 'auto' });
  };

  const label = (i, frac) => {
    const cs = cards();
    mark(clamp(i, 0, cs.length - 1));
    const card = cs[clamp(i, 0, cs.length - 1)];
    const num = String(clamp(i, 0, cs.length - 1) + 1).padStart(2, '0');
    if (nEl && nEl.textContent !== num) nEl.textContent = num;
    const name = card?.querySelector('.card-title')?.textContent || '';
    if (nameEl && name !== lastName) { nameEl.textContent = name; lastName = name; }
    if (fill) fill.style.transform = `scaleX(${clamp(frac, 0, 1).toFixed(3)})`;
  };

  // Cards have a fixed height (the pinned area), so text is scaled (--fs) per card: as large as it can be (up to 1.4)
  // while nothing is cut off, so a short card is filled rather than left with empty space, and a long one on a short
  // screen shrinks (never below .76).
  const fitCard = (c) => {
    const body = c.querySelector('.card-body'), side = c.querySelector('.card-side');
    const fits = () => body.scrollHeight <= body.clientHeight + 1 && side.scrollHeight <= side.clientHeight + 1;
    // the ceiling follows the screen: on a wide monitor the text is allowed to get bigger, like everything else
    let lo = 0.76, hi = Math.min(1.9, Math.max(1.4, innerWidth / 1100)), best = lo;
    c.style.setProperty('--fs', String(hi));
    if (fits()) best = hi;
    else {
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        c.style.setProperty('--fs', mid.toFixed(3));
        if (fits()) { best = mid; lo = mid; } else hi = mid;
      }
    }
    c.style.setProperty('--fs', (Math.floor(best * 100) / 100).toFixed(2));
  };
  const fit = () => cards().forEach(fitCard);

  // Scroll distance of one card: about a screen, so a card is read before the next one slides in.
  const measure = () => {
    const cs = cards();
    fit();
    st.step = clamp(Math.round(innerHeight * 0.95), 600, 1000);
    st.offsets = cs.map((c) => c.offsetLeft - (cs[0]?.offsetLeft || 0));
    hs.style.height = `${pin.offsetHeight + Math.max(0, cs.length - 1) * st.step}px`;
  };

  const announce = (i, rect, force) => {
    const cs = cards();
    const inBand = rect.top < innerHeight * 0.55 && rect.bottom > innerHeight * 0.45;
    if (inBand && (i !== st.index || !st.inBand || force) && cs[i]) {
      document.dispatchEvent(new CustomEvent('hs:active', { detail: { card: cs[i], index: i, track } }));
    }
    st.index = i; st.inBand = inBand;
  };

  const update = () => {
    const cs = cards();
    if (!cs.length) return;
    if (st.on) {
      const rect = hs.getBoundingClientRect();
      const f = clamp((TOP - rect.top) / st.step, 0, cs.length - 1);
      const i = Math.min(Math.floor(f), cs.length - 2 >= 0 ? cs.length - 2 : 0);
      const t = f - i;
      const e = cs.length > 1 ? smooth(clamp((t - HOLD) / (1 - 2 * HOLD), 0, 1)) : 0;
      const a = st.offsets[i] || 0, b = st.offsets[i + 1] ?? a;
      track.style.transform = `translate3d(${-(a + (b - a) * e).toFixed(2)}px,0,0)`;
      st.pos = i + e;
      for (let k = 0; k < cs.length; k++) {
        const c = cs[k], off = st.pos - k, d = Math.min(1, Math.abs(off));
        if (!c._parts) c._parts = { side: c.querySelector('.card-side'), body: c.querySelector('.card-body'), foot: c.querySelector('.card-foot') };
        c.style.opacity = (1 - d * 0.62).toFixed(3);
        c.style.transform = `scale(${(1 - d * 0.045).toFixed(4)})`;
        const o = Math.max(-1, Math.min(1, off));
        if (c._parts.side) c._parts.side.style.transform = `translate3d(${(-o * 46).toFixed(1)}px,0,0)`;
        if (c._parts.body) c._parts.body.style.transform = `translate3d(${(-o * 110).toFixed(1)}px,0,0)`;
        if (c._parts.foot) c._parts.foot.style.transform = `translate3d(${(-o * 70).toFixed(1)}px,0,0)`;
      }
      const idx = Math.round(st.pos);
      label(idx, cs.length > 1 ? st.pos / (cs.length - 1) : 1);
      announce(idx, rect);
    } else {
      const w = (cs[1] ? cs[1].offsetLeft - cs[0].offsetLeft : cs[0].offsetWidth) || 1;
      const max = track.scrollWidth - track.clientWidth;
      const idx = clamp(Math.round(track.scrollLeft / w), 0, cs.length - 1);
      label(idx, max > 0 ? track.scrollLeft / max : 1);
      // the row is only as tall as the card in view, so shorter cards do not leave empty space under them
      const h = Math.ceil(cs[idx].offsetHeight + 18);
      if (h > 60 && Math.abs((parseFloat(track.style.height) || 0) - h) > 1) track.style.height = `${h}px`;
      announce(idx, hs.getBoundingClientRect());
    }
  };

  // ---- stepping: one flick moves one card, forwards or back; the track settles on a card when scrolling stops ----
  const absTop = () => hs.getBoundingClientRect().top + scrollY - TOP; // scrollY at which the pin starts
  const yFor = (i) => Math.round(absTop() + i * st.step);
  const pos = () => (TOP - hs.getBoundingClientRect().top) / st.step; // card position, fractional
  st.animating = false; st.cooldown = 0; st.lastWheel = 0; st.used = false; st.raf = 0;
  const animateTo = (y, ms) => {
    const y0 = scrollY, d = y - y0;
    cancelAnimationFrame(st.raf);
    if (!d) { st.animating = false; return; }
    const t0 = performance.now();
    st.animating = true;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      scrollTo({ top: Math.round(y0 + d * t), behavior: 'instant' }); // even pace: the slide supplies the easing
      if (t < 1) st.raf = requestAnimationFrame(tick);
      else { st.animating = false; st.cooldown = performance.now() + 160; }
    };
    st.raf = requestAnimationFrame(tick);
  };
  // true when the event was used for a step (or absorbed), false when the page should scroll as usual
  st.wheel = (e) => {
    const n = cards().length;
    if (n < 2) return false;
    const f = pos();
    const dir = e.deltaY > 0 ? 1 : -1;
    if (f < -0.02 || f > n - 1 + 0.02) return false;       // not pinned: the page scrolls
    if (dir > 0 && f >= n - 1 - 0.02) return false;         // on the last card, scrolling down: let the page go on
    if (dir < 0 && f <= 0.02) return false;                 // on the first card, scrolling up: let the page go back
    e.preventDefault();
    const now = performance.now();
    if (now - st.lastWheel >= 120) st.used = false;         // a new flick, not the tail of the last one
    st.lastWheel = now;
    if (st.animating || now < st.cooldown || st.used || Math.abs(e.deltaY) < 2) return true;
    st.used = true;
    const target = clamp(dir > 0 ? Math.floor(f + 0.001) + 1 : Math.ceil(f - 0.001) - 1, 0, n - 1);
    animateTo(yFor(target), 1050);
    return true;
  };
  // after a drag of the scroll bar, a key press or a stray scroll: settle on the nearest card
  let settleT = 0;
  st.settle = () => {
    clearTimeout(settleT);
    if (!st.on) return;
    settleT = setTimeout(() => {
      if (st.animating) return;
      const n = cards().length, f = pos();
      if (f < 0 || f > n - 1) return;
      const k = Math.round(f);
      if (Math.abs(f - k) > 0.03) animateTo(yFor(k), 560);
    }, 170);
  };

  // Brings a card to the middle of its stretch of scroll (or, in the plain row, scrolls the row to it).
  st.reveal = (card, opts) => {
    const cs = cards();
    const i = cs.indexOf(card);
    if (i < 0) return false;
    document.documentElement.classList.add('cv-off'); // lay the whole page out first so the position is exact
    const smoothly = opts && typeof opts === 'object' && opts.behavior === 'smooth' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (st.on) {
      measure();
      const top = Math.max(0, yFor(i));
      if (smoothly) animateTo(top, 950); else scrollTo({ top, behavior: 'instant' });
      return true;
    }
    return false;
  };

  st.setOn = (on) => {
    if (on === st.on) { if (on) { measure(); update(); } return; }
    st.on = on;
    hs.classList.toggle('hs--on', on);
    if (on) { track.scrollLeft = 0; track.style.height = ''; measure(); } else {
      hs.style.height = ''; track.style.transform = '';
      cards().forEach((c) => { c.style.removeProperty('--fs'); c.style.opacity = ''; c.style.transform = ''; for (const part of Object.values(c._parts || {})) if (part) part.style.transform = ''; });
    }
    update();
  };

  track.addEventListener('scroll', () => { if (!st.on) update(); }, { passive: true });
  // Tab into a card that is off to the side: move the page to it instead of leaving focus on something unseen.
  track.addEventListener('focusin', (e) => {
    if (!st.on) return;
    const card = e.target.closest('.card');
    const cs = cards();
    if (card && cs.indexOf(card) !== Math.round(st.pos)) st.reveal(card, 'auto');
  });
  st.update = update; st.measure = measure; st.fitCard = fitCard;
  // a card changes height when its text finishes loading or the screen turns: keep the row's height in step
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (!st.on) update(); }); cards().forEach((c) => ro.observe(c)); }
  byTrack.set(track, st);
  return st;
}

export function initHScroll() {
  const all = [...document.querySelectorAll('[data-hs]')].map(setup).filter(Boolean);
  if (!all.length) return;
  const mq = matchMedia(WIDE);
  const root = document.documentElement;
  const wanted = () => mq.matches && !root.classList.contains('plain');
  const apply = () => all.forEach((s) => s.setOn(wanted()));
  apply();
  mq.addEventListener('change', apply);

  let raf = 0;
  const tick = () => { raf = 0; all.forEach((s) => s.update()); };
  const queue = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', () => { queue(); all.forEach((s) => s.settle?.()); }, { passive: true });
  // while a track is pinned, a wheel or trackpad flick steps one card (see st.wheel); the page scrolls at either end
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    for (const s of all) if (s.on && s.wheel(e)) return;
  }, { passive: false });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { all.forEach((s) => { if (s.on) s.measure(); s.update(); }); }, 120); });
  // fonts and the order of the cards both change the offsets
  document.fonts?.ready.then(() => all.forEach((s) => { if (s.on) s.measure(); s.update(); }));
  document.addEventListener('hs:reorder', () => all.forEach((s) => { if (s.on) s.measure(); s.update(); }));
  document.addEventListener('persona:change', () => all.forEach((s) => { if (s.on) s.measure(); s.update(); }));

  // The text of a card is sampled in token by token (generate.js) and can wrap differently once it has settled.
  const refit = new Map();
  document.addEventListener('gen:text-done', (e) => {
    const card = e.detail?.el?.closest?.('[data-hs-track] > .card');
    const st = card && byTrack.get(card.parentElement);
    if (!st?.on) return;
    clearTimeout(refit.get(card));
    refit.set(card, setTimeout(() => st.fitCard(card), 120));
  });

  // Every jump to an element inside a sideways track goes through here (links, rail, palette, chat tools, map).
  const orig = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (...args) {
    const card = this.closest?.('[data-hs-track] > .card') || (this.matches?.('[data-hs-track] > .card') ? this : null);
    const st = card && byTrack.get(card.parentElement);
    if (st?.on && st.reveal(card, args[0])) return;
    return orig.apply(this, args);
  };

  // #p-<id> set while the page is open (the site itself starts every visit at the top, without a #hash).
  const fromHash = () => {
    if (location.hash.length < 2) return;
    let el = null;
    try { el = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { /* bad escape */ }
    const card = el?.closest?.('[data-hs-track] > .card');
    const st = card && byTrack.get(card.parentElement);
    if (st?.on) requestAnimationFrame(() => st.reveal(card, 'auto'));
  };
  addEventListener('hashchange', fromHash);
  tick();
}
