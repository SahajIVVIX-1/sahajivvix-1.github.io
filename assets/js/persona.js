// Personalises the page for the visitor "intent" guessed by the boot screen (a heuristic, see scripts/boot/boot.js).
// The static HTML stays in the default order for crawlers and no-JS visitors; this only reorders in the browser.
// The visitor can always correct the guess with "not you? switch": a segmented control slides in, and picking a
// view animates the change (sections glide to their new order, changed text is sampled again; see motion.js).
import { smoothChange, retoken, reduced } from './motion.js';

const NAMES = ['recruiter', 'developer', 'researcher', 'curious'];
const LABEL = { recruiter: 'a recruiter', developer: 'a developer', researcher: 'a researcher', curious: 'a curious visitor' };
const RESUME = '/assets/resume/Sahaj-Saliya-Resume.pdf';

// Section order below the hero, per persona. Ids are the section ids in index.html.
const ORDER = {
  // "fit" is Recruiter mode (paste a job description): first for recruiters, just before contact for everyone else
  recruiter: ['fit', 'about', 'experience', 'work', 'products', 'skills', 'certs', 'map', 'contact'],
  developer: ['products', 'work', 'map', 'skills', 'about', 'experience', 'certs', 'fit', 'contact'],
  researcher: ['work', 'about', 'certs', 'experience', 'products', 'skills', 'map', 'fit', 'contact'],
  curious: ['about', 'map', 'work', 'products', 'skills', 'experience', 'certs', 'fit', 'contact'],
};
// Researchers see the research-flavoured projects first; everyone else keeps the default project order.
const CARD_ORDER = { researcher: ['crohnsight', 'openenv', 'sleep-llm', 'dcgan', 'agentic-rag', 'quantum-compilation', 'student-xai', 'santa-elf-calculator'] }; // projects only; products keep their order

// The hero's second button.
const CTA = {
  recruiter: { text: 'Download resume (PDF)', href: RESUME, resume: true },
  developer: { text: 'Browse code', href: 'https://github.com/SahajIVVIX-1', external: true },
  researcher: { text: 'Read the model cards', href: '#work' },
  curious: null,
};

const pad = (n) => String(n).padStart(2, '0');

// The visitor's own choice wins, then a ?for=<view> link, then this page's guess, then the guess saved earlier.
export function currentPersona() {
  let p = null;
  try {
    const pick = sessionStorage.getItem('personaPick') || new URLSearchParams(location.search).get('for');
    if (NAMES.includes(pick)) p = pick;
    else if (window.__persona?.p) p = window.__persona.p;
    else p = JSON.parse(sessionStorage.getItem('persona') || 'null')?.p;
  } catch { p = window.__persona?.p; }
  return NAMES.includes(p) ? p : null;
}

export function initPersona() {
  const main = document.querySelector('main');
  if (!main || !document.getElementById('top')) return; // home page only
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    apply(currentPersona() || 'curious', { first: true });
    wireSwitch();
  };
  if (currentPersona()) start();
  else {
    // First visit: the boot screen's classifier has not finished yet (it loads progressively).
    document.addEventListener('persona:ready', start, { once: true });
    setTimeout(start, 2500);
  }
}

