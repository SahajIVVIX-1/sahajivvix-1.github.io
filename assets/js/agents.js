// Live agents: three small labelled cursors (planner, designer, critic) that move between elements while the visitor
// reads, pause, make one small cosmetic change and move on, so every visit looks a little different.
// Rules: one action every 6–12 s and only one agent at a time; every change comes from a fixed list and is reversible;
// facts, numbers, names, dates and links are never touched. Agents wait while the visitor types, drags, uses the chat
// or a panel, never act on the element under the pointer, and are off with reduced motion. Choices come from a seeded
// generator (time + visitor id; ?seed=123 makes a visit repeatable). Nothing is sent anywhere.
import { smoothChange } from './motion.js';
import { renumberLayers } from './persona.js';

const AGENTS = [
  { id: 'planner', color: 'var(--m1)' },
  { id: 'designer', color: 'var(--m3)' },
  { id: 'critic', color: 'var(--m0)' },
];
// accents the designer may use, per theme (all keep text contrast on the paper)
const ACCENTS = {
  light: ['#B23E0E', '#A63D12', '#B0451C', '#9F3A20', '#A5402A'],
  dark: ['#FF8A5B', '#F28C5A', '#FF9466', '#F79E6E', '#FF8160'],
};
const PATTERNS = ['pat-dots', 'pat-grid', 'pat-lines', ''];
const TINTS = ['var(--m0)', 'var(--m1)', 'var(--m2)', 'var(--m3)', 'var(--m4)'];
// what the critic may say, and where
const NOTES = [
  ['.card .metric-val', 'strong result'],
  ['.card .evals', 'measured, not claimed'],
  ['.card .cb-row dd.muted', 'limits stated honestly ✓'],
  ['.role-title', 'real-world impact'],
  ['#recognition dd', 'verified certificate'],
  ['#map .layer-title', 'try asking it ↗'],
  ['.about-text .lead', 'see map ↗'],
  ['.card-task', 'clear task definition'],
];
const SESSION = 'agentsState';

// mulberry32
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// skill ids (w00, w01, …) always count in display order, also after the planner reorders a group
function renumberSkills() {
  document.querySelectorAll('.sg-items .w').forEach((w, i) => { w.textContent = `w${String(i).padStart(2, '0')}`; });
}

