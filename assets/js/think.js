// Hero "thinking" line. A spinner verb is written as ONE continuous word in the tagline's italic serif; token
// boundaries show as very soft, edge-to-edge highlights behind the letters (like the OpenAI tokenizer page).
// Tokens arrive whole, left to right; the finished word is held for a few seconds, then leaves the way it came:
// detokenised right to left, the caret walking back with it, a short blink, and the next verb streams in. The word's
// width eases between verbs so the line never jumps. One meta line under it carries the timer and token count.
// On wide screens a faint panel shows the candidates for the NEXT verb; the sampled winner becomes the next verb.
import { HERO_VERBS } from './hero-verbs.js';
import { tokenize, createBag, formatElapsed } from './think-core.js';

const TOKEN_MS = [90, 120];     // per whole token while streaming
const HOLD_MS = [3000, 4900];   // a finished verb stays this long
const LEAVE_MS = 50;            // between tokens as the old word detokenises right to left
const GONE_MS = 140;            // one token's own exit (fade, blur, 4px up)
const BLINK_MS = 150;           // just the caret, before the next verb
const SWAP_MS_CALM = 6000;      // reduced motion: crossfade to a new verb every 6 s, nothing streams
const CALM_FADE_MS = 200;
const ANNOUNCE_MS = 10000;      // the screen-reader text changes at most this often
const TINTS = 3;

const rnd = (a, b) => a + Math.random() * (b - a);
const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
const sample = (p) => { let u = Math.random(); for (let i = 0; i < p.length; i++) { u -= p[i]; if (u <= 0) return i; } return p.length - 1; };

