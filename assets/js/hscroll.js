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
const HOLD = 0.28; // share of each step during which the card stays put at either end
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

const byTrack = new WeakMap();

function setup(hs) {
  const pin = hs.querySelector('.hs-pin');
  const track = hs.querySelector('[data-hs-track]');
  if (!pin || !track) return null;
  const nEl = hs.querySelector('[data-hs-n]');
  const nameEl = hs.querySelector('[data-hs-name]');
  const fill = hs.querySelector('[data-hs-fill]');
  const cards = () => [...track.children].filter((c) => c.classList.contains('card'));
  const st = { hs, track, on: false, step: 800, offsets: [0], index: -1, inBand: false, pos: 0 };

  const label = (i, frac) => {
    const cs = cards();
    const card = cs[clamp(i, 0, cs.length - 1)];
    if (nEl) nEl.textContent = String(clamp(i, 0, cs.length - 1) + 1).padStart(2, '0');
    if (nameEl && card) nameEl.textContent = card.querySelector('.card-title')?.textContent || '';
    if (fill) fill.style.transform = `scaleX(${clamp(frac, 0, 1).toFixed(4)})`;
  };

  // Cards have a fixed height (the pinned area), so text is scaled (--fs) per card: as large as it can be (up to 1.4)
  // while nothing is cut off, so a short card is filled rather than left with empty space, and a long one on a short
  // screen shrinks (never below .76).
  const fitCard = (c) => {
    const body = c.querySelector('.card-body'), side = c.querySelector('.card-side');
    const fits = () => body.scrollHeight <= body.clientHeight + 1 && side.scrollHeight <= side.clientHeight + 1;
    let lo = 0.76, hi = 1.4, best = lo;
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

  const announce = (i, force) => {
    const cs = cards();
    const rect = hs.getBoundingClientRect();
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
      const f = clamp((TOP - hs.getBoundingClientRect().top) / st.step, 0, cs.length - 1);
      const i = Math.min(Math.floor(f), cs.length - 2 >= 0 ? cs.length - 2 : 0);
      const t = f - i;
      const e = cs.length > 1 ? smooth(clamp((t - HOLD) / (1 - 2 * HOLD), 0, 1)) : 0;
      const a = st.offsets[i] || 0, b = st.offsets[i + 1] ?? a;
      track.style.transform = `translate3d(${-(a + (b - a) * e).toFixed(2)}px,0,0)`;
      st.pos = i + e;
      const idx = Math.round(st.pos);
      label(idx, cs.length > 1 ? st.pos / (cs.length - 1) : 1);
      // text sampling and late fonts can change a card's height after it was fitted: check the one coming into view
      if (idx !== st.index && cs[idx]) fitCard(cs[idx]);
      announce(idx);
    } else {
      const w = (cs[1] ? cs[1].offsetLeft - cs[0].offsetLeft : cs[0].offsetWidth) || 1;
      const max = track.scrollWidth - track.clientWidth;
      const idx = clamp(Math.round(track.scrollLeft / w), 0, cs.length - 1);
      label(idx, max > 0 ? track.scrollLeft / max : 1);
      announce(idx);
    }
  };

  // Brings a card to the middle of its stretch of scroll (or, in the plain row, scrolls the row to it).
  st.reveal = (card, opts) => {
    const cs = cards();
    const i = cs.indexOf(card);
    if (i < 0) return false;
    document.documentElement.classList.add('cv-off'); // lay the whole page out first so the position is exact
    const behavior = opts && typeof opts === 'object' && opts.behavior === 'smooth' && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
    if (st.on) {
      measure();
      const top = hs.getBoundingClientRect().top + scrollY - TOP + i * st.step;
      scrollTo({ top: Math.max(0, Math.round(top)), behavior });
      return true;
    }
    return false;
  };

  st.setOn = (on) => {
    if (on === st.on) { if (on) { measure(); update(); } return; }
    st.on = on;
    hs.classList.toggle('hs--on', on);
    if (on) { track.scrollLeft = 0; measure(); } else { hs.style.height = ''; track.style.transform = ''; cards().forEach((c) => c.style.removeProperty('--fs')); }
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
  addEventListener('scroll', queue, { passive: true });
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
