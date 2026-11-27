// Retrieval engine for "Ask my portfolio". Everything runs in the browser:
//   1. BM25 over the Q&A bank and knowledge chunks (instant, no model needed)
//   2. MiniLM query embeddings via Transformers.js once loaded (semantic match, int8 index)
// Answers are only ever taken from the bank or the chunks, never invented.
import { loadTF } from '../tf.js'; // Transformers.js and MiniLM from this site (assets/vendor, assets/models)
const STOP = new Set('a an the and or of to in on at by for with from is are was were be been it its this that he his him she her they their you your i me my do does did what which who whom how when where why can could would should will about tell me please sahaj saliya s'.split(' '));
const tok = (s) => (s.toLowerCase().match(/[a-z0-9+#]+/g) || []).filter((w) => !STOP.has(w));

// Topics this assistant answers; anything far from them is politely declined.
const ON_TOPIC = /\b(sahaj|saliya|he|his|him|you|your|project|work|experience|intern|skill|stack|education|study|college|university|pdeu|cgpa|gpa|contact|email|hire|available|resume|cv|github|linkedin|leetcode|twitter|x|cert|award|hackathon|harvard|managementor|adapter|badge|leadership|management|negotiat|rag|llm|agent|vision|crohn|dcgan|openenv|student|model|ai|ml|python|site|website|blog|phone|location|based|graduat|role|job|team|research|paper|language|framework|tool)/i;

export async function createEngine() {
  const [qa, kb] = await Promise.all([
    fetch('/data/qa-bank.json').then((r) => r.json()),
    fetch('/data/kb.json').then((r) => r.json()),
  ]);
  const decode = (b64) => { const bin = atob(b64); const v = new Int8Array(bin.length); for (let i = 0; i < bin.length; i++) v[i] = (bin.charCodeAt(i) << 24) >> 24; return v; };
  const qaItems = qa.items.map((x) => ({ ...x, vec: decode(x.v), toks: tok(x.q) }));
  const chunks = kb.chunks.map((c) => ({ ...c, vec: decode(c.v), toks: tok(`${c.title} ${c.text}`) }));
  const qaBM = bm25(qaItems.map((x) => x.toks));
  const kbBM = bm25(chunks.map((x) => x.toks));

  let extractor = null, loading = null;
  const loadEmbedder = (onProgress) => (loading ||= (async () => {
    const { pipeline } = await loadTF();
    extractor = await pipeline('feature-extraction', kb.model, { dtype: 'q8', progress_callback: onProgress });
    return true;
  })().catch(() => false));

  async function embedQuery(q) {
    if (!extractor) return null;
    const t = await extractor([q], { pooling: 'mean', normalize: true });
    return t.data;
  }
  const cos = (a, b) => { let s = 0; for (let i = 0; i < b.length; i++) s += a[i] * b[i]; return s / 127; };

  async function search(query) {
    const qt = tok(query);
    const qv = await embedQuery(query);
    const qaBm = qaBM(qt);
    const kbBm = kbBM(qt);
    const maxQa = Math.max(1e-6, ...qaBm), maxKb = Math.max(1e-6, ...kbBm);
    const qaScored = qaItems.map((x, i) => ({ x, sem: qv ? cos(qv, x.vec) : 0, lex: qaBm[i] / maxQa, raw: qaBm[i] }))
      .map((s) => ({ ...s, score: qv ? 0.8 * s.sem + 0.2 * s.lex : s.lex }))
      .sort((a, b) => b.score - a.score);
    const kbScored = chunks.map((x, i) => ({ x, sem: qv ? cos(qv, x.vec) : 0, lex: kbBm[i] / maxKb, raw: kbBm[i] }))
      .map((s) => ({ ...s, score: qv ? 0.75 * s.sem + 0.25 * s.lex : s.lex }))
      .sort((a, b) => b.score - a.score);
    return { qv: !!qv, qa: qaScored.slice(0, 5), kb: kbScored.slice(0, 6), qt };
  }

  // Decide how to answer: bank hit, extractive retrieval, honest "don't know", or decline.
  async function answer(query) {
    const r = await search(query);
    const top = r.qa[0], chunk = r.kb[0];
    const onTopic = ON_TOPIC.test(query);
    const bankHit = r.qv ? top && top.sem > 0.83 : top && top.lex > 0.99 && top.raw > 2.2 && coverage(r.qt, top.x.toks) > 0.6;
    if (bankHit) return { kind: 'bank', text: top.x.a, sources: top.x.src, hits: r };
    const chunkOk = r.qv ? chunk && chunk.sem > 0.42 : chunk && chunk.raw > 3;
    if (!onTopic && (!chunkOk || (r.qv && chunk.sem < 0.3))) return { kind: 'decline', text: "I only answer questions about Sahaj: his projects, skills, experience, education and how to contact him. Try one of the suggestions below.", sources: [], hits: r };
    if (chunkOk) {
      const near = r.qa[0] && (r.qv ? r.qa[0].sem > 0.7 : false);
      if (near) return { kind: 'bank', text: r.qa[0].x.a, sources: r.qa[0].x.src, hits: r, approx: true };
      return { kind: 'retrieval', text: extract(chunk.x.text, r.qt), sources: uniqSources(r.kb.slice(0, 2).map((s) => s.x)), hits: r };
    }
    return { kind: 'unknown', text: "I don't have that in Sahaj's data, so I won't guess. Email him at sahajs7959@gmail.com and he'll answer directly.", sources: [{ label: 'Contact', url: '/#contact' }], hits: r };
  }

  // Projects ranked for a query, from their model-card chunks (same scoring as search). Used by the agent planner.
  // `order` is Sahaj's own order of the projects (content/projects.json, which the chunks follow).
  const projectChunks = chunks.map((c, i) => [c, i]).filter(([c]) => c.url.startsWith('/#p-'));
  const order = [...new Set(projectChunks.map(([c]) => c.url.slice(4)))];
  async function rankProjects(query) {
    const qt = tok(query);
    const qv = await embedQuery(query);
    const bm = kbBM(qt);
    const maxBm = Math.max(1e-6, ...projectChunks.map(([, i]) => bm[i]));
    const best = new Map();
    for (const [c, i] of projectChunks) {
      const score = qv ? 0.75 * cos(qv, c.vec) + 0.25 * bm[i] / maxBm : bm[i] / maxBm;
      const id = c.url.slice(4);
      if (!best.has(id) || best.get(id).score < score) best.set(id, { id, name: c.source, score, order: order.indexOf(id) });
    }
    return [...best.values()].sort((a, b) => b.score - a.score);
  }

  return { answer, search, rankProjects, loadEmbedder, embed: embedQuery, get semantic() { return !!extractor; }, chunks, qaCount: qaItems.length };
}

export function uniqSources(list) {
  const seen = new Set();
  return list.map((c) => ({ label: c.source || c.title, url: c.url })).filter((s) => (seen.has(s.url) ? false : seen.add(s.url)));
}

const coverage = (q, d) => { if (!q.length) return 0; const s = new Set(d); return q.filter((w) => s.has(w)).length / q.length; };

// Keep the 2–3 sentences of a passage that share the most words with the question.
function extract(text, qt) {
  // a stop counts only before a space, so "8.5" and "B.Tech" stay whole
  const sents = text.split(/(?<=[.!?])\s+/);
  if (sents.length <= 3) return text.trim();
  const q = new Set(qt);
  const scored = sents.map((s, i) => ({ s, i, k: tok(s).filter((w) => q.has(w)).length }));
  const keep = scored.slice().sort((a, b) => b.k - a.k || a.i - b.i).slice(0, 3).sort((a, b) => a.i - b.i);
  return keep.map((x) => x.s.trim()).join(' ');
}

// Okapi BM25, k1 = 1.4, b = 0.75. Returns a scorer for a tokenised query.
function bm25(docs) {
  const N = docs.length, avg = docs.reduce((s, d) => s + d.length, 0) / N;
  const df = new Map();
  docs.forEach((d) => new Set(d).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
  const tfs = docs.map((d) => { const m = new Map(); d.forEach((w) => m.set(w, (m.get(w) || 0) + 1)); return m; });
  return (q) => tfs.map((tf, i) => q.reduce((s, w) => {
    const f = tf.get(w); if (!f) return s;
    const idf = Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5));
    return s + idf * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * docs[i].length / avg));
  }, 0));
}