export function initAgents() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !document.getElementById('top')) return;
  const param = new URLSearchParams(location.search).get('seed');
  const seed = param && /^\d+$/.test(param) ? Number(param) : (Date.now() ^ hash(window.__visitor || 'visitor')) >>> 0;
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  let state = 'running';
  try { state = sessionStorage.getItem(SESSION) || 'running'; } catch { /* storage blocked */ }

  /* ---------- UI: cursors, status chip, log ---------- */
  const cursors = Object.fromEntries(AGENTS.map((a, k) => {
    const el = document.createElement('div');
    el.className = 'agent-cursor';
    el.dataset.agent = a.id;
    el.style.setProperty('--ac', a.color);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<i class="ag-trail"></i><i class="ag-trail"></i><svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 1l5.6 13.2 1.9-5.3 5.3-1.9z"/></svg><span>${a.id}</span>`;
    document.body.append(el);
    park(el, k);
    return [a.id, el];
  }));
  // resting cursors wait in a column above the status chip, one label per row so they never overlap
  function park(el, k) { el.classList.remove('is-active'); place(el, 14, innerHeight - 96 - k * 26); }
  function place(el, x, y) { el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; }

  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'agents-chip mono';
  chip.setAttribute('aria-expanded', 'false');
  chip.setAttribute('aria-controls', 'agents-log');
  const panel = document.createElement('section');
  panel.className = 'agents-panel';
  panel.id = 'agents-log';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Agent log');
  panel.innerHTML = `<header class="mono"><b>agent trace</b><span>seed ${seed}</span></header><ol class="agents-log mono" aria-live="polite"></ol><footer><button type="button" data-ag="pause"></button><button type="button" data-ag="off"></button></footer>`;
  document.body.append(chip, panel);
  const logEl = panel.querySelector('.agents-log');
  const render = () => {
    chip.innerHTML = `<i class="ag-dot" data-state="${state}"></i>agents · ${state === 'running' ? '3 running' : state}`;
    panel.querySelector('[data-ag="pause"]').textContent = state === 'paused' ? 'resume' : 'pause';
    panel.querySelector('[data-ag="pause"]').disabled = state === 'off';
    panel.querySelector('[data-ag="off"]').textContent = state === 'off' ? 'turn on' : 'turn off';
    document.documentElement.classList.toggle('agents-off', state === 'off');
  };
  const setState = (s) => { state = s; try { sessionStorage.setItem(SESSION, s); } catch { /* ignore */ } render(); if (s === 'running') schedule(); };
  const showPanel = (on) => { panel.hidden = !on; chip.setAttribute('aria-expanded', String(on)); document.documentElement.classList.toggle('agents-log-open', on); };
  chip.addEventListener('click', () => showPanel(panel.hidden));
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ag]'); if (!b) return;
    if (b.dataset.ag === 'pause') setState(state === 'paused' ? 'running' : 'paused');
    else setState(state === 'off' ? 'running' : 'off');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { showPanel(false); chip.focus(); } });
  const log = (agent, call) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="ag-t">${new Date().toTimeString().slice(0, 8)}</span> <b style="color:${AGENTS.find((a) => a.id === agent).color}">${agent}</b> → <span></span>`;
    li.lastChild.textContent = call;
    logEl.prepend(li);
    while (logEl.children.length > 40) logEl.lastChild.remove();
  };
  render();

  /* ---------- when not to act ---------- */
  let dragging = false, lastInput = 0, pointer = [-1, -1];
  addEventListener('pointerdown', () => { dragging = true; }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; }, { passive: true });
  addEventListener('pointermove', (e) => { pointer = [e.clientX, e.clientY]; }, { passive: true });
  addEventListener('keydown', () => { lastInput = performance.now(); }, { passive: true });
  const busy = () => {
    const a = document.activeElement;
    return document.hidden || dragging || performance.now() - lastInput < 4000
      || (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable))
      || document.querySelector('.ask.is-open, .persona-menu.is-open, .gwr-lb, .palette:not([hidden])');
  };
  const underPointer = (el) => { const r = el.getBoundingClientRect(); return pointer[0] >= r.left - 8 && pointer[0] <= r.right + 8 && pointer[1] >= r.top - 8 && pointer[1] <= r.bottom + 8; };
  const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 70 && r.top < innerHeight - 40 && r.right > 0 && r.left < innerWidth; };
  const visible = (sel) => [...document.querySelectorAll(sel)].filter((el) => onScreen(el) && !underPointer(el));

  /* ---------- the actions (all cosmetic, all reversible) ---------- */
  const root = document.documentElement;
  const theme = () => (root.dataset.effectiveTheme === 'dark' ? 'dark' : 'light');
  document.addEventListener('themechange', () => root.style.removeProperty('--accent'));
  const ACTIONS = {
    designer: [
      () => {
        const el = visible('.layer-title em, .metric-val, .hero-title .k, .tok-link')[0];
        if (!el) return null;
        const now = getComputedStyle(root).getPropertyValue('--accent').trim().toUpperCase();
        const c = pick(ACCENTS[theme()].filter((x) => x.toUpperCase() !== now));
        return { el, call: `recolor("--accent", "${c}")`, run: () => root.style.setProperty('--accent', c) };
      },
      () => {
        const sec = visible('main > section.layer:not(#top):not(#map), main > section.work')[0];
        if (!sec) return null;
        const cur = PATTERNS.find((p) => p && sec.classList.contains(p)) || '';
        const next = pick(PATTERNS.filter((p) => p !== cur));
        return { el: sec.querySelector('.layer-head, header') || sec, call: `pattern("#${sec.id}", "${next || 'none'}")`, run: () => { PATTERNS.forEach((p) => p && sec.classList.remove(p)); if (next) sec.classList.add(next); sec.classList.add('has-pat'); } };
      },
      () => {
        const chips = visible('.focus-chips li, .stack li, .map-chip, .sg-items li');
        if (!chips.length) return null;
        const el = pick(chips), t = pick(TINTS);
        return { el, call: `recolor(chip "${el.textContent.replace(/^w\d+/, '').trim().slice(0, 24)}", "${t.replace(/var\(--(m\d)\)/, '$1')}")`, run: () => { el.style.setProperty('--tint', t); el.classList.add('ag-tint'); } };
      },
      () => {
        const el = visible('[data-think]')[0];
        return el && { el, call: 'swap_verb(".think")', run: () => document.dispatchEvent(new Event('think:swap')) };
      },
    ],
    planner: [
      () => {
        const lists = visible('.sg-items').filter((ul) => ul.children.length >= 3);
        if (!lists.length) return null;
        const ul = pick(lists), items = [...ul.children];
        const order = items.map((li) => [li, R()]).sort((a, b) => a[1] - b[1]).map(([li]) => li);
        const name = ul.closest('.skill-group')?.querySelector('.sg-name')?.textContent || 'skills';
        return { el: ul, call: `reorder(".sg-items[${name}]")`, run: () => smoothChange(() => { order.forEach((li) => ul.append(li)); renumberSkills(); }, { move: items, ms: 450, vt: false }) };
      },
      () => {
        const work = document.getElementById('work');
        const cards = work ? [...work.querySelectorAll(':scope > .card')] : [];
        const k = cards.findIndex((c, i) => i < cards.length - 1 && (onScreen(c) || onScreen(cards[i + 1])) && !underPointer(c) && !underPointer(cards[i + 1]));
        if (k < 0) return null;
        const a = cards[k], b = cards[k + 1];
        return { el: a.querySelector('.card-title') || a, call: `swap("#${a.id}", "#${b.id}")`, run: () => smoothChange(() => { b.after(a); renumberLayers(); }, { move: [a, b], ms: 450, vt: false }) };
      },
    ],
    critic: [
      () => {
        const options = NOTES.flatMap(([sel, note]) => visible(sel).map((el) => [el, note]));
        if (!options.length) return null;
        const [el, note] = pick(options);
        return { el, call: `comment("${note}")`, run: () => comment(el, note) };
      },
    ],
  };

  function comment(el, note) {
    el.classList.add('critic-mark');
    const b = document.createElement('div');
    b.className = 'critic-bubble mono';
    b.setAttribute('role', 'note');
    b.textContent = note;
    document.body.append(b);
    const r = el.getBoundingClientRect();
    b.style.left = `${Math.min(innerWidth - 16 - b.offsetWidth, Math.max(16, r.right - b.offsetWidth / 2))}px`;
    b.style.top = `${Math.max(76, r.top - b.offsetHeight - 10)}px`;
    requestAnimationFrame(() => b.classList.add('is-in'));
    setTimeout(() => b.classList.remove('is-in'), 3800);
    setTimeout(() => { b.remove(); el.classList.remove('critic-mark'); }, 4400);
  }

  /* ---------- the loop ---------- */
  let timer = 0, acting = false;
  function schedule(ms = 6000 + R() * 6000) {
    clearTimeout(timer);
    if (state !== 'running') return;
    timer = setTimeout(tick, ms);
  }
  async function tick() {
    if (state !== 'running' || acting) return;
    if (busy()) { schedule(2000); return; }
    const agent = pick(AGENTS).id;
    const choices = ACTIONS[agent].map((f) => f()).filter(Boolean);
    if (!choices.length) { schedule(2500); return; }
    const act = pick(choices);
    acting = true;
    const cur = cursors[agent];
    cur.classList.add('is-active');
    const r = act.el.getBoundingClientRect();
    place(cur, r.left + Math.min(r.width * 0.6, 160), r.top + Math.min(r.height * 0.5, 30));
    await wait(1000);
    // check again: the visitor may have started typing or moved onto the element meanwhile
    if (state === 'running' && !busy() && act.el.isConnected && !underPointer(act.el) && onScreen(act.el)) {
      await act.run();
      log(agent, act.call);
    }
    await wait(900);
    park(cur, AGENTS.findIndex((a) => a.id === agent));
    acting = false;
    schedule();
  }
  addEventListener('resize', () => AGENTS.forEach((a, k) => { if (!cursors[a.id].classList.contains('is-active')) park(cursors[a.id], k); }));
  if (state === 'running') schedule(3500);
}
