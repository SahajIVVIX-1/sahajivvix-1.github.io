// Build-time ML: embeds every piece of content with all-MiniLM-L6-v2 and writes
//   data/kb.json          chatbot knowledge base (chunks + int8 vectors)
//   data/qa-bank.json     200+ grounded question/answer pairs (+ int8 question vectors)
//   data/attention.json   word -> most related words on the page (cosine similarity)
//   data/heatmaps.json    per-project self-attention over key README tokens
//   data/latent-map.json  3D UMAP of words, passages and items for the embedding map
// Skips the work when no input changed since the last run (hash in data/meta.json).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { readJSON, readText, write, tokenizeWords, STOP, parseFrontMatter, fmtRange, slug, path } from './lib.mjs';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const DIM = 384;

export async function embedAll({ force = process.argv.includes('--force') } = {}) {
  const profile = readJSON('content/profile.json');
  const projects = readJSON('content/projects.json');
  const github = readJSON('data/github.json', { repos: [], languages: {}, user: {} });
  const aboutMd = readText('content/about-me.md');
  const readmes = Object.fromEntries(projects.map((p) => [p.repo, readText(`data/readmes/${p.repo}.md`)]));
  const site = readJSON('data/site.json', { blogLive: false });
  const posts = site.blogLive ? loadPosts() : [];

  // GitHub timestamps change hourly but do not change meaning; hash only the stable parts.
  const ghStable = { user: github.user, languages: github.languages, repos: github.repos.map(({ pushed_at, ...r }) => r) };
  const hash = createHash('sha256').update(JSON.stringify([profile, projects, aboutMd, readmes, ghStable, posts, 3])).digest('hex').slice(0, 16);
  const meta = readJSON('data/meta.json', {});
  if (!force && meta.hash === hash && existsSync(path('data/kb.json'))) {
    console.log('embed: inputs unchanged, skipping');
    return;
  }

  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path('.cache/models');
  const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
  const embed = async (texts, batch = 32) => {
    const out = [];
    for (let i = 0; i < texts.length; i += batch) {
      const t = await extractor(texts.slice(i, i + batch), { pooling: 'mean', normalize: true });
      for (let j = 0; j < t.dims[0]; j++) out.push(Array.from(t.data.slice(j * DIM, (j + 1) * DIM)));
    }
    return out;
  };

  // ---------- 1. knowledge-base chunks ----------
  const chunks = buildChunks({ profile, projects, github, aboutMd, readmes, posts });
  const chunkVecs = await embed(chunks.map((c) => `${c.title}. ${c.text}`));
  write('data/kb.json', {
    model: MODEL, dim: DIM, built: hash,
    chunks: chunks.map((c, i) => ({ ...c, v: q8(chunkVecs[i]) })),
  });
  console.log(`embed: ${chunks.length} knowledge chunks`);

  // ---------- 2. Q&A bank ----------
  const qa = buildQA({ profile, projects, github, aboutMd });
  const qaVecs = await embed(qa.map((x) => x.q));
  write('data/qa-bank.json', { model: MODEL, dim: DIM, items: qa.map((x, i) => ({ ...x, v: q8(qaVecs[i]) })) });
  console.log(`embed: ${qa.length} Q&A pairs`);

  // ---------- 3. attention between words on the page ----------
  const pageText = [
    ...profile.about,
    ...projects.flatMap((p) => [p.problem, p.approach, p.limits, ...p.metrics.flat()]),
    ...profile.experience.flatMap((r) => r.points),
    ...profile.skills.flatMap((g) => g.items),
    ...posts.map((p) => p.body),
  ].join(' ').replace(/\*/g, '');
  const vocab = [...new Set(tokenizeWords(pageText).filter((w) => w.length > 2 && !STOP.has(w) && !WEAK.has(w) && !/^\d/.test(w)))];
  const vocabVecs = await embed(vocab);
  // Relatedness = embedding cosine blended with how often two words share a sentence on this page.
  const sentences = pageText.split(/(?<=[.!?;:])\s+/).map((s) => new Set(tokenizeWords(s)));
  const freq = new Map(vocab.map((w) => [w, sentences.filter((s) => s.has(w)).length || 1]));
  // Words seen only once would get full co-occurrence from a single sentence, so they rely on cosine alone.
  const together = (a, b) => (Math.min(freq.get(a), freq.get(b)) < 2 ? 0
    : sentences.reduce((n, s) => n + (s.has(a) && s.has(b) ? 1 : 0), 0) / Math.sqrt(freq.get(a) * freq.get(b)));
  const attention = {};
  for (let i = 0; i < vocab.length; i++) {
    const scored = [];
    for (let j = 0; j < vocab.length; j++) {
      if (i === j || sameStem(vocab[i], vocab[j])) continue;
      const s = 0.75 * dot(vocabVecs[i], vocabVecs[j]) + 0.25 * together(vocab[i], vocab[j]);
      if (s > 0.36) scored.push([vocab[j], s]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    if (scored.length) attention[vocab[i]] = scored.slice(0, 6).map(([w, s]) => [w, +s.toFixed(2)]);
  }
  write('data/attention.json', attention);
  console.log(`embed: attention over ${vocab.length} words, ${Object.keys(attention).length} with links`);

  // ---------- 4. README self-attention heatmaps ----------
  const docs = projects.map((p) => readmeWords(readmes[p.repo] || p.approach));
  const df = new Map();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
  const heatmaps = {};
  for (let k = 0; k < projects.length; k++) {
    const tf = new Map();
    for (const w of docs[k]) tf.set(w, (tf.get(w) || 0) + 1);
    const top = [...tf].map(([w, f]) => [w, f * Math.log(1 + projects.length / df.get(w))]).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([w]) => w);
    const ordered = docs[k].filter((w, i, a) => top.includes(w) && a.indexOf(w) === i); // reading order
    const vecs = await embed(ordered);
    const n = ordered.length;
    const matrix = [];
    for (let i = 0; i < n; i++) {
      const row = vecs.map((v, j) => (i === j ? null : dot(vecs[i], v)));
      const offMax = Math.max(...row.filter((x) => x !== null));
      const z = row.map((x) => (x === null ? offMax : x) / 0.08); // softmax(qk / τ), diagonal capped
      const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
      matrix.push(e.map((v) => +(v / s).toFixed(3)));
    }
    heatmaps[projects[k].id] = { tokens: ordered, matrix };
  }
  write('data/heatmaps.json', heatmaps);

  // ---------- 5. latent map ----------
  const items = mapItems({ profile, projects });
  const itemVecs = await embed(items.map((x) => x.text));
  const readmeVocab = [...new Set(docs.flat())].filter((w) => !vocab.includes(w)).slice(0, 2600);
  const readmeVecs = await embed(readmeVocab);
  const readmeSentences = [...new Set(projects.flatMap((p) => (stripMd(readmes[p.repo] || '').match(/[^.!?]{40,220}[.!?]/g) || []).map((s) => s.trim())))].slice(0, 1400);
  const sentenceVecs = await embed(readmeSentences);
  // Two-word phrases ("reward shaping", "semantic cache") fill the space between words and passages.
  const bigrams = [...new Set(docs.flatMap((d) => d.slice(1).map((w, i) => `${d[i]} ${w}`)))].slice(0, 1300);
  const bigramVecs = await embed(bigrams);
  const allLabels = [...vocab, ...readmeVocab, ...bigrams, ...readmeSentences];
  const allVecs = [...vocabVecs, ...readmeVecs, ...bigramVecs, ...sentenceVecs, ...chunkVecs, ...itemVecs];
  const kinds = [...vocab.map(() => 0), ...readmeVocab.map(() => 0), ...bigrams.map(() => 0), ...readmeSentences.map(() => 3), ...chunks.map(() => 1), ...items.map(() => 2)];
  const { UMAP } = await import('umap-js');
  let seed = 42;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const umap = new UMAP({ nComponents: 3, nNeighbors: 18, minDist: 0.12, spread: 1.2, random, nEpochs: 300 });
  const coords = umap.fit(allVecs);
  // Normalise to [-1, 1] on the widest axis.
  const mins = [0, 1, 2].map((a) => Math.min(...coords.map((c) => c[a])));
  const maxs = [0, 1, 2].map((a) => Math.max(...coords.map((c) => c[a])));
  const scale = 2 / Math.max(...maxs.map((m, a) => m - mins[a]));
  const norm = coords.map((c) => c.map((v, a) => +((v - (mins[a] + maxs[a]) / 2) * scale).toFixed(3)));
  // Cluster = nearest project item, so each region can be named after a project.
  const projIdx = items.map((x, i) => (x.kind === 'project' ? i : -1)).filter((i) => i >= 0);
  const clusterOf = (v) => projIdx.reduce((best, i) => (dot(v, itemVecs[i]) > dot(v, itemVecs[best]) ? i : best), projIdx[0]);
  write('data/latent-map.json', {
    labels: [...allLabels, ...chunks.map((c) => c.title), ...items.map((x) => x.label)],
    xyz: norm.flat(),
    kind: kinds,
    cluster: allVecs.map((v) => projIdx.indexOf(clusterOf(v))),
    clusters: projIdx.map((i) => items[i].label),
    items: items.map((x, i) => ({ label: x.label, kind: x.kind, href: x.href, i: allLabels.length + chunks.length + i })),
    chunkHref: chunks.map((c) => c.url),
  });
  console.log(`embed: latent map with ${allVecs.length} points`);

  write('data/meta.json', JSON.stringify({ hash, model: MODEL, chunks: chunks.length, qa: qa.length, points: allVecs.length }, null, 1) + '\n');
}

// ---------- helpers ----------

// Words too generic to deserve an attention line.
const WEAK = new Set('going makes final finds famously worthless useful ordinary small easy real whole often near shows show works work way ways first second many much well recent best only next later still while good bad open honest honestly long short high low full main key given test normal published'.split(' '));
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const sameStem = (a, b) => a.slice(0, 5) === b.slice(0, 5) && Math.abs(a.length - b.length) <= 3;
// int8 quantisation: cosine on the client stays accurate to about 1e-2, files shrink 4×.
const q8 = (v) => Buffer.from(Int8Array.from(v.map((x) => Math.max(-127, Math.min(127, Math.round(x * 127))))).buffer).toString('base64');

function readmeWords(md) {
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  return tokenizeWords(text).filter((w) => w.length > 3 && !STOP.has(w) && !/^\d|[._-]$|^(the|this|that|with|from|your|have|will|guide|book|name|last|settings|local|services|professional|original|comparison|need|needs|file|files|folder|section|full|true|false|none)$/.test(w) && !/\d{3,}/.test(w));
}

function stripMd(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[!\[[^\]]*]\([^)]*\)]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`>#|]/g, ' ')
    .replace(/-{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitWords(text, max = 110) {
  const sentences = text.match(/[^.!?]+[.!?]*(\s|$)/g) || [text];
  const out = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).split(/\s+/).length > max && cur) { out.push(cur.trim()); cur = ''; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const FAQ_SECTIONS = { about: '/#about', education: '/#about', contact: '/#contact', availability: '/#contact', experience: '/#experience', projects: '/#work', skills: '/#skills', certifications: '/#certs', community: '/#community', site: '/#top', faq: '/#about' };
const SECTION_LABEL = { '/#about': 'About', '/#contact': 'Contact', '/#experience': 'Experience', '/#work': 'Projects', '/#skills': 'Skills', '/#certs': 'Certifications', '/#community': 'Community', '/#top': 'This site' };

function parseFaq(md) {
  const { body } = parseFrontMatter(md);
  const out = [];
  let section = 'about';
  let cur = null;
  for (const line of body.split('\n')) {
    const h1 = line.match(/^# (.+?)(?:\s*\{#(\w+)\})?$/);
    const h2 = line.match(/^## (.+?)(?:\s*\{#(\w+)\})?$/);
    if (h1) { section = h1[2] || section; cur = { q: null, title: h1[1], a: '', section }; out.push(cur); continue; }
    if (h2) { if (h2[2]) section = h2[2]; cur = { q: h2[1], title: h2[1], a: '', section }; out.push(cur); continue; }
    if (cur) cur.a += line + '\n';
  }
  return out.map((x) => ({ ...x, a: x.a.trim(), url: FAQ_SECTIONS[x.section] || '/#about' })).filter((x) => x.a);
}

function buildChunks({ profile, projects, github, aboutMd, readmes, posts }) {
  const chunks = [];
  const add = (title, text, url, source) => chunks.push({ id: `c${chunks.length}`, title, text, url, source });
  for (const f of parseFaq(aboutMd)) {
    if (f.q) add(f.q, f.a, f.url, SECTION_LABEL[f.url] || 'About');
    else for (const part of splitWords(f.a)) add(f.title, part, f.url, 'About');
  }
  const e = profile.education;
  add('Education', `${profile.name} studies ${e.degree} at ${e.school}, ${e.place}, ${fmtRange(e.start, e.end)}. CGPA ${e.cgpa}.`, '/#about', 'About');
  for (const r of profile.experience) add(`${r.role}, ${r.org}`, `${r.kind}, ${fmtRange(r.start, r.end)}, ${r.place}. ${r.points.join(' ')}`, `/#x-${r.id}`, 'Experience');
  for (const c of profile.community) add(c.role, `${c.role} at ${c.org}, ${c.end === null ? `since ${c.start}` : fmtRange(c.start, c.end)}. ${c.note || ''}`, '/#community', 'Community');
  add('Certifications', profile.certifications.map((c) => `${c.name} (${c.issuer}${c.note ? `, ${c.note}` : ''})`).join('; ') + '.', '/#certs', 'Certifications');
  for (const g of profile.skills) add(`Skills: ${g.group}`, `${g.group}: ${g.items.join(', ')}.`, '/#skills', 'Skills');
  add('Links and contact', `Email ${profile.email}. ${profile.links.map((l) => `${l.label}: ${l.url}`).join('. ')}. No phone number is shared.`, '/#contact', 'Contact');
  for (const p of projects) {
    add(`${p.name}: overview`, `${p.name} (${p.kind}, ${p.year}). Problem: ${p.problem} Approach: ${p.approach}`, `/#p-${p.id}`, p.name);
    add(`${p.name}: results and stack`, `Key result: ${p.metric.value} ${p.metric.label}. ${p.metrics.map(([k, v]) => `${k}: ${v}`).join('. ')}. Stack: ${p.stack.join(', ')}. ${p.limits} ${p.team}. Code: https://github.com/SahajIVVIX-1/${p.repo}`, `/#p-${p.id}`, p.name);
    const md = readmes[p.repo];
    if (md) {
      for (const sec of md.split(/\n(?=#{1,3} )/)) {
        const head = (sec.match(/^#{1,3} (.+)/) || [, 'README'])[1].replace(/[^\w\s&/().,-]/g, '').trim();
        const body = stripMd(sec.replace(/^#{1,3} .+/, ''));
        if (body.split(' ').length < 12) continue;
        for (const part of splitWords(body)) add(`${p.name} README: ${head}`, part, `https://github.com/SahajIVVIX-1/${p.repo}`, `${p.name} README`);
      }
    }
  }
  if (github.fetched_at) {
    const langs = Object.entries(github.languages).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l]) => l);
    const recent = github.repos.slice().sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 5);
    add('GitHub overview', `Sahaj's GitHub is SahajIVVIX-1 with ${github.user.public_repos} public repositories, ${github.totals.stars} stars and ${github.user.followers} followers. Main languages by code size: ${langs.join(', ')}. Most recently updated: ${recent.map((r) => `${r.name} (${r.pushed_at.slice(0, 10)})`).join(', ')}.`, '/#certs', 'GitHub');
    for (const r of github.repos.filter((x) => x.description && !projects.some((p) => p.repo === x.name))) {
      add(`GitHub repo: ${r.name}`, `${r.name}: ${r.description} Language: ${r.language || 'n/a'}. ${r.url}`, r.url, 'GitHub');
    }
  }
  for (const post of posts) for (const part of splitWords(stripMd(post.body), 140)) add(`Blog: ${post.title}`, part, `/blogs/${post.slug}/`, 'Blog');
  return chunks;
}

function buildQA({ profile, projects, github, aboutMd }) {
  const qa = [];
  const src = (url) => [{ label: SECTION_LABEL[url] || (url.startsWith('http') ? 'GitHub' : 'Site'), url }];
  const add = (qs, a, url) => { for (const q of [].concat(qs)) qa.push({ q, a, src: src(url) }); };

  // FAQ entries plus natural paraphrases.
  for (const f of parseFaq(aboutMd).filter((x) => x.q)) {
    const variants = [f.q];
    const m = f.q.match(/^(What|Where|When|How|Does|Is|Has|Who|Can) (.+)\?$/);
    if (m) {
      variants.push(f.q.replace(/Sahaj's/g, 'his').replace(/\bSahaj\b/g, 'he').replace(/^Does he/, 'Does he').replace(/^Is he/, 'Is he'));
      if (/^What is Sahaj's (.+)\?$/.test(f.q)) variants.push(f.q.replace(/^What is Sahaj's (.+)\?$/, "Tell me Sahaj's $1"));
    }
    add([...new Set(variants)], f.a, f.url);
  }

  // Projects: eight questions each.
  for (const p of projects) {
    const url = `/#p-${p.id}`;
    const repo = `https://github.com/SahajIVVIX-1/${p.repo}`;
    add([`What is ${p.name}?`, `Tell me about ${p.name}`, `Explain the ${p.name} project`], `${p.name} is ${aOrAn(p.kind)} ${p.kind.toLowerCase()} project (${p.year}). ${p.problem} ${p.approach.split('. ')[0]}.`, url);
    add([`What problem does ${p.name} solve?`, `Why did Sahaj build ${p.name}?`], p.problem, url);
    add([`How does ${p.name} work?`, `What is the approach in ${p.name}?`], p.approach, url);
    add([`What tech stack does ${p.name} use?`, `What tools were used in ${p.name}?`], `${p.name} uses ${p.stack.join(', ')}.`, url);
    add([`What results did ${p.name} get?`, `What are the metrics for ${p.name}?`, `How accurate is ${p.name}?`], `Headline: ${p.metric.value} ${p.metric.label}. ${p.metrics.map(([k, v]) => `${k}: ${v}`).join('; ')}.`, url);
    add([`Where is the code for ${p.name}?`, `GitHub link for ${p.name}`], `The code and README are public at ${repo}.`, repo);
    add([`Who built ${p.name}?`, `Was ${p.name} a team project?`], `${p.team}.`, url);
    if (p.limits) add([`What are the limitations of ${p.name}?`], p.limits, url);
  }

  // Experience.
  for (const r of profile.experience) {
    const url = `/#x-${r.id}`;
    add([`What did Sahaj do at ${r.org}?`, `What was his role at ${r.org}?`, `Tell me about his ${r.kind.toLowerCase()} as ${r.role}`], `${r.role} at ${r.org} (${fmtRange(r.start, r.end)}, ${r.place}). ${r.points.join(' ')}`, url);
    add([`When did Sahaj work at ${r.org}?`, `How long was the ${r.role} role?`], `${fmtRange(r.start, r.end)}.`, url);
  }
  for (const c of profile.community) add([`What did Sahaj do as ${c.role}?`, `Was Sahaj part of ${c.org.split(' · ')[0]}?`], `${c.role} at ${c.org}, ${c.end === null ? 'ongoing since ' + c.start.slice(0, 4) : fmtRange(c.start, c.end)}. ${c.note || ''}`.trim(), '/#community');

  // Skills: "Does he know X?" grounded in the skills list and any project that uses it.
  for (const g of profile.skills) {
    for (const s of g.items) {
      const used = projects.filter((p) => (p.stack.join(' ') + ' ' + p.approach).toLowerCase().includes(s.toLowerCase().split(' ')[0]));
      const a = `Yes. ${s} is in his ${g.group} skills.${used.length ? ` He used it in ${used.map((p) => p.name).join(', ')}.` : ''}`;
      add([`Does Sahaj know ${s}?`, `Has he worked with ${s}?`], a, used.length === 1 ? `/#p-${used[0].id}` : '/#skills');
    }
  }
  add(['What are Sahaj\'s skills?', 'List his technical skills', 'What is his tech stack?'], profile.skills.map((g) => `${g.group}: ${g.items.join(', ')}`).join('. ') + '.', '/#skills');

  // Certifications.
  for (const c of profile.certifications) add([`Does Sahaj have the ${c.name} certification?`, `Who issued his ${c.name} certificate?`], `Yes, ${c.name}, issued by ${c.issuer}${c.note ? ` (${c.note})` : ''}.`, '/#certs');

  // Links.
  for (const l of profile.links) add([`What is Sahaj's ${l.label}?`, `${l.label} profile link`], `${l.label}: ${l.url}`, '/#contact');
  add(['What is his email?', 'Email address', 'How do I email Sahaj?'], `Email Sahaj at ${profile.email}.`, '/#contact');

  // Live GitHub facts.
  if (github.fetched_at) {
    const langs = Object.entries(github.languages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
    const recent = github.repos.slice().sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 3);
    add(['How many GitHub repositories does Sahaj have?', 'How many repos?'], `${github.user.public_repos} public repositories on GitHub (SahajIVVIX-1).`, '/#certs');
    add(['What languages does Sahaj code in most?', 'Top programming languages on GitHub'], `By code size on GitHub: ${langs.join(', ')}.`, '/#certs');
    add(['What is Sahaj working on lately?', 'What did he push recently?', 'Recent GitHub activity'], `Most recently updated repositories: ${recent.map((r) => `${r.name} (${r.pushed_at.slice(0, 10)})`).join(', ')}.`, '/#certs');
    add(['How many GitHub stars does Sahaj have?'], `${github.totals.stars} stars across his public repositories.`, '/#certs');
  }
  return qa;
}

function mapItems({ profile, projects }) {
  const items = [];
  for (const p of projects) items.push({ label: p.name, kind: 'project', href: `#p-${p.id}`, text: `${p.name}. ${p.kind}. ${p.problem} ${p.approach}` });
  for (const g of profile.skills) for (const s of g.items) items.push({ label: s, kind: 'skill', href: '#skills', text: `${s} (${g.group})` });
  for (const r of profile.experience) items.push({ label: r.org.replace(/ (India )?Private Limited/, ''), kind: 'experience', href: `#x-${r.id}`, text: `${r.role} at ${r.org}. ${r.points.join(' ')}` });
  for (const c of profile.certifications) items.push({ label: c.name, kind: 'cert', href: '#certs', text: `${c.name} certification by ${c.issuer}` });
  return items;
}

const aOrAn = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function loadPosts() {
  const dir = path('content/blog');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => {
    const { meta, body } = parseFrontMatter(readText(`content/blog/${f}`));
    return meta.draft === 'true' ? null : { slug: meta.slug || slug(f.replace(/\.md$/, '')), title: meta.title || f, body };
  }).filter(Boolean);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('embed.mjs')) {
  await embedAll();
}
