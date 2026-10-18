// Builds the data behind the embedding map: real content chunks -> MiniLM vectors -> an exact t-SNE run that is
// snapshotted into 30 keyframes (with the real KL loss per epoch) -> k-means clusters named by keywords.
// Writes data/map.json (points, keyframes, loss, clusters, keyword index) and data/map-vectors.json (int8 vectors).
import { readJSON, write, parseFrontMatter, path } from './lib.mjs';
import { tsne, mulberry32 } from './tsne.mjs';
import { kmeans2d, keywords } from './cluster.mjs';
import { stem, STOP } from '../assets/js/map-core.js';

const EPOCHS = 300;
const KEYFRAMES = 30;
const PERPLEXITY = 30;
const K = 5;
const MAX_POINTS = 480;
const USER = 'SahajIVVIX-1';

/* ---------- text cleaning ---------- */
const clean = (s) => s
  .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[*_`>#]/g, '')
  .replace(/\s+/g, ' ')
  .trim();
const words = (s) => s.split(/\s+/).filter(Boolean);
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1) > n * 0.6 ? s.lastIndexOf(' ', n - 1) : n - 1) + '…');

// Sentences, regrouped into pieces of at most `max` words.
function pieces(text, max = 55) {
  const sents = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
  const out = [];
  let cur = '';
  for (const s of sents) {
    if (words(cur + ' ' + s).length > max && cur) { out.push(cur.trim()); cur = ''; }
    cur += ' ' + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const BORING = /^(setup|installation|install|quick ?start|run |running|usage|docker|deploy|licen[cs]e|contributors|credits|citation|acknowledg|author|contact|repository layout|project structure|project layout|testing|tests|environment|requirements|prerequisites|getting started|how to run|launch|build|folder|files|table of contents|badges|data$|licences and use|citation of the data)/i;
const COMMAND = /^(pip|npm|npx|git|cd|docker|python|py|uvicorn|streamlit|mlflow|pytest|ruff|cp|source|call|make|conda|\$|>)\b/i;

function good(text) {
  const w = words(text);
  if (w.length < 8) return false;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (letters / text.length < 0.68) return false;
  if (COMMAND.test(text)) return false;
  if ((text.match(/[/\\]/g) || []).length > 4) return false; // looks like a path list
  if (/[|]/.test(text)) return false;
  return true;
}

function readmePassages(md, repo) {
  const out = [];
  const body = md.replace(/```[\s\S]*?```/g, ' ');
  for (const sec of body.split(/\n(?=#{1,4} )/)) {
    const hm = sec.match(/^#{1,4} (.+)/);
    const heading = clean(hm ? hm[1] : 'Overview').replace(/[^\w\s&()/.,-]/g, '').trim() || 'Overview';
    if (BORING.test(heading)) continue;
    const rest = hm ? sec.slice(hm[0].length) : sec;
    for (const block of rest.split(/\n\s*\n/)) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (!lines.length) continue;
      if (lines.every((l) => l.trim().startsWith('|'))) {
        for (const row of lines) {
          if (/^\|?\s*:?-{2,}/.test(row.trim())) continue;
          const cells = row.split('|').map(clean).filter((c) => /[a-z]/i.test(c));
          const t = cells.join(' — ');
          if (words(t).length >= 6 && good(t.replace(/ — /g, ' '))) out.push({ title: heading, text: t, repo });
        }
        continue;
      }
      // list items become one chunk each; other text is one paragraph
      const items = [];
      for (const l of lines) {
        if (/^\s*([-*+]|\d+\.)\s+/.test(l)) items.push(l.replace(/^\s*([-*+]|\d+\.)\s+/, ''));
        else if (items.length) items[items.length - 1] += ' ' + l.trim();
        else items.push(l.trim());
      }
      const merged = lines.some((l) => /^\s*([-*+]|\d+\.)\s+/.test(l)) ? items : [items.join(' ')];
      for (const it of merged) for (const p of pieces(clean(it))) if (good(p)) out.push({ title: heading, text: p, repo });
    }
  }
  return out;
}

/* ---------- FAQ (about-me.md) ---------- */
const FAQ_URL = { about: '#about', education: '#about', contact: '#contact', availability: '#contact', experience: '#experience', projects: '#work', skills: '#skills', certifications: '#certs', community: '#community' };
const SITE_Q = /(website|site\b|chatbot|loading|animation|visitor|tracking|track|\bip\b|greeting|personalis|url|commits|privacy|cookie|blog|transformer|embedding map)/i;
function faqEntries(md) {
  const { body } = parseFrontMatter(md);
  const out = [];
  let section = 'about', cur = null;
  for (const line of body.split('\n')) {
    const h1 = line.match(/^# (.+?)(?:\s*\{#(\w+)\})?$/), h2 = line.match(/^## (.+?)(?:\s*\{#(\w+)\})?$/);
    if (h1) { section = h1[2] || section; cur = { q: null, a: '', section }; out.push(cur); }
    else if (h2) { if (h2[2]) section = h2[2]; cur = { q: h2[1], a: '', section }; out.push(cur); }
    else if (cur) cur.a += line + '\n';
  }
  return out.map((x) => ({ ...x, a: clean(x.a) })).filter((x) => x.a);
}

/* ---------- collect every real chunk ---------- */
export function collectChunks({ profile, projects, github, aboutMd, readmes }) {
  const c = [];
  const add = (o) => c.push(o);
  const fmtRange = (a, b) => `${a}${b && b !== a ? ' – ' + b : ''}`;

  // featured projects: one node, then the model-card text
  for (const p of projects) {
    const src = `${p.name} · model card`, u = `#p-${p.id}`;
    add({ k: 'project', t: p.name, text: `${p.name}. ${p.kind}. ${p.task}. ${p.problem}`, src: `${p.name} · project`, u, proj: p.id });
    for (const s of pieces(p.problem)) add({ k: 'card', t: 'Problem', text: s, src, u });
    for (const s of pieces(p.approach)) add({ k: 'card', t: 'Approach', text: s, src, u });
    add({ k: 'card', t: 'Key result', text: `${p.metric.value} ${p.metric.label}`, src, u });
    for (const [a, b] of p.metrics) add({ k: 'card', t: a, text: `${a}: ${b}`, src, u });
    if (p.limits) add({ k: 'card', t: 'Limits', text: p.limits, src, u });
    for (const r of readmePassages(readmes[p.repo] || '', p.repo)) add({ k: 'readme', t: r.title, text: r.text, src: `${p.repo} · README`, u });
  }
  // other public repos
  const featured = new Set(projects.map((p) => p.repo));
  for (const r of github.repos || []) {
    if (featured.has(r.name) || r.name.toLowerCase() === USER.toLowerCase()) continue;
    const u = r.url || `https://github.com/${USER}/${r.name}`;
    if (r.description) add({ k: 'repo', t: r.name, text: `${r.name}: ${r.description}`, src: `${r.name} · GitHub`, u });
    for (const x of readmePassages(readmes[r.name] || '', r.name)) add({ k: 'readme', t: x.title, text: x.text, src: `${r.name} · README`, u, other: true });
  }
  // resume
  const e = profile.education;
  add({ k: 'resume', t: 'Education', text: `${e.degree}, ${e.school}, ${e.place}, ${fmtRange(e.start, e.end)}. CGPA ${e.cgpa}.`, src: 'Resume · Education', u: '#about' });
  for (const r of profile.experience) for (const pt of r.points) add({ k: 'resume', t: `${r.role} · ${r.org}`, text: pt, src: `Resume · ${r.org}`, u: `#x-${r.id}` });
  for (const m of profile.community) add({ k: 'resume', t: m.role, text: `${m.role}, ${m.org.split(' · ')[0]}. ${m.note || ''}`.trim(), src: 'Resume · Community', u: '#community' });
  for (const ct of profile.certifications) add({ k: 'resume', t: ct.name, text: `${ct.name}, ${ct.issuer}${ct.note ? ', ' + ct.note : ''}`, src: 'Resume · Certification', u: '#certs' });
  for (const g of profile.skills) for (const it of g.items) add({ k: 'skill', t: it, text: `${it}: ${g.group}`, src: `Skills · ${g.group}`, u: '#skills' });
  // bio and FAQ answers about the work (not the website itself)
  for (const f of faqEntries(aboutMd)) {
    if (f.section === 'site' || (f.q && SITE_Q.test(f.q))) continue;
    if (!f.q) { for (const s of pieces(f.a, 60).slice(0, 4)) add({ k: 'about', t: 'About Sahaj', text: s, src: 'About', u: '#about' }); continue; }
    const s = pieces(f.a, 55)[0];
    if (s && words(s).length >= 6) add({ k: 'about', t: f.q.replace(/\?$/, ''), text: s, src: 'About · FAQ', u: FAQ_URL[f.section] || '#about' });
  }

  // de-duplicate, then cap (drop the most repetitive material first: non-featured README passages, then FAQ)
  const seen = new Set();
  let out = c.filter((x) => { const key = x.text.toLowerCase().replace(/\W+/g, ' ').slice(0, 90); if (seen.has(key)) return false; seen.add(key); return true; });
  if (out.length > MAX_POINTS) {
    const rnd = mulberry32(5);
    const drop = (pred, n) => { const idx = out.map((x, i) => (pred(x) ? i : -1)).filter((i) => i >= 0).sort(() => rnd() - 0.5).slice(0, n); const s = new Set(idx); out = out.filter((_, i) => !s.has(i)); };
    drop((x) => x.other, Math.min(out.length - MAX_POINTS, out.filter((x) => x.other).length));
    if (out.length > MAX_POINTS) drop((x) => x.k === 'about', out.length - MAX_POINTS);
    if (out.length > MAX_POINTS) drop((x) => x.k === 'readme', out.length - MAX_POINTS);
  }
  return out;
}

