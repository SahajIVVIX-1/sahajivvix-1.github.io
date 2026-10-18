// Next-token generation for the hero. Each token shows its candidate distribution flickering
// (logits plus decaying noise, softmax at temperature T) before the chosen token locks in.
import { placePopup } from './popup.js';
import { setBusy } from './busy.js';

const T = 0.7;
const KEY_TOKENS = new Set(['reads', 'sees', 'acts']);

export function initHero() {
  const gens = [...document.querySelectorAll('[data-gen]')];
  if (!gens.length) return;
  const trace = document.querySelector('[data-trace]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = gens.reduce((n, g) => n + JSON.parse(g.dataset.gen).length, 0);

  if (reduced) {
    for (const g of gens) renderStatic(g);
    heroReady(total);
    return;
  }

  (async () => {
    await bootGate();
    setBusy('hero', true);
    let step = 0;
    for (const g of gens) {
      const rows = JSON.parse(g.dataset.gen);
      const label = g.textContent;
      g.textContent = '';
      g.append(srText(label));
      g.classList.add('is-live');
      await wait(Number(g.dataset.genDelay || 0));
      for (const row of rows) {
        step++;
        await sampleToken(g, row, step, total, trace);
      }
      g.classList.remove('is-live');
      g.classList.add('is-done');
    }
    heroReady(total);
  })();
}

// Tells the thinking line (think.js) that the name and tagline are finished, and how many tokens they took,
// so its running token count can continue from there.
function heroReady(tokens) {
  setBusy('hero', false);
  window.__heroReady = { tokens };
  document.dispatchEvent(new CustomEvent('hero:ready', { detail: { tokens } }));
}

// The hero starts generating as the boot screen dissolves (the inline script sets html.booting).
function bootGate() {
  return new Promise((resolve) => {
    if (!document.documentElement.classList.contains('booting')) return resolve();
    document.addEventListener('boot:done', resolve, { once: true });
    setTimeout(resolve, 4000);
  });
}

function renderStatic(g) {
  const rows = JSON.parse(g.dataset.gen);
  const label = g.textContent;
  g.textContent = '';
  g.append(srText(label));
  for (const r of rows) g.append(makeTok(r[0], false));
  g.classList.add('is-done');
}

function srText(t) {
  const s = document.createElement('span');
  s.className = 'sr';
  s.textContent = t;
  return s;
}

function makeTok(text, animate) {
  const s = document.createElement('span');
  s.className = 'tk' + (animate ? ' is-new' : '');
  s.setAttribute('aria-hidden', 'true');
  const word = text.trim().replace(/[^a-z]/gi, '').toLowerCase();
  if (KEY_TOKENS.has(word)) {
    // Keep the leading space outside the styled word so italics do not shift spacing.
    const lead = text.match(/^\s*/)[0];
    s.append(lead);
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = text.slice(lead.length);
    s.append(k);
  } else s.textContent = text;
  return s;
}

async function sampleToken(container, row, step, total, trace) {
  const cands = [];
  for (let i = 0; i < row.length; i += 2) cands.push({ t: row[i], p: row[i + 1] });
  const logits = cands.map((c) => Math.log(c.p) * T); // invert softmax(z / T) so the final probs match

  const anchor = document.createElement('span');
  anchor.className = 'tk';
  anchor.innerHTML = '&#8203;';
  container.append(anchor);
  const dist = document.createElement('div');
  dist.className = 'dist';
  dist.setAttribute('aria-hidden', 'true');
  dist.innerHTML = cands.map((c) => `<div class="dist-row"><span class="dist-tok">${vis(c.t)}</span><span class="dist-bar"><i></i></span><span class="dist-p"></span></div>`).join('');
  anchor.append(dist);
  // Above the token if there is room under the fixed header, else below, else beside; always inside the viewport.
  placePopup(anchor, dist);
  const bars = [...dist.querySelectorAll('.dist-bar i')];
  const ps = [...dist.querySelectorAll('.dist-p')];
  const rowsEl = [...dist.querySelectorAll('.dist-row')];

  const frames = 5 + Math.floor(Math.random() * 3);
  for (let f = 0; f <= frames; f++) {
    const noise = 1.6 * (1 - f / frames);
    const z = logits.map((l) => (l + (Math.random() - 0.5) * 2 * noise) / T);
    const p = softmax(z);
    p.forEach((v, i) => { bars[i].style.setProperty('--p', `${(v * 100).toFixed(1)}%`); ps[i].textContent = v.toFixed(2); });
    if (trace) trace.textContent = `step ${String(step).padStart(2, '0')}/${total} · T=${T} · top-k 4 · argmax "${vis(cands[p.indexOf(Math.max(...p))].t)}" p=${Math.max(...p).toFixed(2)}`;
    await wait(26 + f * 4);
  }
  rowsEl[0].classList.add('is-pick');
  await wait(90);
  const tok = makeTok(cands[0].t, true);
  anchor.replaceWith(tok);
  tok.append(dist);
  placePopup(tok, dist); // the token is now as wide as its text; keep the popup attached to it
  dist.classList.add('is-out');
  setTimeout(() => dist.remove(), 320);
  await wait(30);
}

const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
const vis = (t) => t.replace(/ /g, '·').replace(/</g, '&lt;');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