export function initThink() {
  const root = document.querySelector('[data-think]');
  if (!root) return;
  const line = root.querySelector('.think-line');
  const word = root.querySelector('.think-word');
  const caret = root.querySelector('.think-caret');
  const nextEl = root.querySelector('.think-next');
  const sr = root.querySelector('.think-sr');
  const trace = document.querySelector('[data-trace]');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 1280px)');
  const bag = createBag(HERO_VERBS);

  let live = 0;            // tokens streamed by the verb line so far
  let base = 0;            // tokens the hero already generated (name + tagline)
  let t0 = 0;
  let started = false;
  let lastAnnounce = -Infinity;
  let cand = null;         // candidates for the next verb: { words, probs, win }

  /* ---------- pausing: hidden tab or hero out of view ---------- */
  let hidden = document.hidden;
  let offscreen = false;
  let waiters = [];
  const paused = () => hidden || offscreen;
  const resume = () => { if (!paused()) { const w = waiters; waiters = []; w.forEach((r) => r()); } };
  const gate = () => (paused() ? new Promise((r) => waiters.push(r)) : Promise.resolve());
  // Sleeps for `ms` of ACTIVE time: the clock stops while paused. It counts real elapsed time, so timer
  // drift never makes a verb stay longer than asked.
  // A 'think:swap' event ends the current verb's hold early.
  let swap = false;
  document.addEventListener('think:swap', () => { swap = true; });
  async function sleep(ms, skippable = false) {
    let left = ms;
    if (skippable) swap = false;
    while (left > 0) {
      if (skippable && swap) { swap = false; return; }
      await gate();
      const t = performance.now();
      await new Promise((r) => setTimeout(r, Math.min(left, 100)));
      if (!paused()) left -= performance.now() - t;
    }
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; resume(); });
  new IntersectionObserver((e) => { offscreen = !e[0].isIntersecting; resume(); }, { threshold: 0 }).observe(root);

  /* ---------- the single meta line: "1m07s · 45 tokens · <eos> withheld · waiting for your prompt_" ---------- */
  function renderMeta() {
    if (!trace) return;
    const s = Math.floor((performance.now() - t0) / 1000);
    const total = base + live;
    const tail = document.createElement('span');
    tail.className = 'm-tail';
    tail.textContent = ' · <eos> withheld · waiting for your prompt_';
    trace.replaceChildren(document.createTextNode(`${formatElapsed(s)} · ${total} token${total === 1 ? '' : 's'}`), tail);
  }
  function announce(verb) {
    const now = performance.now();
    if (now - lastAnnounce < ANNOUNCE_MS) return;
    lastAnnounce = now;
    sr.textContent = `Thinking: ${verb}…`;
  }

  /* ---------- tokens ---------- */
  function makeTok(tok, i) {
    const el = document.createElement('span');
    el.className = `tkn c${i % TINTS}`;
    el.textContent = tok.t;
    // The id only shows on hover (fine pointers); touch devices never see it.
    el.dataset.tip = `${tok.t.trim()} · id ${tok.id}`;
    return el;
  }
  const fill = (verb, animate) => tokenize(verb).map((tok, i) => { const el = makeTok(tok, i); if (!animate) el.classList.add('is-static'); word.append(el); return el; });

  // The word box eases to the width of the tokens it holds, so the caret glides and the line never jumps.
  const fit = () => { let w = 0; for (const t of word.children) if (!t.classList.contains('is-leaving')) w += t.offsetWidth; word.style.width = `${w}px`; };

  async function stream(verb) {
    const toks = tokenize(verb);
    for (let i = 0; i < toks.length; i++) {
      await gate();
      word.append(makeTok(toks[i], i)); // fades in with a tiny upward motion (CSS)
      fit();
      live++;
      renderMeta();
      if (i < toks.length - 1) await sleep(rnd(...TOKEN_MS)); // no trailing pause: the hold starts at the last token
    }
  }

  // The exit mirrors the entrance: right to left, each token fades, blurs and rises 4px while the caret walks back,
  // and the next-token panel's probabilities fade down. Runs on the pausable clock, so a hidden tab pauses it.
  async function fadeOut() {
    caret.classList.remove('is-waiting');
    nextEl?.classList.add('is-fading');
    const toks = [...word.children].reverse();
    for (const t of toks) {
      t.classList.add('is-leaving');
      fit();
      await sleep(LEAVE_MS);
    }
    await sleep(GONE_MS);
    word.replaceChildren();
    word.style.width = '0px';
    caret.classList.add('is-waiting');
    await sleep(BLINK_MS);
  }

  /* ---------- next-token panel (wide screens): candidates for the next verb, sampled like a model ---------- */
  function prepareNext() {
    const words = bag.peek(3);
    const probs = softmax(words.map(() => rnd(-1.1, 1.1)));
    cand = { words, probs, win: sample(probs) };
    renderNext(false);
  }
  function renderNext(reveal) {
    if (!nextEl || !cand || calm || !wide.matches) return;
    const head = document.createElement('div');
    head.className = 'nx-h';
    head.textContent = reveal ? 'next ▸ sampled' : 'next ▸ sampling';
    const rows = cand.words.map((w, i) => {
      const row = document.createElement('div');
      row.className = `nx-row${reveal && i === cand.win ? ' is-win' : ''}`;
      const bar = document.createElement('span');
      bar.className = 'nx-b';
      const fillEl = document.createElement('i');
      bar.append(fillEl);
      const label = document.createElement('span');
      label.className = 'nx-w';
      label.textContent = w;
      const p = document.createElement('span');
      p.className = 'nx-p';
      p.textContent = cand.probs[i].toFixed(2);
      row.append(label, p, bar);
      // the bar grows from a random width to its value (a short "settling" like a softmax)
      fillEl.style.width = `${Math.round(rnd(6, 60))}%`;
      requestAnimationFrame(() => requestAnimationFrame(() => { fillEl.style.width = `${Math.round(cand.probs[i] * 100)}%`; }));
      return row;
    });
    nextEl.replaceChildren(head, ...rows);
    nextEl.classList.remove('is-fading');
  }
  wide.addEventListener('change', () => { if (started && !calm) renderNext(false); });

  /* ---------- loops ---------- */
  async function loopMotion() {
    let verb = bag();
    for (;;) {
      announce(verb);
      caret.classList.remove('is-waiting');
      prepareNext();
      await stream(verb);
      caret.classList.add('is-waiting');
      const hold = rnd(...HOLD_MS);
      await sleep(Math.max(500, hold - 700), true);
      renderNext(true);                 // the sampled winner lights up shortly before the switch
      await sleep(700);
      await fadeOut();
      verb = bag.take(cand.words[cand.win]);
    }
  }

  async function loopCalm() {
    for (;;) {
      const verb = bag();
      if (word.childNodes.length) { line.classList.add('is-out'); await sleep(CALM_FADE_MS); word.replaceChildren(); }
      live += fill(verb, false).length;
      line.classList.remove('is-out');
      announce(verb);
      renderMeta();
      await sleep(SWAP_MS_CALM - CALM_FADE_MS); // the crossfade is part of the 6 s
    }
  }

  function start(tokensSoFar) {
    if (started) return;
    started = true;
    base = tokensSoFar;
    t0 = performance.now();
    root.classList.add('is-on');
    renderMeta();
    if (!calm) setInterval(() => { if (!paused()) renderMeta(); }, 1000);
    (calm ? loopCalm : loopMotion)();
  }

  // The line starts once the hero has finished writing its name and tagline.
  if (window.__heroReady) start(window.__heroReady.tokens);
  else document.addEventListener('hero:ready', (e) => start(e.detail.tokens), { once: true });
}