/* ---------- build ---------- */
const q8 = (v) => Buffer.from(Int8Array.from(v.map((x) => Math.max(-127, Math.min(127, Math.round(x * 127))))).buffer).toString('base64');
const titleCase = (w) => w.charAt(0).toUpperCase() + w.slice(1);

export async function buildMap({ profile, projects, github, aboutMd, readmes, embed, model }) {
  const chunks = collectChunks({ profile, projects, github, aboutMd, readmes });
  const N = chunks.length;
  const vecs = await embed(chunks.map((x) => `${x.t}. ${x.text}`));

  // t-SNE with 30 snapshots, denser early (when the motion is largest)
  const snapEpochs = [...new Set(Array.from({ length: KEYFRAMES }, (_, k) => Math.round(EPOCHS * Math.pow(k / (KEYFRAMES - 1), 1.7))))];
  const run = tsne(vecs, { perplexity: PERPLEXITY, epochs: EPOCHS, snapshotEpochs: snapEpochs, seed: 7 });

  // every keyframe is centred and scaled on its own so the map always fills the frame
  const norm = (Y) => {
    let mx = 0, my = 0;
    for (let i = 0; i < N; i++) { mx += Y[i * 2]; my += Y[i * 2 + 1]; }
    mx /= N; my /= N;
    const r = Array.from({ length: N }, (_, i) => Math.hypot(Y[i * 2] - mx, Y[i * 2 + 1] - my)).sort((a, b) => a - b);
    const s = 0.9 / (r[Math.floor(0.96 * (N - 1))] || 1);
    const out = [];
    for (let i = 0; i < N; i++) out.push(Math.round((Y[i * 2] - mx) * s * 1000), Math.round((Y[i * 2 + 1] - my) * s * 1000));
    return out;
  };
  const kf = run.snapshots.map((s) => norm(s.Y));
  const kfEpochs = run.snapshots.map((s) => s.epoch);
  const loss = Array.from(run.loss, (v) => Math.round(v * 1000) / 1000);

  // quality check: how many of each point's 10 nearest neighbours (embedding space) are within its 25 nearest in 2D
  const final = kf.at(-1);
  let kept = 0;
  const dotv = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  for (let i = 0; i < N; i++) {
    const nn = Array.from({ length: N }, (_, j) => j).filter((j) => j !== i).sort((a, b) => dotv(vecs[i], vecs[b]) - dotv(vecs[i], vecs[a])).slice(0, 10);
    const near2 = new Set(Array.from({ length: N }, (_, j) => j).filter((j) => j !== i).sort((a, b) => Math.hypot(final[a * 2] - final[i * 2], final[a * 2 + 1] - final[i * 2 + 1]) - Math.hypot(final[b * 2] - final[i * 2], final[b * 2 + 1] - final[i * 2 + 1])).slice(0, 25));
    kept += nn.filter((j) => near2.has(j)).length / 10;
  }

  // clusters + keyword names
  // clusters are found on the 2D layout, so they are exactly the blobs the visitor sees
  const { labels } = kmeans2d(Array.from({ length: N }, (_, i) => [final[i * 2], final[i * 2 + 1]]), K);
  const originals = new Map();
  const counts = new Map();
  const toks = chunks.map((x) => {
    const out = [];
    for (const m of `${x.t} ${x.text}`.toLowerCase().matchAll(/[a-z][a-z0-9+#-]*[a-z0-9+#]|[a-z]/g)) {
      const w = m[0];
      if (w.length < 3 || STOP.has(w)) continue;
      const s = stem(w);
      if (s.length < 2) continue;
      out.push(s);
      const key = s + '|' + w;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return out;
  });
  for (const [key, n] of counts) { const [s, w] = key.split('|'); const cur = originals.get(s); if (!cur || n > cur.n) originals.set(s, { w, n }); }
  const surface = new Map([...originals].map(([s, v]) => [s, v.w]));
  const IGNORE = new Set(['readme', 'sahaj', 'project', 'github', 'http', 'https', 'com', 'see', 'file', 'run', 'support', 'include', 'step', 'default', 'new', 'system', 'work', 'build', 'key', 'result', 'approach', 'problem', 'based'].map(stem));
  const kws = keywords(toks, labels, K, surface, { top: 12, ignore: IGNORE });

  // hand-tuned names (content/map-clusters.json) matched by keyword; otherwise an automatic name
  const overrides = (readJSON('content/map-clusters.json', { names: [] }).names || []);
  const names = new Array(K).fill(null);
  for (const o of overrides) {
    const want = o.match.map((w) => stem(w.toLowerCase()));
    let best = -1, bs = 0;
    for (let c = 0; c < K; c++) {
      if (names[c]) continue;
      const score = want.reduce((a, w) => a + (kws[c].stems.slice(0, 12).includes(w) ? 1 : 0), 0);
      if (score > bs) { bs = score; best = c; }
    }
    if (best >= 0) names[best] = o.name;
  }
  const autoName = (c) => kws[c].words.slice(0, 2).map(titleCase).join(' & ');
  const order = Array.from({ length: K }, (_, c) => c).sort((a, b) => kws[b].n - kws[a].n); // biggest cluster = colour 0
  const rank = new Map(order.map((c, i) => [c, i]));
  const clusters = order.map((c) => ({ id: rank.get(c), name: names[c] || autoName(c), auto: autoName(c), keywords: kws[c].words.slice(0, 8), n: kws[c].n }));

  // keyword index for the instant fallback search (before the model has loaded)
  const df = new Map();
  toks.forEach((t) => new Set(t).forEach((s) => df.set(s, (df.get(s) || 0) + 1)));
  const inv = {};
  toks.forEach((t, i) => new Set(t).forEach((s) => { if (df.get(s) <= 70) (inv[s] ||= []).push(i); }));

  const points = chunks.map((x, i) => ({ t: trunc(x.t, 70), s: trunc(x.text, 190), src: x.src, u: x.u, c: rank.get(labels[i]), k: x.k }));
  const proj = chunks.map((x, i) => (x.proj ? { id: x.proj, name: x.t, i } : null)).filter(Boolean);

  write('data/map.json', { v: 1, model, perplexity: PERPLEXITY, epochs: EPOCHS, kfEpochs, loss, kf, points, clusters, projects: proj, inv });
  write('data/map-vectors.json', { dim: vecs[0].length, v: vecs.map(q8) });

  const kinds = {};
  for (const x of chunks) kinds[x.k] = (kinds[x.k] || 0) + 1;
  console.log(`map: ${N} real chunks ${JSON.stringify(kinds)}`);
  console.log(`map: t-SNE KL ${loss[0].toFixed(2)} -> ${loss[EPOCHS].toFixed(2)} over ${EPOCHS} epochs | 10-NN kept in 2D top-25: ${(kept / N * 100).toFixed(0)}% | ${kf.length} keyframes`);
  console.log('map: clusters ' + clusters.map((c) => `[${c.id}] ${c.name} (${c.n}; ${c.keywords.slice(0, 5).join(', ')})`).join(' | '));
  return { clusters, N };
}