function apply(p, { first = false } = {}) {
  const root = document.documentElement;
  root.dataset.persona = p;
  const main = document.querySelector('main');

  // 1. Section order (the hero stays first, the contact layer stays last).
  const byId = (id) => main.querySelector(`:scope > #${id}`);
  const anchor = document.getElementById('top');
  let prev = anchor;
  for (const id of ORDER[p]) {
    const sec = byId(id);
    if (!sec) continue;
    prev.after(sec);
    prev = sec;
  }

  // 2. Project order inside the work section.
  const work = document.getElementById('work');
  const track = work.querySelector('[data-hs-track]');
  const cardIds = CARD_ORDER[p];
  const cards = [...track.querySelectorAll(':scope > .card')];
  const sorted = cardIds
    ? cardIds.map((id) => cards.find((c) => c.id === `p-${id}`)).filter(Boolean)
    : cards.slice().sort((a, b) => Number(a.dataset.defaultIndex) - Number(b.dataset.defaultIndex));
  for (const c of sorted) track.append(c);

  renumberLayers();
  document.dispatchEvent(new CustomEvent('hs:reorder'));


  // 4. Hero button and the "personalised for" line.
  const cta = document.querySelector('[data-persona-cta]');
  if (cta) {
    const c = CTA[p];
    cta.hidden = !c;
    if (c) {
      if (first) cta.textContent = c.text; else retoken(cta, c.text);
      cta.href = c.href;
      if (c.external) { cta.target = '_blank'; cta.rel = 'noopener'; } else { cta.removeAttribute('target'); cta.removeAttribute('rel'); }
      if (c.resume) { cta.dataset.resume = ''; cta.setAttribute('download', 'Sahaj-Saliya-Resume.pdf'); } else { delete cta.dataset.resume; cta.removeAttribute('download'); }
    }
  }
  const line = document.querySelector('[data-persona-line]');
  if (line) {
    line.hidden = false;
    const name = line.querySelector('[data-persona-name]');
    if (first) name.textContent = LABEL[p]; else retoken(name, LABEL[p]);
    line.querySelectorAll('[data-persona]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persona === p)));
    line.querySelector('.seg-resume')?.classList.toggle('is-primary', p === 'recruiter');
  }
  document.dispatchEvent(new CustomEvent('persona:change', { detail: { persona: p } }));
}

// Renumbers layers so the rail and tags always read 1..N in page order (also after an agent swaps two cards).
// Projects are "Head n" layers and products "Block n" layers; each card counts within its own section.
export function renumberLayers() {
  const main = document.querySelector('main');
  if (!main || !document.getElementById('work')) return;
  const layers = [...main.querySelectorAll('.layer[data-layer]')];
  const count = new Map();
  layers.forEach((layer, i) => {
    const n = i + 1;
    layer.dataset.layer = String(n);
    const tag = layer.querySelector('.layer-tag[data-lt]');
    if (tag) tag.textContent = `Layer ${pad(n)} · ${tag.dataset.lt}`;
    if (layer.classList.contains('card')) {
      const sec = layer.closest('section');
      const k = (count.get(sec) || 0) + 1;
      count.set(sec, k);
      layer.dataset.layerName = `${sec.id === 'products' ? 'Block' : 'Head'} ${k} · ${layer.querySelector('.card-title').textContent}`;
      const ci = layer.querySelector('[data-ci]');
      if (ci) ci.textContent = pad(k);
    }
  });
  for (const sec of main.querySelectorAll('section:has(> .layer-head [data-lt-range])')) {
    const nums = [...sec.querySelectorAll('[data-hs-track] > .card')].map((c) => Number(c.dataset.layer));
    const rangeTag = sec.querySelector('.layer-tag[data-lt-range]');
    if (rangeTag && nums.length) rangeTag.textContent = `Layers ${pad(Math.min(...nums))}–${pad(Math.max(...nums))} · ${rangeTag.dataset.ltRange}`;
  }
}

function wireSwitch() {
  const line = document.querySelector('[data-persona-line]');
  if (!line) return;
  const toggle = line.querySelector('[data-persona-switch]');
  const menu = line.querySelector('[data-persona-menu]');
  const seg = menu.querySelector('[data-seg]');
  const pill = menu.querySelector('.seg-pill');
  // the highlight pill slides under the active option
  const place = (b, instant = false) => {
    if (!b || !pill) return;
    pill.style.transition = instant ? 'none' : '';
    pill.style.width = `${b.offsetWidth}px`;
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  const active = () => seg.querySelector('[aria-pressed="true"]');
  let closing = 0;
  const open = () => {
    clearTimeout(closing);
    menu.hidden = false;
    place(active(), true);
    requestAnimationFrame(() => menu.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
  };
  const close = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    closing = setTimeout(() => { menu.hidden = true; }, reduced() ? 0 : 240);
  };
  toggle.addEventListener('click', () => (menu.hidden || !menu.classList.contains('is-open') ? open() : close()));
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); toggle.focus(); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !line.contains(e.target)) close(); });
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-persona]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    try { sessionStorage.setItem('personaPick', b.dataset.persona); } catch { /* storage blocked */ }
    place(b);
    const main = document.querySelector('main');
    const move = [...main.querySelectorAll(':scope > section:not(#top)')];
    smoothChange(() => apply(b.dataset.persona), { move, ms: 420 }).then(() => setTimeout(close, 180));
  });
}
