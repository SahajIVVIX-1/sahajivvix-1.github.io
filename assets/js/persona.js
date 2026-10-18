// Personalises the page for the visitor "intent" guessed by the boot screen (a heuristic, see scripts/boot/boot.js).
// The static HTML stays in the default order for crawlers and no-JS visitors; this only reorders in the browser.
// The visitor can always correct the guess with "not you? switch".

const NAMES = ['recruiter', 'developer', 'researcher', 'curious'];
const LABEL = { recruiter: 'a recruiter', developer: 'a developer', researcher: 'a researcher', curious: 'a curious visitor' };
const MAIL = 'mailto:sahajs7959@gmail.com?subject=Resume%20request';

// Section order below the hero, per persona. Ids are the section ids in index.html.
const ORDER = {
  recruiter: ['about', 'experience', 'work', 'skills', 'certs', 'map', 'contact'],
  developer: ['work', 'map', 'skills', 'about', 'experience', 'certs', 'contact'],
  researcher: ['work', 'about', 'certs', 'experience', 'skills', 'map', 'contact'],
  curious: ['about', 'map', 'work', 'skills', 'experience', 'certs', 'contact'],
};
// Researchers see the research-flavoured projects first; everyone else keeps the default project order.
const CARD_ORDER = { researcher: ['crohnsight', 'openenv', 'dcgan', 'agentic-rag', 'student-xai'] };

// The hero's second button.
const CTA = {
  recruiter: { text: 'Request resume', href: MAIL },
  developer: { text: 'Browse code', href: 'https://github.com/SahajIVVIX-1', external: true },
  researcher: { text: 'Read the model cards', href: '#work' },
  curious: null,
};

const pad = (n) => String(n).padStart(2, '0');

// The visitor's own choice wins, then this page's guess, then the guess saved earlier in the session.
export function currentPersona() {
  let p = null;
  try {
    const pick = sessionStorage.getItem('personaPick');
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
    apply(currentPersona() || 'curious');
    wireSwitch();
  };
  if (currentPersona()) start();
  else {
    // First visit: the boot screen's classifier has not finished yet (it loads progressively).
    document.addEventListener('persona:ready', start, { once: true });
    setTimeout(start, 2500);
  }
}

function apply(p) {
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
  const cardIds = CARD_ORDER[p];
  const cards = [...work.querySelectorAll(':scope > .card')];
  const sorted = cardIds
    ? cardIds.map((id) => cards.find((c) => c.id === `p-${id}`)).filter(Boolean)
    : cards.slice().sort((a, b) => Number(a.dataset.defaultIndex) - Number(b.dataset.defaultIndex));
  for (const c of sorted) work.append(c);

  // 3. Renumber layers so the rail and tags always read 1..12 in page order.
  const layers = [...main.querySelectorAll('.layer[data-layer]')];
  let k = 0;
  layers.forEach((layer, i) => {
    const n = i + 1;
    layer.dataset.layer = String(n);
    const tag = layer.querySelector('.layer-tag[data-lt]');
    if (tag) tag.textContent = `Layer ${pad(n)} · ${tag.dataset.lt}`;
    if (layer.classList.contains('card')) {
      k++;
      layer.dataset.layerName = `Head ${k} · ${layer.querySelector('.card-title').textContent}`;
      const ci = layer.querySelector('[data-ci]');
      if (ci) ci.textContent = pad(k);
    }
  });
  const nums = sorted.map((c) => Number(c.dataset.layer));
  const rangeTag = work.querySelector('.layer-tag[data-lt-range]');
  if (rangeTag && nums.length) rangeTag.textContent = `Layers ${pad(Math.min(...nums))}–${pad(Math.max(...nums))} · ${rangeTag.dataset.ltRange}`;

  // 4. Hero button and the "personalised for" line.
  const cta = document.querySelector('[data-persona-cta]');
  if (cta) {
    const c = CTA[p];
    cta.hidden = !c;
    if (c) {
      cta.textContent = c.text;
      cta.href = c.href;
      if (c.external) { cta.target = '_blank'; cta.rel = 'noopener'; } else { cta.removeAttribute('target'); cta.removeAttribute('rel'); }
    }
  }
  const line = document.querySelector('[data-persona-line]');
  if (line) {
    line.hidden = false;
    line.querySelector('[data-persona-name]').textContent = LABEL[p];
    line.querySelectorAll('[data-persona]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persona === p)));
  }
  document.dispatchEvent(new CustomEvent('persona:change', { detail: { persona: p } }));
}

function wireSwitch() {
  const line = document.querySelector('[data-persona-line]');
  if (!line) return;
  const toggle = line.querySelector('[data-persona-switch]');
  const menu = line.querySelector('[data-persona-menu]');
  toggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    toggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-persona]');
    if (!b) return;
    try { sessionStorage.setItem('personaPick', b.dataset.persona); } catch { /* storage blocked */ }
    apply(b.dataset.persona);
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    scrollTo({ top: 0, behavior: 'auto' });
  });
}
