// Build-time ML over the live repo data. Pure JS, deterministic, runs in CI.
//   TF-IDF  →  cosine kNN ("related work")
//           →  PCA via Gram-matrix power iteration  →  2-D project map
//           →  spherical k-means (k-means++ seeded)  →  topic clusters, auto-labelled
//   skill × project evidence matrix ("attention map")
//   retrieval corpus for the in-browser RAG assistant

const STOP = new Set(('a an and are as at be by for from has have in into is it its of on or that the this to was were will with you your our we i me my using use used via can also more than not but all any each which who what when where how only over per such these those their them they then there out up so if no yes do does done just very about across after before both other into new one two three app apps project projects repository repo built build builds make makes made based run runs file files code python data model models system systems tool tools support supports feature features include includes including https http www com github md readme click install pip clone cd git start usage example license mit').split(' '));

const tokenize = (s) => s.toLowerCase()
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/[^a-z0-9+#.\s-]/g, ' ')
  .split(/[\s\-.]+/)
  .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));

function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (a) => { const n = Math.sqrt(dot(a, a)) || 1; return a.map((x) => x / n); };

export function tfidf(docs) {
  const toks = docs.map(tokenize);
  const df = new Map();
  toks.forEach((ts) => new Set(ts).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  // Keep terms that appear in ≥1 doc but not in nearly all of them.
  const vocab = [...df.keys()].filter((t) => df.get(t) < docs.length * 0.8).sort();
  const idx = new Map(vocab.map((t, i) => [t, i]));
  const N = docs.length;
  const vecs = toks.map((ts) => {
    const v = new Array(vocab.length).fill(0);
    const tf = new Map();
    ts.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
    tf.forEach((c, t) => { if (idx.has(t)) v[idx.get(t)] = (1 + Math.log(c)) * Math.log((1 + N) / (1 + df.get(t)) + 1); });
    return norm(v);
  });
  return { vocab, vecs };
}

// Top-2 principal components of the row vectors, via the n×n Gram matrix (n = #repos ≪ #terms).
export function pca2(vecs) {
  const n = vecs.length, d = vecs[0]?.length || 0;
  if (n < 3) return vecs.map((_, i) => [i, 0]);
  const mean = new Array(d).fill(0);
  vecs.forEach((v) => v.forEach((x, j) => (mean[j] += x / n)));
  const C = vecs.map((v) => v.map((x, j) => x - mean[j]));
  const G = C.map((a) => C.map((b) => dot(a, b)));
  const comps = [];
  const rand = rng(7);
  for (let k = 0; k < 2; k++) {
    let v = Array.from({ length: n }, () => rand() - 0.5);
    let lambda = 0;
    for (let it = 0; it < 200; it++) {
      let w = G.map((row) => dot(row, v));
      comps.forEach(({ v: u }) => { const p = dot(w, u); w = w.map((x, i) => x - p * u[i]); });
      lambda = Math.sqrt(dot(w, w));
      v = w.map((x) => x / (lambda || 1));
    }
    comps.push({ v, lambda });
  }
  return vecs.map((_, i) => comps.map(({ v, lambda }) => v[i] * Math.sqrt(lambda)));
}

export function kmeans(vecs, k, iters = 50) {
  const rand = rng(42);
  const cents = [vecs[Math.floor(rand() * vecs.length)]];
  while (cents.length < k) {
    const d2 = vecs.map((v) => Math.min(...cents.map((c) => 1 - dot(v, c))) ** 2);
    const sum = d2.reduce((a, b) => a + b, 0) || 1;
    let r = rand() * sum, i = 0;
    while ((r -= d2[i]) > 0 && i < vecs.length - 1) i++;
    cents.push(vecs[i]);
  }
  let assign = [];
  for (let it = 0; it < iters; it++) {
    const next = vecs.map((v) => cents.reduce((best, c, j) => (dot(v, c) > dot(v, cents[best]) ? j : best), 0));
    if (next.join() === assign.join()) break;
    assign = next;
    for (let j = 0; j < k; j++) {
      const members = vecs.filter((_, i) => assign[i] === j);
      if (!members.length) continue;
      cents[j] = norm(members[0].map((_, t) => members.reduce((s, m) => s + m[t], 0)));
    }
  }
  return { assign, cents };
}

// Human-readable cluster names: score each centroid against a small theme lexicon.
const THEMES = {
  'Agents & RAG': ['agent', 'agentic', 'rag', 'retrieval', 'langgraph', 'crewai', 'llm', 'qdrant', 'multi', 'orchestrator', 'research'],
  'Learning systems': ['learning', 'reinforcement', 'gan', 'dcgan', 'pytorch', 'neural', 'shap', 'xgboost', 'prediction', 'training', 'reward'],
  'Data & analytics': ['analytics', 'mongodb', 'sentiment', 'tweets', 'dashboard', 'pipeline', 'big', 'sql', 'student', 'performance'],
  'Vision & media': ['video', 'image', 'vision', 'opencv', 'vmix', 'camera', 'frames', 'scroller'],
  'Tools & infra': ['proxy', 'docker', 'launcher', 'environment', 'desktop', 'pyqt', 'security', 'server', 'game', 'lab'],
};
function themeOf(c, vocab, used) {
  const w = new Map(vocab.map((t, i) => [t, c[i]]));
  const ranked = Object.entries(THEMES)
    .map(([name, keys]) => [name, keys.reduce((a, k) => a + [...w.keys()].filter((t) => t.startsWith(k)).reduce((b, t) => b + w.get(t), 0), 0)])
    .sort((a, b) => b[1] - a[1]);
  const pick = ranked.find(([n, sc]) => sc > 0 && !used.has(n));
  return pick ? pick[0] : null;
}

const words = (r) => r.name.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');

export function analyze(profile, live) {
  const repos = live?.github?.repos || [];
  const featuredBy = new Map(profile.featured.map((f) => [f.repo.toLowerCase(), f]));
  const text = (r) => {
    const f = featuredBy.get(r.name.toLowerCase());
    return [words(r), words(r), r.description, r.topics.join(' '), r.topics.join(' '), f ? `${f.title} ${f.summary} ${f.stack.join(' ')}` : '', r.readme].join(' ');
  };

  let map = { points: [], clusters: [] };
  const related = {};
  if (repos.length >= 3) {
    const { vocab, vecs } = tfidf(repos.map(text));
    const xy = pca2(vecs);
    const k = Math.max(2, Math.min(4, Math.round(repos.length / 4)));
    const { assign, cents } = kmeans(vecs, k);
    // Label each cluster with its two heaviest centroid terms.
    const used = new Set();
    const clusters = cents.map((c, j) => {
      const terms = c.map((w, t) => [w, vocab[t]]).sort((a, b) => b[0] - a[0]).slice(0, 4).map((x) => x[1]);
      const theme = themeOf(c, vocab, used);
      if (theme) used.add(theme);
      return { id: j, size: assign.filter((a) => a === j).length, label: theme || terms.slice(0, 2).join(' · '), terms };
    });
    const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
    const sx = (x) => (x - Math.min(...xs)) / ((Math.max(...xs) - Math.min(...xs)) || 1);
    const sy = (y) => (y - Math.min(...ys)) / ((Math.max(...ys) - Math.min(...ys)) || 1);
    map = {
      points: repos.map((r, i) => ({ name: r.name, x: +sx(xy[i][0]).toFixed(4), y: +sy(xy[i][1]).toFixed(4), c: assign[i], featured: featuredBy.has(r.name.toLowerCase()) })),
      clusters,
      vocab: vocab.length,
    };
    repos.forEach((r, i) => {
      related[r.name] = repos
        .map((o, j) => [o.name, j === i ? -1 : dot(vecs[i], vecs[j])])
        .sort((a, b) => b[1] - a[1]).slice(0, 2)
        .filter((x) => x[1] > 0.02)
        .map(([name, s]) => ({ name, sim: +s.toFixed(3) }));
    });
  }

  // Skill × project evidence: how strongly each project's text mentions each skill.
  const projects = [
    ...profile.featured.map((f) => ({ id: f.repo, label: f.short || f.title.split(/[—-]/)[0].trim(), text: `${f.title} ${f.summary} ${f.stack.join(' ')} ${repos.find((r) => r.name === f.repo)?.readme || ''}` })),
    ...profile.experience.slice(0, 2).map((e) => ({ id: e.id, label: e.short || e.org.split(' ')[0], text: `${e.role} ${e.points.join(' ')} ${e.stack.join(' ')}` })),
    ...repos.filter((r) => !featuredBy.has(r.name.toLowerCase())).slice(0, 4).map((r) => ({ id: r.name, label: r.name.replace(/[-_]/g, ' '), text: text(r) })),
  ];
  const skillList = Object.values(profile.skills).flat();
  const needles = (s) => [s.toLowerCase(), ...(profile.aliases[s] || [])];
  const count = (hay, n) => { let c = 0, i = -1; while ((i = hay.indexOf(n, i + 1)) !== -1) c++; return c; };
  const raw = skillList.map((s) => projects.map((p) => needles(s).reduce((a, n) => a + count(` ${p.text.toLowerCase()} `, n), 0)));
  const rows = skillList.map((s, i) => ({ skill: s, total: raw[i].reduce((a, b) => a + b, 0), cells: raw[i] }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const max = Math.max(1, ...rows.flatMap((r) => r.cells));
  const attention = {
    cols: projects.map((p) => ({ id: p.id, label: p.label })),
    rows: rows.map((r) => ({ skill: r.skill, total: r.total, cells: r.cells.map((c) => +(Math.log1p(c) / Math.log1p(max)).toFixed(3)), counts: r.cells })),
  };
  // Evidence count per skill (for the skills section badges).
  const evidence = Object.fromEntries(skillList.map((s, i) => [s, raw[i].filter((c) => c > 0).length]));

  return { map, related, attention, evidence };
}

// Chunks the in-browser assistant retrieves over. Kept short so BM25 stays sharp.
export function corpus(profile, live) {
  const C = [];
  const add = (id, title, text, href, kind) => C.push({ id, title, text: text.replace(/\s+/g, ' ').trim(), href, kind });
  const third = (s) => s.replace(/\bI['’]m\b/g, 'Sahaj is').replace(/\bI\b/g, 'he').replace(/\bmy\b/g, 'his').replace(/\bMy\b/g, 'His').replace(/\bme\b/g, 'him');
  add('about', 'About Sahaj', `${third(profile.summary)} Based in ${profile.location}. ${profile.status}. Speaks ${profile.languages.join(', ')}.`, '#about', 'profile');
  add('contact', 'How to reach Sahaj', `Best way to contact or hire Sahaj: use the email button in the Contact section, or connect on LinkedIn (${profile.links.linkedin}) and GitHub. Resume PDF available to download. ${profile.status}.`, '#contact', 'profile');
  profile.experience.forEach((e) => add(`exp-${e.id}`, `${e.role} — ${e.org}`, `${e.role} at ${e.org}, ${e.place} (${e.start} to ${e.end}). ${e.points.join(' ')} Stack: ${e.stack.join(', ')}.`, '#experience', 'experience'));
  profile.education.forEach((e, i) => add(`edu-${i}`, e.school, `Education: ${e.degree} at ${e.school}, ${e.start}–${e.end}. ${e.grade || ''}`, '#about', 'education'));
  profile.featured.forEach((f) => add(`proj-${f.repo}`, f.title, `${f.title} (${f.kicker}). ${f.summary} Results: ${f.metrics.map((m) => m.join(' ')).join(', ')}. Built with ${f.stack.join(', ')}.`, `#work`, 'project'));
  Object.entries(profile.skills).forEach(([k, v]) => add(`skills-${k}`, `Skills — ${k}`, `${k} skills: ${v.join(', ')}.`, '#skills', 'skills'));
  add('certs', 'Certifications', `Certifications: ${profile.certifications.map((c) => `${c.name} (${c.issuer})`).join('; ')}.`, '#proof', 'credentials');
  add('award', profile.achievement.title, `Achievement: ${profile.achievement.title} — ${profile.achievement.detail}`, '#proof', 'credentials');
  add('ai-workflow', 'How Sahaj uses AI tools', `AI tools Sahaj uses daily: ${profile.aiWorkflow.map((a) => `${a.tool} — ${a.use}`).join(' ')}`, '#ai', 'workflow');
  add('metrics', 'Measured results', profile.metrics.map((m) => `${m.label}: ${m.value} (${m.note})`).join('. ') + '.', '#about', 'profile');
  (live?.github?.repos || []).forEach((r) => add(`repo-${r.name}`, r.name, `GitHub repository ${r.name}${r.archived ? ' (archived)' : ''}: ${r.description} Topics: ${r.topics.join(', ') || 'n/a'}. Language: ${r.language || 'n/a'}. ${r.readme.slice(0, 700)}`, r.url, 'repo'));
  const lc = live?.leetcode;
  if (lc) add('leetcode', 'LeetCode', `LeetCode (${profile.handles.leetcode}): ${lc.solved.All} problems solved — ${lc.solved.Easy} easy, ${lc.solved.Medium} medium, ${lc.solved.Hard} hard. Mostly in ${lc.languages[0]?.[0] || 'C++'}. Strongest topics: ${lc.tags.slice(0, 5).map((t) => t[0]).join(', ')}.${lc.contest ? ` Contest rating ${lc.contest.rating}.` : ''}`, profile.links.leetcode, 'stats');
  const g = live?.github;
  if (g) add('github', 'GitHub activity', `GitHub ${profile.handles.github}: ${g.user.publicRepos} public repositories, ${g.user.followers} followers${g.contributions ? `, ${g.contributions.total} contributions in the last year` : ''}. Bio: ${g.user.bio}`, profile.links.github, 'stats');
  return C;
}
