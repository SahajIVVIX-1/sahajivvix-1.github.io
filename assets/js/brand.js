// Header brand: a live logo (cursor dot, scroll-progress ring, tilt, attention ticks) and a wordmark that morphs
// from "info@sahaj.si" to "Sahaj Saliya" once the hero name has scrolled under the header, and back again.
// Both texts are always laid out (hidden sizers), so the nav never shifts. The tokens are aria-hidden; the link
// keeps a stable accessible name.
import { placePopup } from './popup.js';

const A = ['info', '@', 'sah', 'aj', '.si'];
const B = ['Sah', 'aj', ' Sal', 'iya'];
const B_SHORT = ['Sah', 'aj', ' S', '.'];

export function initBrand({ reducedMotion = false } = {}) {
  const brand = document.querySelector('[data-brand]');
  if (!brand) return;
  const logo = brand.querySelector('.brand-logo');
  progress(brand);
  hover(brand, logo, reducedMotion);
  brand.addEventListener('click', (e) => {
    if (!(location.pathname === '/' || /^\/ip=/.test(location.pathname)) || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  const name = document.querySelector('.hero-name');
  if (name) morph(brand, name, reducedMotion);
}

// The ring shows how far through the page (all the layers) the visitor is.
function progress(brand) {
  const ring = brand.querySelector('.ring-prog');
  let queued = false;
  const set = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    ring.style.setProperty('--p', (p * 100).toFixed(2));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(set); } }, { passive: true });
  addEventListener('resize', set, { passive: true });
  set();
}

function hover(brand, logo, reducedMotion) {
  let off = 0;
  brand.addEventListener('pointerenter', () => { clearTimeout(off); brand.classList.add('is-attn'); });
  brand.addEventListener('pointerleave', () => {
    logo.style.transform = '';
    off = setTimeout(() => brand.classList.remove('is-attn'), 700);
  });
  if (reducedMotion) return;
  brand.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = logo.getBoundingClientRect();
    const c = (v) => Math.max(-1, Math.min(1, v));
    const dx = c((e.clientX - (r.left + r.width / 2)) / (r.width / 2));
    const dy = c((e.clientY - (r.top + r.height / 2)) / (r.height / 2));
    logo.style.transform = `perspective(120px) rotateX(${(-dy * 8).toFixed(1)}deg) rotateY(${(dx * 8).toFixed(1)}deg)`;
  });
}

function morph(brand, name, reducedMotion) {
  const cur = brand.querySelector('.bt-cur');
  const head = document.querySelector('[data-head]');
  const compact = () => matchMedia('(max-width: 360px)').matches;
  const tokens = (which) => (which === 'A' ? A : compact() ? B_SHORT : B);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let shown = 'A'; // what the header currently shows
  let seq = 0;

  const plain = (which) => {
    cur.textContent = which === 'A' ? 'info@sahaj.si' : compact() ? 'Sahaj S.' : 'Sahaj Saliya';
    cur.classList.remove('is-fade');
    shown = which;
  };

  async function go(to) {
    if (to === shown) return;
    const my = ++seq;
    if (reducedMotion) {
      cur.classList.add('is-fade');
      await wait(160);
      if (my === seq) plain(to);
      return;
    }
    // 1. detokenise the old text, right to left
    cur.textContent = '';
    const old = tokens(shown).map((t) => { const s = document.createElement('span'); s.className = 'bt-tok'; s.textContent = t; cur.append(s); return s; });
    for (let i = old.length - 1; i >= 0; i--) { old[i].classList.add('is-out'); await wait(30); if (my !== seq) return; }
    await wait(20);
    if (my !== seq) return;
    // 2. generate the new text token by token
    cur.textContent = '';
    const fresh = tokens(to).map((t) => { const s = document.createElement('span'); s.className = 'bt-tok is-in'; s.textContent = t; cur.append(s); return s; });
    for (let i = 0; i < fresh.length; i++) {
      requestAnimationFrame(() => fresh[i].classList.add('is-on'));
      if (to === 'B' && i === 1) peek(fresh[i]);
      await wait(38);
      if (my !== seq) return;
    }
    await wait(40);
    if (my === seq) plain(to);
  }

  // The small "what else could come next" popup. It opens below the header: placePopup measures the room.
  function peek(tok) {
    const d = document.createElement('div');
    d.className = 'dist';
    d.setAttribute('aria-hidden', 'true');
    const rows = [[tok.textContent.trim(), 0.82], ['ah', 0.1], ['am', 0.05]];
    d.innerHTML = rows.map(([t, p], i) => `<div class="dist-row${i ? '' : ' is-pick'}"><span class="dist-tok">${t}</span><span class="dist-bar"><i style="--p:${Math.round(p * 100)}%"></i></span><span class="dist-p">${p.toFixed(2)}</span></div>`).join('');
    tok.append(d);
    placePopup(tok, d, { order: ['below', 'right', 'left', 'above'] });
    setTimeout(() => { d.classList.add('is-out'); setTimeout(() => d.remove(), 320); }, 380);
  }

  // Hysteresis: gone once the name's bottom is above the header's bottom, back only after it has re-entered by 40px.
  let past = false;
  const apply = (bottom) => {
    const hb = head.getBoundingClientRect().bottom;
    if (!past && bottom <= hb) past = true;
    else if (past && bottom > hb + 40) past = false;
    else return;
    go(past ? 'B' : 'A');
  };
  new IntersectionObserver((es) => apply(es[es.length - 1].boundingClientRect.bottom), {
    rootMargin: `-${Math.round(head.getBoundingClientRect().bottom)}px 0px 0px 0px`,
    threshold: Array.from({ length: 21 }, (_, i) => i / 20),
  }).observe(name);
  // A page opened already scrolled past the hero shows the name straight away.
  if (name.getBoundingClientRect().bottom <= head.getBoundingClientRect().bottom) { past = true; plain('B'); }
  addEventListener('resize', () => { if (shown === 'B') plain('B'); }, { passive: true });
}
