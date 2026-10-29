// "Ask my portfolio" panel. Loaded only when first opened.
import { createEngine, uniqSources } from './engine.js';
import { webgpuSupport, loadLLM } from './llm.js';
import { checkOrigin } from '../origin.js';
import { setBusy } from '../busy.js';
import { createTools } from './tools.js';
import { ACTION, NEAR, planRules, planLLM } from './planner.js';

const STARTERS = [
  'Show me your best CV project',
  'What does Sahaj work on?',
  'Tell me about CrohnSight',
  'What did he do at HNNOIX?',
  'Does he know RAG?',
  'Is he available for internships?',
  'How do I contact him?',
];

let api;
export function initAsk() {
  if (api) return api;
  checkOrigin();
  const root = document.getElementById('ask-root');
  root.innerHTML = `
  <div class="ask" role="dialog" aria-modal="false" aria-labelledby="ask-h" hidden>
    <div class="ask-tx mono" data-tx aria-hidden="true" title="The parts of a transformer: retrieval lights attention, writing lights the feed-forward block"><span data-b="embed">embed</span><i></i><span data-b="attn">attention · 4 heads</span><i></i><span data-b="ffn">ffn</span><i></i><span data-b="softmax">softmax</span></div>
    <header class="ask-head">
      <div>
        <h2 id="ask-h" class="ask-title">Ask my <em>portfolio</em></h2>
        <p class="ask-status mono" data-status>loading index…</p>
      </div>
      <button class="ask-x" type="button" aria-label="Close chat" data-close>×</button>
    </header>
    <div class="ask-llm mono" data-llm hidden><span data-llm-text></span><span class="ask-bar"><i data-llm-bar></i></span><button type="button" class="ask-llm-btn" data-llm-btn hidden></button></div>
    <ol class="ask-log" aria-live="polite" data-log>
      <li class="msg bot"><p>Hi! I answer questions about Sahaj from his own data: projects, skills, experience, education and contact. Every answer links its source.</p></li>
    </ol>
    <div class="ask-chips" data-chips>${STARTERS.map((q) => `<button type="button" class="chip mono">${q}</button>`).join('')}</div>
    <form class="ask-form" data-form>
      <label class="sr" for="ask-in">Your question</label>
      <input id="ask-in" class="ask-in" type="text" autocomplete="off" maxlength="300" placeholder="Ask about projects, skills, experience…" required>
      <button class="ask-send shimmer" type="submit" aria-label="Send question"><span aria-hidden="true">↑</span></button>
    </form>
  </div>`;

  const panel = root.querySelector('.ask');
  const log = root.querySelector('[data-log]');
  const input = root.querySelector('#ask-in');
  const form = root.querySelector('[data-form]');
  const status = root.querySelector('[data-status]');
  const llmBox = root.querySelector('[data-llm]');
  const llmText = root.querySelector('[data-llm-text]');
  const llmBar = root.querySelector('[data-llm-bar]');
  const llmBtn = root.querySelector('[data-llm-btn]');
  const send = root.querySelector('.ask-send');
  let opener = null, llm = null, llmLoading = false, history = [];

  // Agent: the bot can act on the page. On phones the panel covers the page, so it steps aside after the first
  // visible action of a plan; actions are announced in a live region outside the panel so that still works.
  const live = document.createElement('p');
  live.className = 'sr';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.append(live);
  let stepAside = false;
  const agent = createTools({
    projects: [...document.querySelectorAll('article.card[id^="p-"]')].map((el) => ({ id: el.id.slice(2), name: el.querySelector('.card-title')?.textContent || el.id }))
      .concat(document.querySelector('article.card[id^="p-"]') ? [] : ['crohnsight', 'agentic-rag', 'openenv', 'student-xai', 'dcgan'].map((id) => ({ id, name: id }))),
    onPhoneAction: () => { if (stepAside && matchMedia('(max-width: 699px)').matches) { stepAside = false; setTimeout(close, 450); } },
  });

  const enginePromise = createEngine().then((eng) => {
    status.textContent = `retrieval ready · ${eng.qaCount} answers · ${eng.chunks.length} passages`;
    eng.loadEmbedder().then((ok) => { if (ok) status.textContent = `semantic search on · MiniLM-L6 · ${eng.chunks.length} passages`; });
    return eng;
  }).catch(() => { status.textContent = 'could not load the index, try again later'; return null; });

  // Offer the local LLM only where WebGPU exists. Auto-start on unmetered desktops, otherwise ask.
  webgpuSupport().then((kind) => {
    if (!kind) return;
    llmBox.hidden = false;
    const metered = navigator.connection?.saveData || /2g|3g/.test(navigator.connection?.effectiveType || '') || matchMedia('(max-width: 700px)').matches;
    const start = () => {
      if (llmLoading) return;
      llmLoading = true;
      llmBtn.hidden = true;
      llmText.textContent = 'downloading Qwen2.5-1.5B (≈1 GB, cached after the first time)…';
      loadLLM(kind, (p) => { llmBar.style.width = `${Math.round(p * 100)}%`; llmText.textContent = `loading Qwen2.5-1.5B · ${Math.round(p * 100)}%`; })
        .then((m) => { llm = m; llmText.textContent = 'Qwen2.5-1.5B running on your GPU · conversational answers on'; llmBox.classList.add('is-ready'); })
        .catch(() => { llmText.textContent = 'local model unavailable, using retrieval answers'; llmBox.classList.add('is-ready'); });
    };
    if (metered) {
      llmText.textContent = 'Your device can run a local LLM for conversational answers.';
      llmBtn.textContent = 'Load (≈1 GB)';
      llmBtn.hidden = false;
      llmBtn.onclick = start;
    } else start();
  });

  let closeTimer = 0;
  function open(q) {
    opener = document.activeElement;
    clearTimeout(closeTimer);
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    input.focus();
    if (q) ask(q);
  }
  function close() {
    panel.classList.remove('is-open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { panel.hidden = true; }, 250);
    opener?.focus?.({ preventScroll: true }); // a focus scroll would cut short an agent's smooth scroll
  }

  root.querySelector('[data-close]').addEventListener('click', close);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  root.querySelector('[data-chips]').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) ask(b.textContent); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const q = input.value.trim(); if (q) { input.value = ''; ask(q); } });

  // The small transformer diagram follows what the bot is doing: attention while it retrieves, the feed-forward block
  // while it writes or acts, softmax as the answer lands.
  const tx = root.querySelector('[data-tx]');
  let txTimer = 0;
  const stageTo = (s) => { clearTimeout(txTimer); tx.dataset.stage = s; if (s === 'softmax') txTimer = setTimeout(() => { delete tx.dataset.stage; }, 900); };

  async function ask(q) {
    addMsg('user', q);
    const bubble = addMsg('bot', '');
    bubble.classList.add('is-thinking');
    bubble.querySelector('p').innerHTML = '<span class="dots mono">attending<span>.</span><span>.</span><span>.</span></span>';
    send.classList.add('is-busy');
    setBusy('chat', true);
    stageTo('attn');
    const eng = await enginePromise;
    if (!eng) { finish(bubble, 'The index failed to load. Please email sahajs7959@gmail.com.', []); return; }

    if (ACTION.test(q)) {
      const plan = (llm && await planLLM(q, eng, llm, agent.check, agent.docs)) || await planRules(q, eng);
      if (plan.steps.length) {
        const out = await act(bubble, plan);
        history.push({ role: 'user', content: q }, { role: 'assistant', content: out.text });
        finish(bubble, out.text, out.sources, plan.by === 'llm' ? 'agent · Qwen2.5-1.5B plan' : 'agent · rule-based plan');
        return;
      }
    }
    const res = await eng.answer(q);
    let text = res.text, sources = res.sources, by = res.kind === 'bank' ? 'answer bank' : res.kind === 'retrieval' ? 'retrieved passage' : '';

    // Retrieval answers get rewritten conversationally by the local LLM when it is ready.
    if (llm && res.kind === 'retrieval') {
      const passages = res.hits.kb.slice(0, 4).map((s) => s.x);
      bubble.classList.remove('is-thinking');
      const p = bubble.querySelector('p');
      p.textContent = '';
      let out = '';
      try {
        stageTo('ffn');
        for await (const piece of llm.stream(q, passages, history)) { out += piece; p.textContent = out; }
        if (out.trim()) { text = out.trim(); by = 'Qwen2.5-1.5B + retrieval'; sources = uniqSources(passages.slice(0, 2)); }
      } catch { /* keep the retrieval answer */ }
    }
    history.push({ role: 'user', content: q }, { role: 'assistant', content: text });
    finish(bubble, text, sources, by);
  }

  // Runs a plan step by step and shows it as an agent trace: tool(args) → result. Stops at the first failure.
  async function act(bubble, plan) {
    const eng = await enginePromise;
    bubble.classList.remove('is-thinking');
    bubble.querySelector('p').textContent = '';
    const trace = document.createElement('ol');
    trace.className = 'trace mono';
    trace.setAttribute('aria-hidden', 'true'); // announced step by step in the live region instead
    bubble.prepend(trace);
    const pace = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    stageTo('ffn');
    stepAside = true;
    const done = [];
    for (const step of plan.steps) {
      const li = document.createElement('li');
      const args = Object.values(step.args).filter((v) => v !== '').map((v) => JSON.stringify(v)).join(', ');
      li.innerHTML = `<span class="tr-call">${esc(step.name)}(${esc(args)})</span><span class="tr-out"></span>`;
      li.className = 'is-run';
      trace.append(li);
      log.scrollTop = log.scrollHeight;
      await new Promise((r) => setTimeout(r, pace));
      const outEl = li.querySelector('.tr-out');
      try {
        let result;
        if (step.name === 'search_projects') result = (step.ranked || []).slice(0, 3).map((p) => `${p.id} ${p.score.toFixed(2)}`).join(' · ');
        else result = await agent.tools[step.name].run(step.args, { from: li });
        li.className = 'is-ok';
        outEl.textContent = ` → ${result}`;
        done.push({ step, result });
        if (step.name !== 'search_projects') live.textContent = `${step.name.replace('_', ' ')}: ${result}`;
      } catch (e) {
        li.className = 'is-err';
        outEl.textContent = ` ✗ ${e.message}`;
        live.textContent = `Could not ${step.name.replace('_', ' ')}: ${e.message}`;
        return { text: `I couldn't do that on this page (${e.message}).`, sources: [] };
      }
    }
    stepAside = false;

    if (plan.focus) {
      const r = plan.ranked || [];
      const top = r.find((p) => p.id === plan.focus) || { name: plan.focus };
      const res = await eng.answer(`What is ${top.name}?`);
      const near = r.filter((p) => p.score >= (r[0]?.score ?? 0) - NEAR);
      const fmt = (list) => list.map((p) => `${p.name} ${p.score.toFixed(2)}`).join(', ');
      const why = plan.best && near.length > 1 ? ` Several projects match your request about equally (retrieval: ${fmt(near)}); this is the one he lists first in his work.`
        : r[0]?.id === plan.focus && r[1] ? ` It is the closest match to your request among his projects (retrieval ${r[0].score.toFixed(2)}, next ${fmt([r[1]])}).` : '';
      return { text: `Here is ${top.name}, model card open.${why} ${res.text}`, sources: res.sources };
    }
    const say = {
      switch_theme: (s) => `Switched the theme to ${s.args.mode}.`,
      open_certificate: () => 'Opened his Guinness World Records Certificate of Participation.',
      filter_map: (s, r) => `Searched the embedding map for “${s.args.query}”: ${r}.`,
      copy_link: (s, r) => `${r[0].toUpperCase()}${r.slice(1)} to your clipboard.`,
      scroll_to: (s, r) => `Here you are: ${r.replace(/^at /, '')}.`,
    };
    const last = done.filter((d) => say[d.step.name]).pop();
    return { text: last ? say[last.step.name](last.step, last.result) : 'Done.', sources: [] };
  }

  function finish(bubble, text, sources, by = '') {
    stageTo('softmax');
    send.classList.remove('is-busy');
    setBusy('chat', false);
    bubble.classList.remove('is-thinking');
    const p = bubble.querySelector('p');
    p.innerHTML = linkify(text);
    if (sources?.length || by) {
      const cite = document.createElement('p');
      cite.className = 'cite mono';
      cite.innerHTML = `${by ? `<span class="muted">${by}</span>` : ''}${sources.map((s) => `<a class="tok-link" href="${s.url}"${s.url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${esc(s.label)}</a>`).join('')}`;
      cite.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a && a.getAttribute('href').startsWith('/#') && (location.pathname === '/' || /^\/ip=/.test(location.pathname))) { close(); } });
      bubble.append(cite);
    }
    log.scrollTop = log.scrollHeight;
  }

  function addMsg(who, text) {
    const li = document.createElement('li');
    li.className = `msg ${who}`;
    li.innerHTML = `<p>${esc(text)}</p>`;
    log.append(li);
    log.scrollTop = log.scrollHeight;
    return li;
  }

  api = { open, close };
  return api;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function linkify(s) {
  return esc(s)
    .replace(/https?:\/\/[^\s)]+[^\s).,]/g, (u) => `<a class="tok-link" href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, '')}</a>`)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => `<a class="tok-link" href="mailto:${m}">${m}</a>`);
}
