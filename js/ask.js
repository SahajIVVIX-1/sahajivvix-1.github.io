const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6';
const STOP = new Set('a an and are as at be by for from has have he him his i in is it its me my of on or that the this to was what which who why how with you your does did do can about tell sahaj sahaj\'s saliya'.split(' '));
const EXPAND = {
rl: ['reinforcement', 'q-learning'], ml: ['machine', 'learning'], dl: ['deep', 'learning'], llm: ['llms', 'language'], llms: ['llm'],
genai: ['generative', 'llm'], hire: ['contact', 'open', 'work', 'roles'], hiring: ['contact', 'open', 'roles'], email: ['contact', 'reach'], contact: ['reach', 'email'],
job: ['roles', 'work', 'experience'], internship: ['intern', 'research'], intern: ['internship'], tools: ['tool', 'claude', 'langgraph'],
rag: ['retrieval', 'crag'], agents: ['agent', 'agentic'], agent: ['agentic', 'agents'], dsa: ['leetcode', 'algorithms'], leetcode: ['problems', 'solved'],
education: ['b.tech', 'pdeu', 'university', 'cgpa'], gpa: ['cgpa'], cgpa: ['gpa'], study: ['education', 'pdeu'], certificates: ['certifications'], certs: ['certifications'],
projects: ['project', 'built', 'repository'], built: ['project', 'repository'], vision: ['image', 'video', 'opencv'],
};
const tok = (s) => s.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').split(/[\s.-]+/).filter((t) => t.length > 1 && !STOP.has(t));
const stem = (t) => t.replace(/(ings?|ed|es|s)$/, '') || t;
function bm25(chunks) {
const docs = chunks.map((c) => tok(`${c.title} ${c.title} ${c.text}`).map(stem));
const N = docs.length, avg = docs.reduce((a, d) => a + d.length, 0) / N;
const df = new Map();
docs.forEach((d) => new Set(d).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
const tfs = docs.map((d) => { const m = new Map(); d.forEach((t) => m.set(t, (m.get(t) || 0) + 1)); return m; });
return {
idf,
search(q) {
const k1 = 1.4, b = 0.72;
return tfs.map((tf, i) => {
let s = 0;
for (const t of q) { const f = tf.get(t) || 0; if (f) s += idf(t) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * docs[i].length / avg)); }
return s;
});
},
};
}
export async function init(el) {
const log = el.querySelector('.ask-log'), form = el.querySelector('.ask-form'), input = el.querySelector('#ask-in');
const modeEl = el.querySelector('.ask-mode'), semEl = el.querySelector('.sem-toggle');
const chunks = await fetch('/data/corpus.json').then((r) => r.json());
const index = bm25(chunks);
let embed = null, chunkVecs = null, loading = null;
async function loadSemantic() {
if (loading) return loading;
modeEl.textContent = 'loading MiniLM…';
loading = (async () => {
const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS);
env.allowLocalModels = false;
const fx = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8', progress_callback: (p) => { if (p.status === 'progress' && p.file?.endsWith('.onnx')) modeEl.textContent = `loading MiniLM ${Math.round(p.progress)}%`; } });
embed = async (texts) => (await fx(texts, { pooling: 'mean', normalize: true })).tolist();
chunkVecs = await embed(chunks.map((c) => `${c.title}. ${c.text}`.slice(0, 800)));
modeEl.textContent = 'hybrid · BM25 + MiniLM · RRF';
})().catch((e) => { console.warn(e); modeEl.textContent = 'BM25 (semantic unavailable)'; semEl.checked = false; loading = null; embed = null; });
return loading;
}
semEl.addEventListener('change', () => { if (semEl.checked) loadSemantic(); else { modeEl.textContent = 'BM25'; } });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const add = (cls, html) => { const d = document.createElement('div'); d.className = `msg ${cls}`; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
async function retrieve(q) {
const t0 = performance.now();
const base = tok(q);
const terms = [...new Set(base.flatMap((t) => [t, ...(EXPAND[t] || [])]).map(stem))];
const sparse = index.search(terms);
let dense = null;
if (semEl.checked && embed) { const [qv] = await embed([q]); dense = chunkVecs.map((v) => v.reduce((a, x, i) => a + x * qv[i], 0)); }
const rank = (arr) => { const o = arr.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]); const r = new Array(arr.length); o.forEach(([, i], k) => (r[i] = k + 1)); return r; };
const rs = rank(sparse), rd = dense && rank(dense);
const fused = chunks.map((_, i) => 1 / (60 + rs[i]) * (sparse[i] > 0 ? 1 : 0.2) + (rd ? 1 / (60 + rd[i]) : 0));
const order = fused.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]).slice(0, 4).map(([f, i]) => ({ i, f, bm: sparse[i], dn: dense ? dense[i] : null, c: chunks[i] }));
const conf = Math.max(order[0]?.bm / 6 || 0, dense ? (order[0]?.dn - 0.25) * 2.2 : 0);
return { order, terms, conf, ms: performance.now() - t0 };
}
function compose(q, { order, terms }) {
const top = order.filter((r) => r.bm > 0.4 || (r.dn ?? 0) > 0.3).slice(0, 3);
const tset = new Set(terms);
const sents = top.flatMap((r, k) => r.c.text.split(/(?<=[.!?])\s+(?=[A-Z0-9“"])/).map((s, j) => {
const ts = tok(s).map(stem);
const hit = ts.filter((t) => tset.has(t)).reduce((a, t) => a + index.idf(t), 0);
return { s: s.trim(), k, hit, score: hit / Math.sqrt(ts.length + 4) + (2 - k) * 0.35 + (j === 0 ? 0.25 : 0) };
}));
const maxHit = Math.max(0, ...sents.map((x) => x.hit));
const pool = sents.filter((x) => x.s.length > 25 && (x.k === 0 ? x.hit > 0 || maxHit === 0 : x.hit >= maxHit * 0.4 && x.hit > 0));
const seen = new Set(), picked = [];
for (const x of pool.sort((a, b) => b.score - a.score)) {
const key = x.s.slice(0, 40);
if (seen.has(key)) continue;
seen.add(key); picked.push(x);
if (picked.length === 3) break;
}
picked.sort((a, b) => a.k - b.k);
return { top, picked };
}
async function ask(q) {
q = q.trim().slice(0, 200);
if (!q) return;
add('user', esc(q));
const typing = add('bot', '<span class="typing" aria-label="Thinking"><i></i><i></i><i></i></span>');
if (semEl.checked && !embed) await loadSemantic();
const R = await retrieve(q);
await new Promise((r) => setTimeout(r, 380));
const greet = /^(hi|hello|hey|yo|namaste)\b/i.test(q);
let html;
if (greet) {
html = '<p>Hello! Ask me about Sahaj’s projects, experience, skills, AI tools, or how to get in touch.</p>';
} else if (R.conf < 0.35) {
html = `<p>I couldn’t find that in my sources, so I won’t guess. That’s the guardrail. Try asking about RAG, agents, internships, LeetCode, or how to hire Sahaj.</p>`;
} else {
const { top, picked } = compose(q, R);
const body = picked.map((x) => `${esc(x.s)} <span class="cite">${x.k + 1}</span>`).join(' ');
const srcs = top.map((r, k) => `<a href="${r.c.href}" ${r.c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>[${k + 1}] ${esc(r.c.title)}</a>`).join('');
html = `<p>${body || esc(top[0].c.text.slice(0, 260))}</p><div class="srcs">${srcs}</div>`;
}
const max = Math.max(...R.order.map((r) => r.bm), 0.01);
html += `<details class="trace"><summary>retrieval trace · ${R.order.length} chunks · ${R.ms.toFixed(1)} ms · confidence ${Math.min(1, R.conf).toFixed(2)}</summary>
<table><thead><tr><th>#</th><th>chunk</th><th>bm25</th>${R.order[0]?.dn != null ? '<th>cos</th>' : ''}<th>rrf</th></tr></thead><tbody>
${R.order.map((r, k) => `<tr><td>${k + 1}</td><td>${esc(r.c.title)}</td><td><span class="bar" style="width:${(r.bm / max) * 40}px"></span> ${r.bm.toFixed(2)}</td>${r.dn != null ? `<td>${r.dn.toFixed(3)}</td>` : ''}<td>${r.f.toFixed(4)}</td></tr>`).join('')}
</tbody></table><p>query terms → ${esc(R.terms.join(', '))}</p></details>`;
typing.innerHTML = html;
log.scrollTop = log.scrollHeight;
}
el.querySelectorAll('.ask-sugg button').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
return { ask };
}