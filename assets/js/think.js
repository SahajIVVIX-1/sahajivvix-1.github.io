// Hero "thinking" line. A spinner verb is written as ONE continuous word in the tagline's italic serif; token
// boundaries show as very soft, edge-to-edge highlights behind the letters (like the OpenAI tokenizer page).
// Tokens arrive whole, left to right; the finished word is held for a few seconds, fades out as one piece,
// and the next verb streams in. One meta line under it carries the timer and the running token count.
// On wide screens a faint panel shows the candidates for the NEXT verb; the sampled winner becomes the next verb.
import { HERO_VERBS } from './hero-verbs.js';
import { tokenize, createBag, formatElapsed } from './think-core.js';

const TOKEN_MS = [90, 120];     // per whole token while streaming
const HOLD_MS = [3000, 4900];   // a finished verb stays this long
const FADE_MS = 260;            // the old word fades out as one piece
const SWAP_MS_CALM = 6000;      // reduced motion: crossfade to a new verb every 6 s, nothing streams
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
  async function sleep(ms) {
    let left = ms;
    while (left > 0) {
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

  async function stream(verb) {
    const toks = tokenize(verb);
    for (let i = 0; i < toks.length; i++) {
      await gate();
      word.append(makeTok(toks[i], i)); // fades in with a tiny upward motion (CSS)
      live++;
      renderMeta();
      if (i < toks.length - 1) await sleep(rnd(...TOKEN_MS)); // no trailing pause: the hold starts at the last token
    }
  }

  async function fadeOut() {
    line.classList.add('is-out');
    await sleep(FADE_MS);
    word.replaceChildren();
    line.classList.remove('is-out');
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
      await sleep(Math.max(500, hold - 700));
      renderNext(true);                 // the sampled winner lights up shortly before the switch
      await sleep(700);
      await fadeOut();
      verb = bag.take(cand.words[cand.win]);
    }
  }

  async function loopCalm() {
    for (;;) {
      const verb = bag();
      if (word.childNodes.length) { line.classList.add('is-out'); await sleep(350); word.replaceChildren(); }
      live += fill(verb, false).length;
      line.classList.remove('is-out');
      announce(verb);
      renderMeta();
      await sleep(SWAP_MS_CALM - 350); // the 350 ms crossfade is part of the 6 s
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
