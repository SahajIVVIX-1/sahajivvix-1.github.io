// The hero console: "reads · sees · acts", the tagline made into three things a visitor can try.
//   reads: ranks his projects against a topic or a job post (the chatbot's engine: BM25 at once, then MiniLM).
//   sees:  an image dropped, pasted or picked is embedded by CLIP on this device and matched to his work (see.js).
//   acts:  a task goes to the chat's agent, which plans tool calls and acts on the page (ask/).
// Until the visitor touches it, it replays real runs recorded at build time (content/console-demo.json), so the
// space is never empty and nothing is downloaded. The replay only plays on wide screens, while the hero is in view,
// the tab is visible and nobody is pointing at, typing in or focused on the console; it never runs a model itself.
import { setLoading, loader } from './loading.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TABS = ['reads', 'sees', 'acts'];

export function initRsa({ reducedMotion = false } = {}) {
  const root = document.querySelector('[data-rsa]');
  if (!root) return null;
  let demo = null;
  try { demo = JSON.parse(root.querySelector('[data-rsa-demo]').textContent); } catch { return null; }
  const $ = (s, el = root) => el.querySelector(s);
  const tabs = [...root.querySelectorAll('[data-rsa-tab]')];
  const panes = Object.fromEntries(TABS.map((t) => [t, $(`[data-rsa-pane="${t}"]`)]));
  const status = $('[data-rsa-status]');
  const modeEl = $('[data-rsa-mode]');
  const input = $('#rsa-in');
  let current = 'reads';
  let live = false; // the visitor has run something for real

  const setStatus = (t) => { status.textContent = t; };
  const setMode = (real) => { live = live || real; modeEl.textContent = real ? 'live · on this device' : 'recorded run'; root.classList.toggle('is-live', real); };
  const say = (type, detail) => document.dispatchEvent(new CustomEvent(type, { detail }));
  // while a model downloads or runs: the leaf-S loader beside the status line, and on the header logo
  let spin = null;
  async function busy(on) {
    setLoading('rsa', on);
    root.classList.toggle('is-busy', on);
    if (!on) { spin?.remove(); return; }
    spin ||= await loader('orbit', 16);
    if (spin && root.classList.contains('is-busy')) status.parentElement.prepend(spin);
  }

  // ---- tabs (arrow keys move between them, as in any tablist) ----
  function show(tab, { focus = false } = {}) {
    current = tab;
    tabs.forEach((b) => {
      const on = b.dataset.rsaTab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    for (const t of TABS) panes[t].hidden = t !== tab;
  }
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { stop(); show(b.dataset.rsaTab); });
    b.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!k) return;
      e.preventDefault(); stop();
      show(tabs[(i + k + tabs.length) % tabs.length].dataset.rsaTab, { focus: true });
    });
  });

  // ---- shared rendering ----
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function rows(pane, list) {
    const ol = $('[data-rsa-rows]', pane);
    const top = Math.max(...list.map((r) => r.s), 1e-6);
    ol.innerHTML = list.map((r, i) => `<li><a class="rsa-row" href="${esc(r.href)}"><span class="rsa-n mono">${i + 1}</span><span class="rsa-name">${esc(r.name)}</span><span class="rsa-bar" aria-hidden="true"><i style="--p:0%"></i></span><span class="rsa-p mono">${r.s.toFixed(2)}</span></a></li>`).join('');
    // the bars grow in one after another
    [...ol.querySelectorAll('.rsa-bar i')].forEach((bar, i) => setTimeout(() => bar.style.setProperty('--p', `${Math.round((list[i].s / top) * 100)}%`), 60 + i * 110));
  }
  const clearRows = (pane) => { $('[data-rsa-rows]', pane).innerHTML = ''; };
  async function typeLine(pane, text, token) {
    const q = $('[data-rsa-q]', pane);
    q.textContent = '› ';
    q.classList.add('is-typing');
    for (const ch of text) { if (token.stop) break; q.textContent += ch; await wait(28 + Math.random() * 30); }
    if (!token.stop) q.textContent = `› ${text}`; // a stopped replay must not overwrite what the visitor asked
    q.classList.remove('is-typing');
  }

  // ---- the replay ----
  let token = { stop: true };
  let n = 0;
  let inView = false, hovered = false, resumeT = 0;
  const wide = matchMedia('(min-width: 1100px)');
  const canPlay = () => !reducedMotion && !window.__plain && wide.matches && inView && !document.hidden && !hovered && !live
    && !root.contains(document.activeElement) && !input.value;

  async function play() {
    if (!token.stop || !canPlay()) return;
    const t = (token = { stop: false });
    setMode(false);
    while (!t.stop) {
      const tab = TABS[n % 3], k = Math.floor(n / 3);
      n++;
      show(tab);
      const pane = panes[tab];
      if (tab === 'reads') {
        const r = demo.reads[k % demo.reads.length];
        clearRows(pane);
        setStatus('ranking his projects · MiniLM + BM25 (recorded)');
        await typeLine(pane, r.q, t);
        if (t.stop) break;
        await wait(260);
        rows(pane, r.top.map(([id, name, s]) => ({ href: `#p-${id}`, name, s })));
        say('rsa:demo', { tab, top: r.top[0][1] });
      } else if (tab === 'sees') {
        const s = demo.sees[k % demo.sees.length];
        clearRows(pane);
        const img = $('[data-rsa-img]', pane);
        img.classList.add('is-swap');
        await wait(220);
        img.src = s.img; img.alt = s.what;
        img.classList.remove('is-swap');
        setStatus('embedding the image with CLIP (recorded)…');
        await typeLine(pane, s.what, t);
        if (t.stop) break;
        await wait(420);
        rows(pane, s.top.map(([name, href, p]) => ({ href, name, s: p })));
        setStatus(`CLIP ViT-B/32 · ${s.ms} ms on a laptop (recorded)`);
        say('rsa:demo', { tab, top: s.top[0][0] });
      } else {
        const a = demo.acts[k % demo.acts.length];
        const steps = $('[data-rsa-steps]', pane);
        steps.innerHTML = '';
        setStatus('the agent plans tool calls (recorded)');
        await typeLine(pane, a.q, t);
        const list = [
          `search_projects → ${a.ranked.map(([id, s]) => `${id} ${s.toFixed(2)}`).join(' · ')}`,
          `scroll_to #p-${a.focus}`, `highlight #p-${a.focus}`, `open_project ${demo.names[a.focus] || a.focus}`,
        ];
        for (let i = 0; i < list.length && !t.stop; i++) {
          await wait(420);
          const li = document.createElement('li');
          li.textContent = list[i];
          if (i === list.length - 1) li.className = 'is-hit';
          steps.append(li);
        }
        setStatus('pick a task above to run it for real');
        say('rsa:demo', { tab, top: demo.names[a.focus] || a.focus });
      }
      // hold the result, then the next tab
      for (let i = 0; i < 34 && !t.stop; i++) await wait(100);
    }
  }
  function stop() { token.stop = true; clearTimeout(resumeT); }
  const resumeSoon = (ms = 6000) => { clearTimeout(resumeT); resumeT = setTimeout(play, ms); };

  new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; if (inView) resumeSoon(900); else stop(); }, { threshold: 0.4 }).observe(root);
  root.addEventListener('pointerenter', () => { hovered = true; stop(); });
  root.addEventListener('pointerleave', () => { hovered = false; resumeSoon(); });
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', () => resumeSoon());
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else resumeSoon(1500); });
  wide.addEventListener('change', () => { if (wide.matches) resumeSoon(1500); else stop(); });

  // ---- reads: rank his projects for real ----
  let eng = null;
  $('[data-rsa-read]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length < 2) { setStatus('type a topic, a skill or paste a job post'); return; }
    stop(); setMode(true); busy(true);
    const pane = panes.reads;
    $('[data-rsa-q]', pane).textContent = `› ${q.length > 80 ? `${q.slice(0, 80)}…` : q}`;
    try {
      if (!eng) { setStatus("loading Sahaj's data…"); eng = await (await import('./ask/engine.js')).createEngine(); }
      const render = (list, how) => {
        rows(pane, list.slice(0, 3).map((p) => ({ href: `#p-${p.id}`, name: p.name, s: Math.max(0, p.score) })));
        setStatus(how);
        say('rsa:result', { tab: 'reads', top: list[0]?.name, real: true });
      };
      render(await eng.rankProjects(q), eng.semantic ? 'ranked by MiniLM + BM25 on this device' : 'ranked by keywords (BM25) · loading MiniLM for meaning…');
      if (!eng.semantic) {
        const ok = await eng.loadEmbedder((p) => { if (p.status === 'progress' && p.progress != null) setStatus(`loading MiniLM (≈23 MB, once)… ${Math.round(p.progress)}%`); });
        if (ok && input.value.trim() === q) render(await eng.rankProjects(q), 'ranked by MiniLM + BM25 on this device');
        else if (!ok) setStatus('ranked by keywords (BM25) · the meaning model could not load');
      }
    } catch (err) { console.warn('rsa reads:', err); setStatus('could not load the ranking data; please try again'); } finally { busy(false); }
  });

  // ---- sees: CLIP on an image the visitor adds ----
  const fileIn = $('[data-rsa-file]');
  const drop = $('[data-rsa-drop]');
  async function see(file) {
    if (!file || !/^image\//.test(file.type)) { setStatus('that is not an image'); return; }
    stop(); setMode(true); show('sees'); busy(true);
    const pane = panes.sees;
    const img = $('[data-rsa-img]', pane);
    img.src = URL.createObjectURL(file); img.alt = 'your image';
    $('[data-rsa-q]', pane).textContent = '› your image';
    clearRows(pane);
    try {
      const { embedImage } = await import('./see.js');
      const r = await embedImage(file, setStatus);
      rows(pane, r.work.slice(0, 3).map((w) => ({ href: w.u || '#work', name: w.label, s: w.p })));
      setStatus(`${r.other ? `looks most like ${r.other} · ` : ''}embedded on this device in ${r.ms} ms`);
      say('rsa:result', { tab: 'sees', top: r.work[0]?.label, real: true });
    } catch (err) { console.warn('rsa sees:', err); setStatus('the image model could not load; please try again'); } finally { busy(false); }
  }
  fileIn.addEventListener('change', () => { see(fileIn.files[0]); fileIn.value = ''; });
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('is-over'); see(e.dataTransfer.files[0]); });
  root.addEventListener('paste', (e) => { const f = [...(e.clipboardData?.files || [])].find((x) => /^image\//.test(x.type)); if (f) { e.preventDefault(); see(f); } });

  // ---- acts: the real agent, in the chat ----
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rsa-task]');
    if (!b) return;
    stop(); setMode(true);
    setStatus('running in the chat: the agent plans, then acts on the page');
    say('rsa:result', { tab: 'acts', top: b.dataset.rsaTask, real: true });
    window.__ask?.(b.dataset.rsaTask);
  });

  resumeSoon(1200);
  return { show, stop };
}
