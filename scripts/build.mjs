// Zero-dependency static site generator.
//   content/profile.json + data/live.json  →  ML analysis  →  dist/
// Every chart is rendered to inline SVG/HTML here, so the page is complete without JS;
// client scripts only add interaction and motion.
import { readFile, writeFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readJSON, writeJSON, path, hash } from './lib.mjs';
import { analyze, corpus } from './ml.mjs';

const SITE = 'https://info.sahaj.si';
const OUT = path('dist/');
const P = await readJSON(path('content/profile.json'));
const L = (await readJSON(path('data/live.json'))) || { status: {} };
const ML = analyze(P, L);
const NOW = new Date(L.generatedAt || Date.now());

// ---------- helpers ----------
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const ym = (s) => { const [y, m] = s.split('-').map(Number); return { y, m, t: y * 12 + (m - 1) }; };
const fmtYM = (s) => { const { y, m } = ym(s); return `${MONTHS[m - 1]} ${y}`; };
const fmtDate = (iso) => { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const ago = (iso) => {
  const s = (NOW - new Date(iso)) / 1000;
  const u = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [n, l] of u) if (s >= n) return `${Math.floor(s / n)}${l} ago`;
  return 'just now';
};
// How each source's sync state is shown. "unavailable" sources fall back to content/profile.json.
const STATE = { ok: 'live', stale: 'cached', unavailable: 'fallback', skipped: 'cached' };
const n2 = (x) => (Math.round(x * 100) / 100).toString();
const LANG = { Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', 'Jupyter Notebook': '#DA5B0B', HTML: '#e34c26', CSS: '#663399', Dockerfile: '#384d54', Shell: '#89e051', 'C++': '#f34b7d', Java: '#b07219', Go: '#00ADD8', Rust: '#dea584' };
const icon = (name) => `<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const repos = L.github?.repos || [];
const featuredNames = new Set(P.featured.map((f) => f.repo.toLowerCase()));
const repoBy = new Map(repos.map((r) => [r.name.toLowerCase(), r]));

// ---------- SVG sprite ----------
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-gh" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.58.24 2.75.12 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></symbol>
<symbol id="i-in" viewBox="0 0 24 24"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z"/></symbol>
<symbol id="i-lc" viewBox="0 0 24 24"><path fill="currentColor" d="M13.48 0a1.37 1.37 0 0 0-.96.44L2.71 10.95a3.77 3.77 0 0 0-.04 5.16l4.84 5.18a3.73 3.73 0 0 0 5.4.05l2.43-2.47a1.38 1.38 0 0 0-1.96-1.93l-2.43 2.47a1 1 0 0 1-1.44-.01l-4.83-5.19a1 1 0 0 1 .01-1.38l4.4-4.71 4.42 4.44 1.95-1.96-4.34-4.36 3.36-3.6A1.38 1.38 0 0 0 13.48 0Zm-2.87 13.1a1.37 1.37 0 0 0 0 2.75h10.01a1.37 1.37 0 0 0 0-2.75Z"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3 6.5h18v11H3zM3.5 7l8.5 6.5L20.5 7"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/></symbol>
<symbol id="i-doc" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path fill="currentColor" d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></symbol>
<symbol id="i-spark" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c.4 4.6 2.4 7.6 8 8.4v1.2c-5.6.8-7.6 3.8-8 8.4h-1.2c-.4-4.6-2.4-7.6-8-8.4v-1.2c5.6-.8 7.6-3.8 8-8.4z"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></symbol>
<symbol id="i-cmd" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z"/></symbol>
<symbol id="i-send" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M4 12 20 4l-5 16-3-7z"/></symbol>
<symbol id="i-trophy" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.6 4M16 6h3.5a3 3 0 0 1-3.6 4M12 13v4M8.5 20h7M10 17h4"/></symbol>
</defs></svg>`;

// ---------- section: hero ----------
function hero() {
  const g = L.github, lc = L.leetcode;
  const lastPush = repos.slice().sort((a, b) => new Date(b.pushed) - new Date(a.pushed))[0];
  const chips = [
    g?.contributions && [`${g.contributions.total}`, 'contributions / yr', P.links.github],
    lc && [`${lc.solved.All}`, 'LeetCode solved', P.links.leetcode],
    lastPush && [ago(lastPush.pushed), `last push · ${lastPush.name}`, lastPush.url, lastPush.pushed],
  ].filter(Boolean);
  return `
<section class="hero" id="top" aria-labelledby="name">
  <div class="hero-grid">
    <div class="hero-copy">
      <p class="eyebrow rise" style="--n:0"><span class="pulse" aria-hidden="true"></span>${esc(P.status)}</p>
      <div class="name-wrap">
        <h1 id="name" class="name"><span class="n1">${esc(P.first)}</span> <span class="n2">${esc(P.last)}</span></h1>
        <canvas class="name-canvas" aria-hidden="true"></canvas>
        <p class="diffusion mono" aria-hidden="true"><span class="d-label">denoising</span> t=<span class="d-t">0</span>/1000</p>
      </div>
      <p class="sampler mono" data-lines="${esc(JSON.stringify(P.taglines))}"><span class="sr">${esc(P.taglines[0])}</span><span class="s-out" aria-hidden="true">${esc(P.taglines[0])}</span><span class="caret" aria-hidden="true"></span><span class="s-cands" aria-hidden="true"></span></p>
      <p class="lede rise" style="--n:2">${esc(P.headline)}</p>
      <div class="cta rise" style="--n:3">
        <a class="btn btn-primary" href="#ask" data-open-ask>${icon('spark')}Ask my portfolio</a>
        <a class="btn" href="${P.links.resume}" target="_blank" rel="noopener">${icon('doc')}Résumé</a>
        <a class="btn btn-ghost" href="#work">View work ${icon('arrow')}</a>
      </div>
    </div>
    <figure class="portrait rise" style="--n:1" aria-label="Portrait of ${esc(P.name)}">
      <div class="portrait-frame">
        <picture>
          <source type="image/avif" srcset="/img/portrait-320.avif 320w, /img/portrait-640.avif 640w, /img/portrait-960.avif 960w" sizes="(max-width: 900px) 80vw, 420px">
          <img src="/img/portrait-640.webp" srcset="/img/portrait-320.webp 320w, /img/portrait-640.webp 640w, /img/portrait-960.webp 960w" sizes="(max-width: 900px) 80vw, 420px" width="640" height="640" alt="${esc(P.name)} smiling, wearing glasses and a white polo, on a boat with a green riverbank behind" fetchpriority="high" decoding="async">
        </picture>
        <div class="patches" aria-hidden="true">${Array.from({ length: 64 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div>
        <figcaption class="patch-cap mono" aria-hidden="true"><span>ViT-B/16 · self-attention</span><span class="p-q">query patch —</span></figcaption>
      </div>
      <ul class="chips">${chips.map(([v, l, href, iso]) => `<li><a href="${href}" target="_blank" rel="noopener"><b ${iso ? `data-ago="${iso}"` : ''}>${esc(v)}</b><span>${esc(l)}</span></a></li>`).join('')}</ul>
    </figure>
  </div>
  <a class="scroll-cue mono" href="#about" aria-label="Scroll to model card"><span></span>scroll</a>
</section>`;
}

// ---------- section header ----------
const head = (n, kicker, title, sub = '') => `
  <header class="sec-head reveal">
    <p class="kicker mono"><span>${n}</span>${esc(kicker)}</p>
    <h2>${title}</h2>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
  </header>`;

// ---------- section: model card ----------
function modelCard() {
  const g = L.github;
  const rows = [
    ['model', 'sahaj-saliya', 'mono'],
    ['version', 'v2027.0-preview · graduating May 2027'],
    ['architecture', 'Engineer × researcher · agent-first, eval-driven'],
    ['training data', `B.Tech ICT @ PDEU (CGPA 8.5) · ${P.experience.length} roles · ${g ? g.user.publicRepos : repos.length} public repos`],
    ['fine-tuned on', 'Agentic RAG · LLM infrastructure · RL · explainable ML'],
    ['languages', P.languages.join(' · ')],
    ['intended use', 'Shipping AI systems that retrieve, reason, cite and self-correct'],
    ['out of scope', 'Demos without evals. Answers without sources.'],
    ['license', 'Open to work — 2027 · remote / on-site'],
  ];
  const max = 1;
  return `
<section id="about" class="section" aria-labelledby="about-h">
  ${head('01', 'Model card', '<span id="about-h">A model card,<br><em>for a human.</em></span>', 'The way I document models is the way I document myself: the specs, the training data and the evals, with nothing inflated.')}
  <div class="mcard reveal">
    <div class="mcard-bar mono"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>README.md <span class="tag">${icon('spark')} model-card</span></div>
    <div class="mcard-body">
      <dl class="kv">${rows.map(([k, v, c]) => `<div><dt class="mono">${k}</dt><dd${c ? ` class="${c}"` : ''}>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="evals">
        <h3 class="mono">evaluation results</h3>
        <table>
          <thead><tr><th scope="col">metric</th><th scope="col">value</th><th scope="col">source</th></tr></thead>
          <tbody>${P.metrics.map((m) => `<tr><th scope="row">${esc(m.label)}</th><td class="v">${esc(m.value)}</td><td>${esc(m.note)}</td></tr>`).join('')}</tbody>
        </table>
        <p class="summary">${esc(P.summary)}</p>
        <div class="edu">${P.education.map((e) => `<div><b>${esc(e.school)}</b><span>${esc(e.degree)} · ${e.start}–${e.end}${e.grade ? ` · ${esc(e.grade)}` : ''}</span></div>`).join('')}</div>
      </div>
    </div>
  </div>
</section>`;
}

// ---------- section: experience as a training run ----------
function experience() {
  const exps = P.experience.slice().sort((a, b) => ym(a.start).t - ym(b.start).t);
  const t0 = ym('2023-06').t, t1 = Math.max(ym(`${NOW.getUTCFullYear()}-${String(NOW.getUTCMonth() + 1).padStart(2, '0')}`).t, ym('2026-10').t);
  const W = 1000, H = 260, pad = { l: 40, r: 20, t: 24, b: 34 };
  const X = (t) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const loss = (u) => 0.12 + 0.78 * Math.exp(-3.1 * u) + 0.035 * Math.sin(u * 47) * Math.exp(-1.4 * u) + 0.018 * Math.sin(u * 131);
  const Y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const pts = Array.from({ length: 181 }, (_, i) => [X(t0 + (i / 180) * (t1 - t0)), Y(loss(i / 180))]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const area = `${d}L${pts.at(-1)[0].toFixed(1)} ${H - pad.b}L${pts[0][0].toFixed(1)} ${H - pad.b}Z`;
  const years = []; for (let y = 2024; y <= Math.floor(t1 / 12); y++) years.push(y);
  const marks = exps.map((e, i) => { const u = (ym(e.start).t - t0) / (t1 - t0); return { e, i, x: X(ym(e.start).t), y: Y(loss(u)), x2: X(ym(e.end).t) }; });
  return `
<section id="experience" class="section" aria-labelledby="exp-h">
  ${head('02', 'Training run', '<span id="exp-h">Every role,<br><em>a lower loss.</em></span>', 'My career plotted as a training curve. Each checkpoint is a role that cut the error a little further. Hover a checkpoint to read its log.')}
  <div class="run reveal">
    <div class="run-meta mono"><span>run: sahaj/career</span><span>optimizer: curiosity · lr warm-up 2023</span><span class="ok">● training</span></div>
    <svg class="curve" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stylised training-loss curve with a checkpoint for each role from 2023 to today">
      <defs><linearGradient id="lossfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient>
      <linearGradient id="lossline" x1="0" x2="1"><stop offset="0" stop-color="var(--g1)"/><stop offset=".55" stop-color="var(--g2)"/><stop offset="1" stop-color="var(--g3)"/></linearGradient></defs>
      ${[0.25, 0.5, 0.75].map((v) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}
      ${years.map((y) => `<g class="yr"><line x1="${X(y * 12)}" x2="${X(y * 12)}" y1="${pad.t}" y2="${H - pad.b}"/><text x="${X(y * 12) + 6}" y="${H - 12}">${y}</text></g>`).join('')}
      <text class="axis" x="${pad.l - 30}" y="${pad.t + 6}">loss</text>
      ${marks.map((m) => `<rect class="span" x="${m.x}" y="${pad.t}" width="${Math.max(4, m.x2 - m.x)}" height="${H - pad.t - pad.b}" data-k="${m.e.id}"/>`).join('')}
      <path class="area" d="${area}" fill="url(#lossfill)"/>
      <path class="line" d="${d}" pathLength="1" stroke="url(#lossline)"/>
      ${marks.map((m, i) => `<g class="ck" data-k="${m.e.id}" tabindex="-1"><circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="7"/><text x="${m.x.toFixed(1)}" y="${(m.y - 14).toFixed(1)}">ckpt-${i + 1}</text></g>`).join('')}
    </svg>
    <ol class="roles">${exps.slice().reverse().map((e) => `
      <li class="role" data-k="${e.id}" tabindex="0">
        <div class="role-top"><span class="mono when">${fmtYM(e.start)} — ${fmtYM(e.end)}</span><span class="mono kind">${esc(e.kind)}</span></div>
        <h3>${esc(e.role)}</h3>
        <p class="org">${esc(e.org)} · ${esc(e.place)}</p>
        <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <p class="stack mono">${e.stack.map(esc).join(' · ')}</p>
      </li>`).join('')}
    </ol>
  </div>
</section>`;
}

// ---------- featured project pipeline diagram ----------
function pipeline(f, k) {
  const cols = 4, w = 128, h = 42, gx = 22, gy = 58, ox = 6, oy = 30;
  const pos = f.pipeline.map((_, i) => { const r = Math.floor(i / cols), c = r % 2 ? cols - 1 - (i % cols) : i % cols; return [ox + c * (w + gx), oy + r * (h + gy)]; });
  const ctr = pos.map(([x, y]) => [x + w / 2, y + h / 2]);
  const rows = Math.ceil(f.pipeline.length / cols);
  const W = ox * 2 + cols * w + (cols - 1) * gx, H = oy + rows * h + (rows - 1) * gy + 34;
  const motion = ctr.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');
  let loop = '';
  if (f.loop) {
    const [a, b] = f.loop, A = pos[a], B = pos[b];
    const ax = A[0] + w / 2, bx = B[0] + w / 2, y = Math.max(A[1], B[1]) + h, yy = y + 26;
    const same = A[1] === B[1];
    // Cross-row loops leave the top of the later node and land under the earlier one, through the row gap.
    const dd = same ? `M${ax} ${A[1] + h}C${ax} ${yy} ${bx} ${yy} ${bx} ${B[1] + h}` : `M${ax - 18} ${A[1]}C${ax - 18} ${A[1] - 34} ${bx + 18} ${B[1] + h + 34} ${bx + 18} ${B[1] + h + 2}`;
    const lx = same ? (ax + bx) / 2 : (ax + bx) / 2, ly = same ? yy + 4 : (A[1] + B[1] + h) / 2 + 4;
    loop = `<path class="loop" d="${dd}" marker-end="url(#ah${k})"/><text class="loop-t" x="${lx}" y="${ly}">${a === 4 ? 'rewrite & retry' : 'next episode'}</text>`;
  }
  return `<svg class="pipe" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pipeline: ${esc(f.pipeline.join(' → '))}">
    <defs><marker id="ah${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--accent)"/></marker></defs>
    <path class="wire" d="${motion}"/>
    ${loop}
    ${pos.map(([x, y], i) => `<g class="node${i === 0 || i === pos.length - 1 ? ' io' : ''}" style="--d:${i * 0.35}s"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10"/><text x="${x + w / 2}" y="${y + h / 2 + 4}">${esc(f.pipeline[i])}</text><text class="idx" x="${x + 8}" y="${y - 6}">${String(i).padStart(2, '0')}</text></g>`).join('')}
    <circle class="packet" r="5"><animateMotion dur="${(f.pipeline.length * 0.7).toFixed(1)}s" repeatCount="indefinite" path="${motion}" keyPoints="0;1" keyTimes="0;1" calcMode="linear"/></circle>
  </svg>`;
}

// ---------- section: work ----------
function repoCard(r) {
  const p = ML.map.points.find((x) => x.name === r.name);
  const cl = p ? ML.map.clusters[p.c] : null;
  const rel = ML.related[r.name] || [];
  return `<li class="repo" data-c="${p ? p.c : ''}">
    <a href="${r.url}" target="_blank" rel="noopener" class="repo-link">
      <div class="repo-top"><span class="mono lang"><i style="--lc:${LANG[r.language] || 'var(--muted)'}"></i>${esc(r.language || 'Mixed')}</span>${r.archived ? '<span class="badge">archived</span>' : ''}${featuredNames.has(r.name.toLowerCase()) ? '<span class="badge hot">featured</span>' : ''}</div>
      <h3>${esc(r.name.replace(/[-_]/g, ' '))}</h3>
      <p>${esc(r.description || r.readme.slice(0, 140) || 'No description yet.')}</p>
      ${r.topics.length ? `<p class="topics mono">${r.topics.slice(0, 4).map((t) => `#${esc(t)}`).join(' ')}</p>` : ''}
      <div class="repo-foot mono"><span title="Stars">${icon('star')}${r.stars}</span><span data-ago="${r.pushed}">${ago(r.pushed)}</span>${cl ? `<span class="cl c${p.c}">${esc(cl.label)}</span>` : ''}</div>
      ${rel.length ? `<p class="rel mono">≈ ${rel.map((x) => `${esc(x.name)} <b>${x.sim.toFixed(2)}</b>`).join(' · ')}</p>` : ''}
    </a>
  </li>`;
}

function hull(pts) {
  if (pts.length < 3) return pts;
  const s = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of s) { while (lo.length >= 2 && cr(lo.at(-2), lo.at(-1), p) <= 0) lo.pop(); lo.push(p); }
  for (const p of s.reverse()) { while (up.length >= 2 && cr(up.at(-2), up.at(-1), p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function latentMap() {
  const { points, clusters } = ML.map;
  if (!points.length) return '';
  const W = 900, H = 460, m = 70;
  const X = (x) => m + x * (W - 2 * m), Y = (y) => m * 0.7 + (1 - y) * (H - 1.4 * m);
  const blobs = clusters.map((c) => {
    const ps = points.filter((p) => p.c === c.id).map((p) => [X(p.x), Y(p.y)]);
    const hp = hull(ps);
    const cx = ps.reduce((a, p) => a + p[0], 0) / ps.length, cy = ps.reduce((a, p) => a + p[1], 0) / ps.length;
    const dpath = hp.length > 2 ? `M${hp.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z` : hp.length === 2 ? `M${hp[0].join(' ')}L${hp[1].join(' ')}` : `M${hp[0][0]} ${hp[0][1]}h.1`;
    return `<g class="blob c${c.id}"><path d="${dpath}"/><text x="${cx.toFixed(1)}" y="${(Math.min(...ps.map((p) => p[1])) - 34).toFixed(1)}">${esc(c.label)}</text></g>`;
  }).join('');
  // Labels: start beside each point, then relax vertically until none overlap.
  const lab = points.map((p) => ({ x: X(p.x), y: Y(p.y) + 4, right: p.x < 0.72, w: p.name.length * 7 + 14 }));
  for (let it = 0; it < 80; it++) for (let i = 0; i < lab.length; i++) for (let j = i + 1; j < lab.length; j++) {
    const a = lab[i], b = lab[j];
    const ax0 = a.right ? a.x : a.x - a.w, bx0 = b.right ? b.x : b.x - b.w;
    if (ax0 < bx0 + b.w && bx0 < ax0 + a.w && Math.abs(a.y - b.y) < 15) { const d = (15 - Math.abs(a.y - b.y)) / 2 + 0.5, s = a.y <= b.y ? -1 : 1; a.y += s * d; b.y -= s * d; }
  }
  const dots = points.map((p, i) => {
    const r = repoBy.get(p.name.toLowerCase());
    const x = X(p.x), y = Y(p.y), right = lab[i].right;
    return `<a href="${r?.url}" target="_blank" rel="noopener" class="pt c${p.c}${p.featured ? ' f' : ''}" data-name="${esc(p.name)}" data-desc="${esc((r?.description || '').slice(0, 110))}" aria-label="${esc(p.name)} — ${esc(clusters[p.c].label)}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${p.featured ? 8 : 5.5}"/>
      <text x="${(x + (right ? 12 : -12)).toFixed(1)}" y="${lab[i].y.toFixed(1)}" text-anchor="${right ? 'start' : 'end'}">${esc(p.name.replace(/[-_]/g, ' '))}</text></a>`;
  }).join('');
  return `<svg class="latent" viewBox="0 0 ${W} ${H}" role="group" aria-label="2-D PCA projection of TF-IDF vectors of my repositories, coloured by k-means cluster">
    <g class="axes"><line x1="${m / 2}" y1="${H - m / 2}" x2="${W - m / 2}" y2="${H - m / 2}"/><line x1="${m / 2}" y1="${m / 3}" x2="${m / 2}" y2="${H - m / 2}"/><text x="${W - m / 2}" y="${H - m / 2 + 18}" text-anchor="end">PC1</text><text x="${m / 2 + 8}" y="${m / 3 + 6}">PC2</text></g>
    ${blobs}${dots}</svg>`;
}

function work() {
  const featured = P.featured.map((f, k) => {
    const r = repoBy.get(f.repo.toLowerCase());
    return `<article class="feat reveal" id="p-${esc(f.repo)}">
      <div class="feat-copy">
        <p class="kicker mono"><span>${String(k + 1).padStart(2, '0')}</span>${esc(f.kicker)}</p>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.summary)}</p>
        <dl class="fm">${f.metrics.map(([v, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        <p class="stack mono">${f.stack.map(esc).join(' · ')}</p>
        ${r ? `<a class="link" href="${r.url}" target="_blank" rel="noopener">${icon('gh')}Read the code <span class="mono" data-ago="${r.pushed}">${ago(r.pushed)}</span></a>` : ''}
      </div>
      <div class="feat-viz">${pipeline(f, k)}</div>
    </article>`;
  }).join('');
  const rest = repos.slice().sort((a, b) => (a.archived - b.archived) || new Date(b.pushed) - new Date(a.pushed));
  return `
<section id="work" class="section" aria-labelledby="work-h">
  ${head('03', 'Selected work', '<span id="work-h">Systems that<br><em>check their own work.</em></span>', 'Three case studies, each drawn as the pipeline it actually runs. Below them is everything else, synced from GitHub every hour.')}
  <div class="feats">${featured}</div>
  <div class="repos-head reveal">
    <div>
      <h3 class="h3">All repositories <span class="mono count">${repos.length}</span></h3>
      <p class="sub">Pulled live from GitHub. The latent map is TF-IDF over each README, projected to 2-D with PCA and grouped with k-means at build time.</p>
    </div>
    <div class="seg" role="tablist" aria-label="Repository view">
      <button role="tab" aria-selected="true" aria-controls="v-grid" id="t-grid" data-view="grid">Grid</button>
      <button role="tab" aria-selected="false" aria-controls="v-map" id="t-map" data-view="map" tabindex="-1">Latent map</button>
    </div>
  </div>
  <div id="v-grid" role="tabpanel" aria-labelledby="t-grid" class="view reveal"><ul class="repos">${rest.map(repoCard).join('')}</ul></div>
  <div id="v-map" role="tabpanel" aria-labelledby="t-map" class="view map-wrap" hidden>
    ${latentMap()}
    <div class="map-tip mono" aria-hidden="true"></div>
    <p class="map-note mono">${ML.map.vocab || 0}-term vocabulary · ${ML.map.clusters.length} clusters · nearest neighbours by cosine similarity</p>
  </div>
</section>`;
}

// ---------- section: skills attention ----------
function skills() {
  const A = ML.attention;
  const table = `<div class="attn-scroll"><table class="attn">
    <caption class="sr">How often each skill appears in each project or role</caption>
    <thead><tr><td></td>${A.cols.map((c) => `<th scope="col"><span>${esc(c.label)}</span></th>`).join('')}</tr></thead>
    <tbody>${A.rows.map((r, i) => `<tr><th scope="row">${esc(r.skill)}</th>${r.cells.map((v, j) => `<td style="--a:${v};--i:${i + j}" data-n="${r.counts[j]}" title="${esc(r.skill)} × ${esc(A.cols[j].label)}: ${r.counts[j]} mention${r.counts[j] === 1 ? '' : 's'}"><span class="sr">${r.counts[j]}</span></td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
  const groups = Object.entries(P.skills).map(([k, v]) => `<div class="sg"><h3 class="mono">${esc(k)}</h3><ul>${v.map((s) => `<li${ML.evidence[s] ? ` data-ev="${ML.evidence[s]}"` : ''}>${esc(s)}${ML.evidence[s] ? `<sup title="appears in ${ML.evidence[s]} projects">${ML.evidence[s]}</sup>` : ''}</li>`).join('')}</ul></div>`).join('');
  return `
<section id="skills" class="section" aria-labelledby="skills-h">
  ${head('04', 'Attention map', '<span id="skills-h">Skills,<br><em>with receipts.</em></span>', 'Every skill is weighted by how often it shows up in my real projects and roles. The matrix is computed from the code and READMEs at build time, so the evidence stays current.')}
  <div class="attn-wrap reveal">${table}<p class="attn-legend mono"><span>0</span><i></i><span>log-scaled mentions</span></p></div>
  <div class="skill-groups reveal">${groups}</div>
</section>`;
}

// ---------- section: live signals ----------
function heatmap() {
  const c = L.github?.contributions;
  if (!c) return '';
  const days = c.days.slice(-371);
  const first = new Date(days[0][0]).getUTCDay();
  const vals = days.map((d) => d[1]).filter((v) => v > 0).sort((a, b) => a - b);
  const q = (p) => vals[Math.floor(p * (vals.length - 1))] || 1;
  const lv = (v) => (v === 0 ? 0 : v <= q(0.25) ? 1 : v <= q(0.5) ? 2 : v <= q(0.8) ? 3 : 4);
  const s = 11, g = 3;
  // One <path> per intensity level instead of ~370 <rect>s keeps the DOM (and layout) small.
  const paths = ['', '', '', '', ''];
  days.forEach(([, v], i) => { const k = i + first; paths[lv(v)] += `M${Math.floor(k / 7) * (s + g)} ${(k % 7) * (s + g) + 2}q0-2 2-2h${s - 4}q2 0 2 2v${s - 4}q0 2-2 2h-${s - 4}q-2 0-2-2z`; });
  const weeks = Math.ceil((days.length + first) / 7);
  return `<div class="heat-wrap"><svg class="heat" viewBox="0 0 ${weeks * (s + g)} ${7 * (s + g)}" role="img" aria-label="${c.total} GitHub contributions in the last year" data-first="${first}" data-start="${days[0][0]}" data-v="${days.map((d) => d[1]).join(',')}">${paths.map((d, i) => (d ? `<path class="l${i}" d="${d}"/>` : '')).join('')}</svg><span class="heat-tip mono" aria-hidden="true"></span></div>`;
}

function donut(parts, total, label) {
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map(([v, cls]) => { const len = (v / total) * C; const a = `<circle r="${R}" cx="64" cy="64" class="${cls}" stroke-dasharray="${(len - 3).toFixed(2)} ${(C - len + 3).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off += len; return a; }).join('');
  return `<svg class="donut" viewBox="0 0 128 128" role="img" aria-label="${esc(label)}"><circle r="${R}" cx="64" cy="64" class="track"/>${arcs}<text x="64" y="62" class="big">${total}</text><text x="64" y="80" class="small">solved</text></svg>`;
}

function signals() {
  const g = L.github, lc = L.leetcode, x = L.x;
  const bytes = {};
  repos.forEach((r) => Object.entries(r.languages || {}).forEach(([k, v]) => (bytes[k] = (bytes[k] || 0) + v)));
  const totalB = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]);
  const top = langs.slice(0, 6), other = langs.slice(6).reduce((a, b) => a + b[1], 0);
  if (other) top.push(['Other', other]);
  const st = (k) => L.status?.[k]?.state || 'unavailable';
  const pill = (k) => `<span class="src ${st(k)} mono" title="${esc(L.status?.[k]?.error || '')}">${STATE[st(k)]}</span>`;
  const lastPush = repos.slice().sort((a, b) => new Date(b.pushed) - new Date(a.pushed))[0];

  const ghTile = g ? `<article class="tile t-gh reveal">
      <header><h3>${icon('gh')}GitHub</h3>${pill('github')}</header>
      <div class="big-stats"><div><b>${g.contributions?.total ?? '—'}</b><span>contributions, last 12 mo</span></div><div><b>${g.user.publicRepos}</b><span>public repos</span></div><div><b>${g.user.followers}</b><span>followers</span></div></div>
      ${heatmap()}
      ${lastPush ? `<p class="mono tfoot">Latest push: <a href="${lastPush.url}" target="_blank" rel="noopener">${esc(lastPush.name)}</a> · <span data-ago="${lastPush.pushed}">${ago(lastPush.pushed)}</span></p>` : ''}
    </article>` : '';

  const lcTile = lc ? `<article class="tile t-lc reveal">
      <header><h3>${icon('lc')}LeetCode</h3>${pill('leetcode')}</header>
      <div class="lc-grid">
        ${donut([[lc.solved.Easy, 'e'], [lc.solved.Medium, 'm'], [lc.solved.Hard, 'h']], lc.solved.All, `${lc.solved.All} problems solved`)}
        <ul class="lc-legend mono"><li class="e"><i></i>Easy <b>${lc.solved.Easy}</b></li><li class="m"><i></i>Medium <b>${lc.solved.Medium}</b></li><li class="h"><i></i>Hard <b>${lc.solved.Hard}</b></li>${lc.contest ? `<li class="r">Contest <b>${lc.contest.rating}</b></li>` : ''}</ul>
      </div>
      <ul class="bars">${lc.tags.slice(0, 5).map(([t, v]) => `<li><span>${esc(t)}</span><i style="--w:${(v / lc.tags[0][1]).toFixed(3)}"></i><b class="mono">${v}</b></li>`).join('')}</ul>
      ${lc.recent?.length ? `<p class="mono tfoot">Recently solved: <a href="https://leetcode.com/problems/${esc(lc.recent[0].slug)}/" target="_blank" rel="noopener">${esc(lc.recent[0].title)}</a> · <span data-ago="${new Date(lc.recent[0].at).toISOString()}">${ago(new Date(lc.recent[0].at).toISOString())}</span></p>` : ''}
    </article>` : '';

  const langTile = `<article class="tile t-lang reveal">
      <header><h3>Code by language</h3><span class="src ok mono">${repos.length} repos</span></header>
      <div class="stackbar">${top.map(([k, v]) => `<i style="--w:${(v / totalB).toFixed(4)};--lc:${LANG[k] || 'var(--muted)'}" title="${esc(k)} ${((v / totalB) * 100).toFixed(1)}%"></i>`).join('')}</div>
      <ul class="lang-list mono">${top.map(([k, v]) => `<li><i style="--lc:${LANG[k] || 'var(--muted)'}"></i>${esc(k)}<b>${((v / totalB) * 100).toFixed(1)}%</b></li>`).join('')}</ul>
    </article>`;

  const xTile = `<article class="tile t-social reveal">
      <header><h3>Elsewhere</h3>${pill('x')}</header>
      ${x?.posts?.length ? `<ul class="posts">${x.posts.slice(0, 2).map((p) => `<li><a href="${p.url}" target="_blank" rel="noopener">${esc(p.text.slice(0, 180))}</a><span class="mono" data-ago="${new Date(p.at).toISOString()}">${ago(new Date(p.at).toISOString())}</span></li>`).join('')}</ul>` : ''}
      <ul class="social">
        <li><a href="${P.links.linkedin}" target="_blank" rel="noopener">${icon('in')}<span><b>LinkedIn</b><small>Experience, posts & featured résumé</small></span>${icon('arrow')}</a></li>
        <li><a href="${P.links.x}" target="_blank" rel="noopener">${icon('x')}<span><b>@${esc(P.handles.x)}</b><small>Notes on agents, RAG & evals</small></span>${icon('arrow')}</a></li>
        <li><a href="${P.links.github}" target="_blank" rel="noopener">${icon('gh')}<span><b>${esc(P.handles.github)}</b><small>${g ? `${g.user.publicRepos} repositories` : 'Code'}</small></span>${icon('arrow')}</a></li>
      </ul>
    </article>`;

  return `
<section id="activity" class="section" aria-labelledby="act-h">
  ${head('05', 'Live signals', '<span id="act-h">Updated every hour,<br><em>by a pipeline.</em></span>', `A scheduled CI job scrapes these sources, re-runs the analysis and redeploys the site. Data as of <time datetime="${L.generatedAt || ''}" data-ago="${L.generatedAt || ''}">${L.generatedAt ? fmtDate(L.generatedAt) : 'build time'}</time>.`)}
  <div class="tiles">${ghTile}${lcTile}${langTile}${xTile}</div>
</section>`;
}

// ---------- section: AI workflow + this site's pipeline ----------
function aiSection() {
  const st = (k) => L.status?.[k]?.state || 'unavailable';
  const srcs = [['github', 'GitHub REST + GraphQL'], ['leetcode', 'LeetCode GraphQL'], ['x', 'X embed'], ['linkedin', 'LinkedIn public'], ['resume', 'Résumé PDF']];
  return `
<section id="ai" class="section" aria-labelledby="ai-h">
  ${head('06', 'AI-native workflow', '<span id="ai-h">I don’t just build AI.<br><em>I build with it.</em></span>', 'The tools I use every day, and the automated pipeline that keeps this page honest.')}
  <div class="ai-grid">
    <ol class="tools reveal">${P.aiWorkflow.map((t, i) => `<li><span class="mono n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t.tool)}</h3><p>${esc(t.use)}</p></div></li>`).join('')}</ol>
    <figure class="flow reveal" aria-label="How this site updates itself">
      <figcaption class="mono">this-site.pipeline · cron <b>17 * * * *</b></figcaption>
      <div class="stage"><h4 class="mono">01 · sources</h4><ul>${srcs.map(([k, l]) => `<li class="${st(k)}"><i></i>${l}<span class="mono">${STATE[st(k)]}</span></li>`).join('')}</ul></div>
      <div class="stage"><h4 class="mono">02 · analyse</h4><ul><li><i></i>TF-IDF over ${repos.length} READMEs</li><li><i></i>PCA → 2-D latent map</li><li><i></i>k-means, k=${ML.map.clusters.length || '—'}</li><li><i></i>skill × project evidence</li><li><i></i>BM25 retrieval corpus</li></ul></div>
      <div class="stage"><h4 class="mono">03 · ship</h4><ul><li><i></i>Static build, zero runtime deps</li><li><i></i>Skip deploy if content hash unchanged</li><li><i></i>GitHub Pages CDN</li><li><i></i>Machine-readable: <a href="/llms.txt">llms.txt</a> · <a href="/profile.json">profile.json</a></li></ul></div>
    </figure>
  </div>
</section>`;
}

// ---------- section: Ask (in-browser RAG) ----------
function ask() {
  const qs = ['What has Sahaj built with RAG?', 'Experience with reinforcement learning?', 'Which AI tools does he use?', 'How do I hire him?', 'What did he do at HNNOIX?', 'LeetCode stats?'];
  return `
<section id="ask" class="section" aria-labelledby="ask-h">
  ${head('07', 'Ask my portfolio', '<span id="ask-h">A RAG system,<br><em>about me.</em></span>', 'Retrieval-augmented answers over everything on this page. Hybrid BM25 + MiniLM embeddings with reciprocal-rank fusion, all running in your browser. No server and no API key, and your question never leaves this tab.')}
  <div class="askbox reveal" data-ask>
    <div class="ask-bar mono"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>ask.sahaj — retrieval: <b class="ask-mode">BM25</b>
      <label class="sem"><input type="checkbox" class="sem-toggle"> semantic <small>(+MiniLM, 23 MB)</small></label></div>
    <div class="ask-log" aria-live="polite">
      <div class="msg bot"><p>Hi! I answer from Sahaj's projects, roles, repos and stats, and every answer cites its sources. Try one of these:</p></div>
    </div>
    <div class="ask-sugg">${qs.map((q) => `<button type="button">${esc(q)}</button>`).join('')}</div>
    <form class="ask-form" autocomplete="off"><label class="sr" for="ask-in">Ask a question about Sahaj</label><input id="ask-in" name="q" placeholder="Ask anything about my work…" maxlength="200" required><button class="btn btn-primary" type="submit" aria-label="Ask">${icon('send')}</button></form>
    <noscript><p class="mono">The assistant needs JavaScript. Everything it knows is also on this page.</p></noscript>
  </div>
</section>`;
}

// ---------- section: proof ----------
function proof() {
  return `
<section id="proof" class="section" aria-labelledby="proof-h">
  ${head('08', 'Credentials', '<span id="proof-h">Verified<br><em>checkpoints.</em></span>')}
  <div class="proof-grid">
    <article class="award reveal">${icon('trophy')}<p class="mono">${esc(P.achievement.issuer)}</p><h3>${esc(P.achievement.title)}</h3><p>${esc(P.achievement.detail)}</p></article>
    <ul class="certs reveal">${P.certifications.map((c) => `<li><span class="iss mono">${esc(c.issuer)}</span><b>${esc(c.name)}</b></li>`).join('')}</ul>
  </div>
</section>`;
}

// ---------- section: contact ----------
function contact() {
  return `
<section id="contact" class="section contact" aria-labelledby="contact-h">
  <p class="kicker mono reveal"><span>09</span>Contact</p>
  <h2 id="contact-h" class="mega reveal">Let’s build something<br><em>that thinks.</em></h2>
  <p class="sub reveal">${esc(P.status)}. Email or LinkedIn reach me fastest.</p>
  <div class="cta reveal">
    <a class="btn btn-primary btn-xl" href="${P.links.linkedin}" data-mail="${esc(P.mailUser)}" data-domain="${esc(P.mailDomain)}" data-subject="Hello Sahaj — via info.sahaj.si">${icon('mail')}Write to me</a>
    <a class="btn btn-xl" href="${P.links.linkedin}" target="_blank" rel="noopener">${icon('in')}LinkedIn</a>
    <a class="btn btn-xl btn-ghost" href="${P.links.resume}" target="_blank" rel="noopener">${icon('doc')}Résumé PDF</a>
  </div>
</section>`;
}

// ---------- page shell ----------
const css = (await readFile(path('src/styles.css'), 'utf8'))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}');
const appJs = await readFile(path('src/app.js'), 'utf8');
const askJs = await readFile(path('src/ask.js'), 'utf8');
// Version covers client code, styles and the generators, so any template change redeploys.
const V = hash(appJs + askJs + css + (await readFile(path('scripts/build.mjs'), 'utf8')) + (await readFile(path('scripts/ml.mjs'), 'utf8'))).slice(0, 8);

const jsonld = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  dateModified: L.generatedAt || NOW.toISOString(),
  mainEntity: {
    '@type': 'Person',
    name: P.name,
    url: SITE,
    image: `${SITE}/img/portrait-640.webp`,
    jobTitle: P.role,
    description: P.headline,
    alumniOf: { '@type': 'CollegeOrUniversity', name: P.education[0].school },
    address: { '@type': 'PostalAddress', addressLocality: 'Gandhinagar', addressRegion: 'Gujarat', addressCountry: 'IN' },
    knowsAbout: Object.values(P.skills).flat().slice(0, 24),
    knowsLanguage: ['gu', 'hi', 'en'],
    sameAs: [P.links.github, P.links.linkedin, P.links.leetcode, P.links.x],
  },
};

const NAV = [['#about', 'Model card'], ['#experience', 'Run'], ['#work', 'Work'], ['#skills', 'Skills'], ['#activity', 'Live'], ['#ask', 'Ask']];
const title = `${P.name} — ${P.role} · Agentic AI, RAG & LLM systems`;
const desc = `${P.name} is an AI/ML engineer building agentic RAG, LLM infrastructure and explainable ML. Projects, live GitHub & LeetCode stats, and an in-browser RAG assistant.`;

function page(body, { t = title, d = desc, canonical = SITE + '/' } = {}) {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t)}</title>
<meta name="description" content="${esc(d)}">
<link rel="canonical" href="${canonical}">
<meta name="author" content="${esc(P.name)}">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#08080b">
<meta property="og:type" content="profile"><meta property="og:site_name" content="${esc(P.name)}">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:url" content="${canonical}"><meta property="og:image" content="${SITE}/img/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${esc(P.name)} — ${esc(P.role)}">
<meta property="profile:first_name" content="${esc(P.first)}"><meta property="profile:last_name" content="${esc(P.last)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@${P.handles.x}"><meta name="twitter:creator" content="@${P.handles.x}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.png" sizes="any"><link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM-readable profile">
<link rel="preload" href="/fonts/instrument-serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-serif-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<style>${css}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>
<body>
${SPRITE}
<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"><i></i></div>
<header class="nav" id="nav">
  <a class="brand" href="/#top" aria-label="${esc(P.name)} — home"><img src="/favicon.svg" width="26" height="26" alt=""><span>${esc(P.name)}</span></a>
  <nav aria-label="Sections"><ul>${NAV.map(([h, l]) => `<li><a href="/${h}">${l}</a></li>`).join('')}</ul></nav>
  <div class="nav-actions">
    <button class="icon-btn kbar-open" type="button"><span class="sr">Open command palette</span><span class="mono kbd">⌘K</span></button>
    <button class="icon-btn theme" type="button" aria-label="Toggle colour theme">${icon('sun')}${icon('moon')}</button>
    <a class="btn btn-sm" href="${P.links.resume}" target="_blank" rel="noopener">Résumé</a>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="foot-row">
    <p>© ${NOW.getUTCFullYear()} ${esc(P.name)} · Designed and engineered with Claude Code.</p>
    <p class="mono">build ${V} · data <time data-ago="${L.generatedAt || ''}">${L.generatedAt ? fmtDate(L.generatedAt) : '—'}</time> · <a href="/llms.txt">llms.txt</a> · <a href="${P.links.github}/sahajivvix-1.github.io" target="_blank" rel="noopener">source</a></p>
  </div>
  <ul class="foot-links">${[['gh', P.links.github, 'GitHub'], ['in', P.links.linkedin, 'LinkedIn'], ['lc', P.links.leetcode, 'LeetCode'], ['x', P.links.x, 'X']].map(([i, h, l]) => `<li><a href="${h}" target="_blank" rel="noopener" aria-label="${l}">${icon(i)}</a></li>`).join('')}</ul>
</footer>
<div class="kbar" role="dialog" aria-modal="true" aria-label="Command palette" hidden>
  <div class="kbar-box"><input class="kbar-in" type="text" placeholder="Jump to, open, or ask…" aria-label="Command" role="combobox" aria-expanded="true" aria-controls="kbar-list" aria-autocomplete="list"><ul id="kbar-list" class="kbar-list" role="listbox"></ul><p class="kbar-hint mono"><span>↑↓ navigate</span><span>↵ select</span><span>esc close</span></p></div>
</div>
<script type="module" src="/js/app.js?v=${V}"></script>
</body>
</html>`;
}

// ---------- write everything ----------
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT + 'js', { recursive: true });
await cp(path('public'), OUT, { recursive: true });
if (existsSync(path('data/resume.pdf'))) await cp(path('data/resume.pdf'), OUT + 'resume/Sahaj_Saliya_Resume.pdf');

await writeFile(OUT + 'index.html', page([hero(), modelCard(), experience(), work(), skills(), signals(), aiSection(), ask(), proof(), contact()].join('\n')));
// Conservative minify: drop full-line comments and indentation only (never touches code).
const minJs = (s) => s.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//')).join('\n');
await writeFile(OUT + 'js/app.js', minJs(appJs));
await writeFile(OUT + 'js/ask.js', minJs(askJs));
await writeJSON(OUT + 'data/live.json', L);
await writeJSON(OUT + 'data/corpus.json', corpus(P, L));

const pub = { name: P.name, role: P.role, headline: P.headline, location: P.location, status: P.status, links: P.links, experience: P.experience, education: P.education, projects: P.featured, skills: P.skills, certifications: P.certifications, metrics: P.metrics, github: L.github ? { ...L.github.user, repos: repos.map(({ readme, languages, ...r }) => r) } : null, leetcode: L.leetcode, updated: L.generatedAt };
await writeJSON(OUT + 'profile.json', pub);

await writeFile(OUT + 'llms.txt', `# ${P.name}

> ${P.role}. ${P.headline}

${P.summary}

Status: ${P.status}
Location: ${P.location}
Contact: use the "Write to me" button at ${SITE}/#contact or LinkedIn ${P.links.linkedin}

## Experience
${P.experience.map((e) => `- ${e.role}, ${e.org} (${fmtYM(e.start)}–${fmtYM(e.end)}): ${e.points.join(' ')}`).join('\n')}

## Featured projects
${P.featured.map((f) => `- [${f.title}](${repoBy.get(f.repo.toLowerCase())?.url || P.links.github}): ${f.summary} Results: ${f.metrics.map((m) => m.join(' ')).join(', ')}.`).join('\n')}

## Skills
${Object.entries(P.skills).map(([k, v]) => `- ${k}: ${v.join(', ')}`).join('\n')}

## Certifications
${P.certifications.map((c) => `- ${c.name} — ${c.issuer}`).join('\n')}
- ${P.achievement.title}: ${P.achievement.detail}

## Links
- Résumé: ${SITE}${P.links.resume}
- Structured profile: ${SITE}/profile.json
- GitHub: ${P.links.github}
- LinkedIn: ${P.links.linkedin}
- LeetCode: ${P.links.leetcode}
- X: ${P.links.x}
`);

await writeFile(OUT + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile(OUT + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc><lastmod>${(L.generatedAt || NOW.toISOString()).slice(0, 10)}</lastmod><priority>1.0</priority></url><url><loc>${SITE}/resume/Sahaj_Saliya_Resume.pdf</loc></url></urlset>\n`);
await writeJSON(OUT + 'manifest.webmanifest', { name: P.name, short_name: 'Sahaj', start_url: '/', display: 'standalone', background_color: '#08080b', theme_color: '#08080b', icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: '/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] });
await writeFile(OUT + 'CNAME', 'info.sahaj.si\n');
await writeFile(OUT + '.nojekyll', '');

const redirect = (to) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Redirecting…</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${to}"><link rel="canonical" href="${to}"><script>location.replace(${JSON.stringify(to)})</script></head><body style="background:#08080b;color:#f4f2ee;font:16px system-ui;padding:24px">Redirecting to <a style="color:#ff7a3d" href="${to}">${to}</a></body></html>`;
for (const [dir, to] of [['Github', P.links.github], ['LinkedIn', P.links.linkedin], ['LeetCode', P.links.leetcode], ['X', P.links.x], ['Portfolio', '/'], ['resume', P.links.resume]]) {
  await mkdir(OUT + dir, { recursive: true });
  await writeFile(OUT + dir + '/index.html', redirect(to));
}

await writeFile(OUT + '404.html', page(`
<section class="section nf">
  <p class="kicker mono"><span>404</span>Out of distribution</p>
  <h1 class="mega">This page is<br><em>out of distribution.</em></h1>
  <p class="sub">Model confidence for this URL: 0.00. The page you wanted probably lives on the home page.</p>
  <div class="cta"><a class="btn btn-primary" href="/">Back to the home page</a><a class="btn" href="/#ask" data-open-ask>Ask the assistant</a></div>
</section>`, { t: `Not found · ${P.name}`, canonical: SITE + '/404.html' }));

// Content hash (excludes volatile timestamps) lets CI skip redeploying unchanged builds.
const stable = JSON.stringify({ P, g: L.github, lc: L.leetcode && { ...L.leetcode, recent: L.leetcode.recent?.map((r) => r.slug) }, x: L.x, li: L.linkedin, r: L.resume, V });
const contentHash = hash(stable) + hash(stable.split('').reverse().join(''));
await writeJSON(OUT + 'build.json', { contentHash, version: V, generatedAt: L.generatedAt });

const size = (await stat(OUT + 'index.html')).size;
console.log(`built dist/ — index.html ${(size / 1024).toFixed(1)} KB · content ${contentHash}`);
