// Renders the static site (index, 404, blogs, sitemap) from content/ and data/.
// Usage: node scripts/build.mjs [--embed]   (--embed also recomputes the ML data first)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { build as buildLogo, strokePath } from './logo-geometry.mjs';
import { readJSON, readText, write, esc, fmtMonth, fmtRange, parseFrontMatter, slug, path } from './lib.mjs';

if (process.argv.includes('--embed')) {
  const { embedAll } = await import('./embed.mjs');
  await embedAll();
}

const SITE = 'https://info.sahaj.si';

// Boot screen and visitor tag are inlined (see scripts/boot/): they must run before anything else loads.
// Minifier is deliberately simple: the sources use explicit semicolons and no '//' inside strings.
const minify = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').trim();
const BOOT_CSS = minify(readText('scripts/boot/boot.css'));
const BOOT_HEAD = minify(readText('scripts/boot/head.js'));
const BOOT_JS = minify(readText('scripts/boot/boot.js'));
// The minifier is deliberately simple (it only strips whole-line // comments). Refuse to build if it ever breaks a script.
for (const [name, code] of [['head.js', BOOT_HEAD], ['boot.js', BOOT_JS]]) {
  try { new Function(code); } catch (e) { throw new Error(`scripts/boot/${name} is not valid JavaScript after minifying (${e.message}). Put comments on their own line.`); }
}
const bootHtml = () => `<div id="boot-live" class="bs" role="status" aria-live="polite"></div><div id="boot" aria-hidden="true"><div class="boot-box"><p class="boot-cap" id="boot-cap"><span>forward pass · layer 1/5 · 0%</span><span>τ 0.7 · weights seeded per visitor</span></p><p class="boot-feat" id="boot-feat"></p><div class="boot-stage"><canvas id="boot-cv"></canvas></div><p class="boot-greet" id="boot-greet"></p><div class="boot-bottom"><ul id="boot-log"></ul><div class="boot-mat"><canvas id="boot-mat"></canvas><p>attention · head 3</p></div></div><p class="boot-hint"><span>heuristic guess · computed in your browser; only your public IP is looked up</span><span>click or press any key to skip</span></p></div></div><script>${BOOT_JS.replace('__V__', ASSET_VERSION)}</script>`;
const profile = readJSON('content/profile.json');
// the live header logo: the S as one stroke (so it can be styled), two end nodes, and the cursor dot
const LOGO_MARK = (() => {
  const m = buildLogo('full');
  const k = 17 / 244; // disc radius in the 40 px header box
  const n = (v) => Math.round(v * 10) / 10;
  return `<g transform="translate(20 20) scale(${k.toFixed(5)}) translate(-256 -256)"><circle class="disc" cx="256" cy="256" r="244"/><path class="s-stroke" d="${strokePath(m)}" stroke-width="${n(m.width)}"/>${m.nodes.map(([x, y, r]) => `<circle class="s-node" cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`).join('')}<circle class="cursor" cx="${n(m.dot[0])}" cy="${n(m.dot[1])}" r="${n(m.dot[2])}"/></g>`;
})();
const projects = readJSON('content/projects.json');
const mapData = readJSON('data/map.json', null);
const github = readJSON('data/github.json', { repos: [], languages: {}, events: [], user: {} });
const heatmaps = readJSON('data/heatmaps.json', {});
const posts = loadPosts();
const BLOG_LIVE = posts.length > 0;
const BUILD_VERSION = (github.fetched_at || new Date().toISOString()).slice(0, 16);
// Cache-busting token for CSS/JS URLs: a hash of the files themselves, so a changed asset is never served stale.
const ASSET_VERSION = (() => {
  const h = createHash('sha1');
  const walk = (dir) => readdirSync(path(dir), { withFileTypes: true }).forEach((e) => {
    if (e.isDirectory()) walk(`${dir}/${e.name}`); else if (/\.(css|js)$/.test(e.name)) h.update(readFileSync(path(`${dir}/${e.name}`)));
  });
  walk('assets/css'); walk('assets/js');
  return h.digest('hex').slice(0, 8);
})();

// ---------- shared shell ----------

const THEME_BOOT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}document.documentElement.classList.add('js')})()`;

function head({ title, description, url, image = '/assets/img/og.png', type = 'website', extra = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${url}">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F6F2EA">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0B1020">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Sahaj Saliya">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@SahajS59">
<link rel="icon" type="image/svg+xml" href="/assets/brand/logo-small.svg?v=3">
<link rel="icon" href="/favicon.ico?v=3" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/icon-32.png?v=3">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/brand/icon-192.png?v=3">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png?v=3">
<link rel="manifest" href="/site.webmanifest?v=3">
<link rel="preload" href="/assets/fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/anthropic-serif/anthropic-serif-text-500-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>${THEME_BOOT}</script>
<style>${BOOT_CSS}</style>
<script>${BOOT_HEAD}</script>
<link rel="stylesheet" href="/assets/css/main.css?v=${ASSET_VERSION}">
${extra}
</head>`;
}

function header({ home = false } = {}) {
  const base = home ? '' : '/';
  const nav = [
    ['Work', `${base}#work`],
    ['Map', `${base}#map`],
    ['Training', `${base}#experience`],
    ['Contact', `${base}#contact`],
    ['Blog', '/blogs/'],
  ];
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-head" data-head>
  <a class="brand" href="/" aria-label="Sahaj Saliya, home" title="Sahaj Saliya, home" data-brand>
    <svg class="brand-logo" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
      <circle class="ring-track" cx="20" cy="20" r="19.25"/>
      <g transform="rotate(-90 20 20)"><circle class="ring-prog" cx="20" cy="20" r="19.25" pathLength="100"/></g>
      <g class="ticks"><line x1="20.00" y1="-1.00" x2="20.00" y2="-3.20"/><line x1="30.50" y1="1.81" x2="31.00" y2="0.95"/><line x1="38.19" y1="9.50" x2="39.57" y2="8.70"/><line x1="41.00" y1="20.00" x2="41.80" y2="20.00"/><line x1="38.19" y1="30.50" x2="39.92" y2="31.50"/><line x1="30.50" y1="38.19" x2="31.10" y2="39.23"/><line x1="20.00" y1="41.00" x2="20.00" y2="41.90"/><line x1="9.50" y1="38.19" x2="8.60" y2="39.75"/><line x1="1.81" y1="30.50" x2="0.86" y2="31.05"/><line x1="-1.00" y1="20.00" x2="-3.20" y2="20.00"/><line x1="1.81" y1="9.50" x2="1.12" y2="9.10"/><line x1="9.50" y1="1.81" x2="8.75" y2="0.51"/></g>
      ${LOGO_MARK}
    </svg>
    <span class="brand-text" aria-hidden="true"><span class="bt-cur">info@sahaj.si</span><span class="bt-size">info@sahaj.si</span><span class="bt-size">Sahaj Saliya</span></span>
  </a>
  <nav class="site-nav" aria-label="Primary">
    ${nav.map(([l, h]) => `<a class="tok-link" href="${h}">${l}</a>`).join('\n    ')}
  </nav>
  <div class="head-tools">
    <button class="kbd-btn" type="button" data-palette-open>
      <span class="mono">Search or ask</span><kbd>Ctrl K</kbd>
    </button>
    <button class="temp" type="button" data-theme-toggle aria-label="temp auto, theme follow system. Click to change.">
      <span class="temp-label mono">temp</span>
      <span class="temp-track" aria-hidden="true"><span class="temp-knob"></span></span>
      <span class="temp-val mono" data-theme-val>auto</span>
    </button>
  </div>
</header>`;
}

function footer() {
  const synced = github.fetched_at ? new Date(github.fetched_at) : null;
  const utc = synced ? `${synced.toISOString().slice(0, 16).replace('T', ' ')} UTC` : '';
  const privacy = 'Your IP is looked up from api.ipify.org when the page opens, shown only to you, and never stored.';
  const ext = (l) => `<a class="foot-link" href="${l.url}" target="_blank" rel="me noopener" aria-label="${esc(l.label)} (opens in a new tab)">${esc(l.label)}</a>`;
  return `<footer class="site-foot" data-foot>
  <p class="foot-copy-line">© ${new Date().getFullYear()} Sahaj Saliya</p>
  <nav class="foot-links" aria-label="Elsewhere">${profile.links.map(ext).join('')}<a class="foot-link" href="mailto:${profile.email}" aria-label="Email Sahaj Saliya">Email</a></nav>
  <p class="foot-card mono">${synced ? `last forward pass <time datetime="${synced.toISOString()}" title="${utc}" data-foot-time>${utc}</time> <span data-foot-ago></span>` : ''}<span data-session hidden> · ip <b></b> <button class="foot-i" type="button" aria-label="About the IP lookup" aria-describedby="ip-tip">i</button><span class="foot-tip" id="ip-tip" role="tooltip">${privacy}</span></span></p>
  <button class="foot-top" type="button" data-to-top>↑ top</button>
</footer>`;
}

function shellScripts() {
  return `<button class="ask-fab shimmer" type="button" data-ask-open aria-label="Ask my portfolio (chatbot)"><span class="fab-dot" aria-hidden="true"></span><span>Ask</span></button>
<div id="ask-root"></div>
<script type="module" src="/assets/js/main.js?v=${ASSET_VERSION}"></script>`;
}

// ---------- home sections ----------

// Rival tokens shown while the hero is "sampled". The first candidate is the one chosen.
const HERO = {
  name: [
    ['Sah', 0.91, 'Sam', 0.04, 'Sar', 0.03, 'Sun', 0.02],
    ['aj', 0.88, 'il', 0.06, 'ar', 0.04, 'ib', 0.02],
    [' Sal', 0.86, ' Sha', 0.07, ' Sel', 0.04, ' Sax', 0.03],
    ['iya', 0.93, 'ary', 0.03, 'man', 0.02, 'ish', 0.02],
  ],
  title: [
    ['I', 0.71, 'We', 0.14, 'This', 0.09, 'My', 0.06],
    [' build', 0.58, ' train', 0.22, ' ship', 0.12, ' design', 0.08],
    [' AI', 0.83, ' models', 0.09, ' systems', 0.05, ' agents', 0.03],
    [' that', 0.92, ' which', 0.05, ' to', 0.02, ' you', 0.01],
    [' reads', 0.47, ' writes', 0.21, ' learns', 0.19, ' thinks', 0.13],
    [',', 0.95, ' and', 0.03, ';', 0.01, '.', 0.01],
    [' sees', 0.64, ' hears', 0.15, ' knows', 0.13, ' feels', 0.08],
    [' and', 0.97, ' &', 0.02, ' or', 0.005, ',', 0.005],
    [' acts', 0.52, ' reasons', 0.24, ' decides', 0.16, ' plans', 0.08],
    ['.', 0.96, '!', 0.02, ' well', 0.01, '…', 0.01],
  ],
};

function heroSection() {
  const enc = (rows) => esc(JSON.stringify(rows));
  return `<section class="layer hero" id="top" data-layer="1" data-layer-name="Tokenizer" aria-label="Introduction">
  <div class="hero-grid">
    <p class="eyebrow mono"><span class="dot" aria-hidden="true"></span> sampling · temperature 0.7 · top-k 4</p>
    <h1 class="hero-name">
      <span class="gen" data-gen="${enc(HERO.name)}" data-gen-delay="300">Sahaj Saliya</span>
    </h1>
    <p class="hero-title">
      <span class="gen" data-gen="${enc(HERO.title)}" data-gen-delay="120">${esc(profile.title)}</span>
    </p>
    <div class="think" data-think>
      <div class="think-line" aria-hidden="true"><span class="think-label mono">now ▸</span><span class="think-word"></span><span class="think-caret"></span></div>
      <div class="think-next mono" aria-hidden="true"></div>
      <p class="think-sr" role="status" aria-live="polite"></p>
    </div>
    <p class="hero-trace mono" aria-hidden="true" data-trace>&nbsp;</p>
    <div class="hero-foot">
      <p class="hero-lede">${esc(profile.tagline)}</p>
      <div class="hero-actions">
        <a class="cta2 shimmer" data-persona-cta hidden></a>
      </div>
    </div>
    <p class="persona-line mono" data-persona-line hidden>
      <span>view tuned for <b data-persona-name></b></span>
      <span aria-hidden="true">·</span>
      <button type="button" class="tok-link persona-switch" data-persona-switch aria-expanded="false" aria-controls="persona-menu">not you? switch</button>
      <span id="persona-menu" class="persona-menu" data-persona-menu hidden role="group" aria-label="Choose a view">
        <button type="button" data-persona="recruiter" aria-pressed="false">recruiter</button>
        <button type="button" data-persona="developer" aria-pressed="false">developer</button>
        <button type="button" data-persona="researcher" aria-pressed="false">researcher</button>
        <button type="button" data-persona="curious" aria-pressed="false">curious</button>
      </span>
    </p>
    <ul class="focus-chips mono" aria-label="Focus areas">
      ${profile.focus.map((f, i) => `<li><span class="tid">${String(1000 + i * 137).padStart(5, '0')}</span>${esc(f)}</li>`).join('')}
    </ul>
  </div>
  <a class="scroll-cue mono" href="#about" aria-label="forward pass, scroll to layer 2"><span>forward pass</span><span class="cue-line" aria-hidden="true"></span></a>
</section>`;
}

function aboutSection() {
  const e = profile.education;
  return `<section class="layer about" id="about" data-layer="2" data-layer-name="Embedding" aria-labelledby="about-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Embedding">Layer 02 · Embedding</p>
    <h2 id="about-h" class="layer-title">A dense vector of <em>one person</em>.</h2>
  </header>
  <div class="about-grid">
    <figure class="portrait">
      <div class="portrait-frame" data-cnn>
        <picture>
          <source type="image/avif" srcset="/assets/img/profile-260.avif 260w, /assets/img/profile-340.avif 340w, /assets/img/profile-520.avif 520w" sizes="(min-width: 1200px) 340px, (min-width: 900px) 300px, (min-width: 640px) 280px, 260px">
          <img src="/assets/img/profile-520.webp" srcset="/assets/img/profile-260.webp 260w, /assets/img/profile-340.webp 340w, /assets/img/profile-520.webp 520w" sizes="(min-width: 1200px) 340px, (min-width: 900px) 300px, (min-width: 640px) 280px, 260px" width="520" height="650" alt="Portrait of Sahaj Saliya by a lake, wearing glasses and a white polo shirt" loading="lazy" decoding="async">
        </picture>
        <canvas class="cnn-cv" aria-hidden="true" data-cnn-cv></canvas>
      </div>
      <figcaption class="mono" data-cnn-cap>x ∈ ℝ³⁸⁴ · ‖x‖ = 1</figcaption>
    </figure>
    <div class="about-text" data-attend>
      ${profile.about.map((p, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(p).replace(/\*([^*]+)\*/g, '<em>$1</em>')}</p>`).join('\n      ')}
    </div>
    <dl class="facts mono">
      <div><dt>school</dt><dd>${esc(e.school)}</dd></div>
      <div><dt>degree</dt><dd>${esc(e.degree)}</dd></div>
      <div><dt>span</dt><dd>${fmtRange(e.start, e.end)}</dd></div>
      <div><dt>cgpa</dt><dd>${esc(e.cgpa)}</dd></div>
      <div><dt>based</dt><dd>${esc(profile.location)}</dd></div>
    </dl>
  </div>
</section>`;
}

function mapSection() {
  const clusters = mapData?.clusters || [];
  const chips = ['computer vision', 'agents & RAG', 'healthcare ML', 'reinforcement learning'];
  return `<section class="layer map" id="map" data-layer="3" data-layer-name="Latent space" aria-labelledby="map-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Latent space">Layer 03 · Latent space</p>
    <h2 id="map-h" class="layer-title">Watch it <em>learn</em>, then ask it.</h2>
    <p class="layer-sub">Every point is a real passage of my work: resume lines, README text, skills. Scroll and watch an embedding being trained from noise (a real t-SNE run, with its real loss). Then ask it a question: your words are embedded in your browser and land where they belong.</p>
  </header>
  <div class="map-pin" data-map-pin>
    <div class="map-sticky" data-map>
      <form class="map-ask" role="search" aria-label="Ask the map">
        <label class="sr" for="map-q">Ask the map</label>
        <input id="map-q" class="map-q" type="search" placeholder="Ask the map… e.g. computer vision, agents, healthcare" autocomplete="off" maxlength="120">
        <button class="map-go shimmer" type="submit">Search</button>
        <span class="map-status mono" data-map-status role="status"></span>
        <div class="map-chips">${chips.map((c) => `<button type="button" class="map-chip mono" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      </form>
      <div class="map-grid">
        <div class="map-main">
          <div class="map-stage" data-latent-map>
            <canvas class="map-canvas" aria-hidden="true"></canvas>
            <div class="map-labels" aria-hidden="true"></div>
            <div class="map-hud mono" aria-hidden="true"></div>
            <div class="map-zoom" role="group" aria-label="Map zoom"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="reset" aria-label="Reset view">⟲</button></div>
            <div class="map-nodes"></div>
            <div class="map-tip" aria-hidden="true" hidden></div>
            <div class="map-card" hidden></div>
            <noscript><p class="map-error mono">The interactive map needs JavaScript. The clusters and projects are listed below.</p></noscript>
          </div>
          <ul class="map-legend mono" aria-label="Clusters"></ul>
        </div>
        <aside class="map-results" aria-label="Search results">
          <h3 class="mr-head mono" data-map-mode>Top matches</h3>
          <ol class="mr-list" data-map-results aria-live="polite"></ol>
          <p class="mr-note mono">Ctrl/⌘ + scroll or pinch to zoom · drag to pan · double-click to reset · Esc clears</p>
        </aside>
      </div>
    </div>
  </div>
  <ul class="sr" aria-label="Map clusters and projects">
    ${clusters.map((c) => `<li>Cluster “${esc(c.name)}”: ${c.n} passages about ${esc(c.keywords.slice(0, 5).join(', '))}.</li>`).join('')}
    ${projects.map((p) => `<li>Project <a href="#p-${p.id}">${esc(p.name)}</a>: ${esc(p.kind)}.</li>`).join('')}
  </ul>
</section>`;
}

function heatmapSVG(id) {
  const h = heatmaps[id];
  if (!h) return `<div class="heat heat-empty" aria-hidden="true"></div>`;
  const n = h.tokens.length;
  const cell = 10, pad = 0;
  let rects = '';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const w = h.matrix[i][j];
    if (w < 0.02) continue;
    rects += `<rect x="${j * cell + pad}" y="${i * cell + pad}" width="${cell - 1}" height="${cell - 1}" fill-opacity="${Math.min(1, w * 1.6).toFixed(2)}"/>`;
  }
  const size = n * cell;
  return `<figure class="heat">
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Self-attention heatmap over ${n} key tokens from the ${esc(id)} README"><g class="heat-cells">${rects}</g></svg>
    <figcaption class="mono"><span>attn(README)</span> ${h.tokens.slice(0, 8).map(esc).join(' · ')}</figcaption>
  </figure>`;
}

function projectCard(p, i) {
  const repo = `https://github.com/SahajIVVIX-1/${p.repo}`;
  const gh = github.repos.find((r) => r.name === p.repo);
  return `<article class="card layer" id="p-${p.id}" data-default-index="${i}" data-layer="${4 + i}" data-layer-name="Head ${i + 1} · ${esc(p.name)}" aria-labelledby="p-${p.id}-h">
  <header class="card-head">
    ${heatmapSVG(p.id)}
    <div class="card-id">
      <p class="mono card-kicker">Model card · <span data-ci>${String(i + 1).padStart(2, '0')}</span> / ${String(projects.length).padStart(2, '0')} · ${esc(p.kind)}</p>
      <h3 id="p-${p.id}-h" class="card-title">${esc(p.name)}</h3>
      <p class="mono card-task">${esc(p.task)}</p>
      <div class="card-metric"><span class="metric-val">${esc(p.metric.value)}</span><span class="metric-label mono">${esc(p.metric.label)}</span></div>
    </div>
  </header>
  <dl class="card-body" data-attend>
    <div class="cb-row"><dt class="mono">Problem</dt><dd>${esc(p.problem)}</dd></div>
    <div class="cb-row"><dt class="mono">Approach</dt><dd>${esc(p.approach)}</dd></div>
    <div class="cb-row"><dt class="mono">Evaluation</dt><dd><table class="evals"><tbody>${p.metrics.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="mono">${esc(v)}</td></tr>`).join('')}</tbody></table></dd></div>
    <div class="cb-row"><dt class="mono">Stack</dt><dd><ul class="stack mono">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></dd></div>
    ${p.limits ? `<div class="cb-row"><dt class="mono">Limits</dt><dd class="muted">${esc(p.limits)}</dd></div>` : ''}
    <div class="cb-row"><dt class="mono">Authors</dt><dd class="muted">${esc(p.team)}</dd></div>
  </dl>
  <footer class="card-foot mono">
    <a class="tok-link card-repo" href="${repo}" rel="noopener">Code &amp; README on GitHub <span aria-hidden="true">↗</span></a>
    ${gh ? `<span class="card-gh">${gh.language ? esc(gh.language) + ' · ' : ''}★ ${gh.stars} · updated ${gh.pushed_at.slice(0, 10)}</span>` : ''}
  </footer>
</article>`;
}

function workSection() {
  return `<section class="work" id="work" aria-labelledby="work-h">
  <header class="layer-head work-head">
    <p class="layer-tag mono" data-lt-range="Attention heads">Layers 04–08 · Attention heads</p>
    <h2 id="work-h" class="layer-title">Five heads, <em>five things</em> they learned.</h2>
    <p class="layer-sub">Every project is documented like a model card: problem, approach, evaluation and limits. The header heatmap is real self-attention over that project's README, computed when the site builds.</p>
  </header>
  ${projects.map(projectCard).join('\n')}
</section>`;
}

function skillsSection() {
  let n = 0;
  return `<section class="layer skills" id="skills" data-layer="9" data-layer-name="Parameters" aria-labelledby="skills-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Parameters">Layer 09 · Parameters</p>
    <h2 id="skills-h" class="layer-title">The weights I <em>reach for</em>.</h2>
  </header>
  <div class="skill-groups" data-attend>
    ${profile.skills.map((g) => `<div class="skill-group">
      <h3 class="mono sg-name">${esc(g.group)}</h3>
      <ul class="sg-items">${g.items.map((s) => `<li><span class="w mono" aria-hidden="true">w${String(n++).padStart(2, '0')}</span>${esc(s)}</li>`).join('')}</ul>
    </div>`).join('\n    ')}
  </div>
</section>`;
}

// Milestones placed on the training curve. Dates are real; the loss values are illustrative.
function milestones() {
  const repoDate = (name) => (github.repos.find((r) => r.name === name)?.created_at || '').slice(0, 7);
  const list = [
    { d: profile.education.start, t: 'B.Tech ICT begins at PDEU', k: 'epoch', href: '#about' },
    { d: '2023-08', t: 'AI/ML Sub-Committee, Encode PDEU', k: 'community' },
    { d: '2024-08', t: 'AI/ML Core Committee, Encode PDEU', k: 'community' },
    { d: '2024-12', t: 'Freelance financial AI engineer: −37% false-positive signals', k: 'work' },
    { d: '2025-08', t: 'Lead Convener, IEEE AIMV 2025', k: 'community' },
    ...projects.map((p) => ({ d: repoDate(p.repo) || `${p.year}-01`, t: `Shipped ${p.name}`, k: 'project', href: `#p-${p.id}` })),
    { d: '2026-05', t: 'Research & Innovation Intern, HNNOIX India', k: 'work' },
    { d: profile.education.end, t: 'Graduation (scheduled)', k: 'future' },
  ];
  return list.sort((a, b) => a.d.localeCompare(b.d));
}

function lossCurve() {
  const W = 1000, H = 340, L = 56, R = 24, T = 24, B = 44;
  const t0 = monthIndex(profile.education.start), t1 = monthIndex(profile.education.end);
  const now = monthIndex(new Date().toISOString().slice(0, 7));
  const x = (m) => L + ((m - t0) / (t1 - t0)) * (W - L - R);
  const lossAt = (m) => 0.18 + 2.1 * Math.exp(-(m - t0) / 11);
  const y = (v) => T + (1 - (v - 0.1) / 2.3) * (H - T - B);
  // Deterministic noise so the curve looks like a real logged run but never changes between builds.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const raw = [], smooth = [];
  let ema = lossAt(t0);
  for (let s = 0; s <= (t1 - t0) * 6; s++) {
    const m = t0 + s / 6;
    const v = lossAt(m) * (1 + (rnd() - 0.5) * 0.28);
    ema = 0.85 * ema + 0.15 * v;
    raw.push([x(m), y(v), m]);
    smooth.push([x(m), y(ema), m]);
  }
  const pts = (arr) => arr.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const past = (arr) => arr.filter((p) => p[2] <= now);
  const future = (arr) => arr.filter((p) => p[2] >= now - 0.2);
  const ms = milestones();
  const marks = ms.map((m, i) => {
    const mi = monthIndex(m.d);
    const near = smooth.reduce((best, p) => (Math.abs(p[2] - mi) < Math.abs(best[2] - mi) ? p : best), smooth[0]);
    return `<g class="ckpt ckpt-${m.k}" data-i="${i}" tabindex="0" role="listitem" aria-label="${esc(fmtMonth(m.d))}: ${esc(m.t)}"><line x1="${near[0].toFixed(1)}" x2="${near[0].toFixed(1)}" y1="${near[1].toFixed(1)}" y2="${H - B}"/><circle cx="${near[0].toFixed(1)}" cy="${near[1].toFixed(1)}" r="5"/><text x="${near[0].toFixed(1)}" y="${(near[1] - 12).toFixed(1)}">${i + 1}</text></g>`;
  }).join('');
  const years = [];
  for (let yr = 2024; yr <= 2027; yr++) years.push(`<g class="tick"><line x1="${x(monthIndex(`${yr}-01`))}" x2="${x(monthIndex(`${yr}-01`))}" y1="${T}" y2="${H - B}"/><text x="${x(monthIndex(`${yr}-01`))}" y="${H - B + 22}">${yr}</text></g>`);
  return { ms, svg: `<svg class="loss-svg" viewBox="0 0 ${W} ${H}" role="group" aria-label="Training loss curve from June 2023 to May 2027 with ${ms.length} checkpoints">
    <g class="ticks">${years.join('')}<text class="axis-y" x="${L - 12}" y="${T + 8}" text-anchor="end">loss</text><text class="axis-y" x="${L - 12}" y="${H - B}" text-anchor="end">0.1</text></g>
    <polyline class="loss-raw" points="${pts(past(raw))}"/>
    <polyline class="loss-smooth" pathLength="1" points="${pts(past(smooth))}"/>
    <polyline class="loss-future" points="${pts(future(smooth))}"/>
    <line class="now-line" x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${H - B}"/><text class="now-label" x="${x(now) + 6}" y="${T + 10}">now · step ${now - t0}</text>
    <g class="ckpts" role="list">${marks}</g>
  </svg>` };
}

function monthIndex(ym) { const [y, m] = ym.split('-').map(Number); return y * 12 + (m - 1); }

function experienceSection() {
  const { ms, svg } = lossCurve();
  return `<section class="layer training" id="experience" data-layer="10" data-layer-name="Training run" aria-labelledby="exp-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Training run">Layer 10 · Training run</p>
    <h2 id="exp-h" class="layer-title">Loss goes down. <em>Checkpoints</em> stay.</h2>
    <p class="layer-sub">My time at PDEU drawn as a training run. The checkpoint dates are real. The curve itself is illustrative, with a smoothed line over noisy raw loss as in TensorBoard.</p>
  </header>
  <div class="loss-wrap" data-loss>${svg}<div class="loss-tip mono" aria-hidden="true"></div></div>
  <ol class="ckpt-list mono">${ms.map((m, i) => `<li data-i="${i}" class="ck-${m.k}"><span class="ck-n">${String(i + 1).padStart(2, '0')}</span><span class="ck-d">${fmtMonth(m.d)}</span><span class="ck-t">${m.href ? `<a class="tok-link" href="${m.href}">${esc(m.t)}</a>` : esc(m.t)}</span></li>`).join('')}</ol>
  <div class="roles" data-attend>
    ${profile.experience.map((r) => `<article class="role" id="x-${r.id}">
      <header><p class="mono role-when">${fmtRange(r.start, r.end)} · ${esc(r.kind)}</p><h3 class="role-title">${esc(r.role)}</h3><p class="role-org">${esc(r.org)} <span class="muted">· ${esc(r.place)}</span></p></header>
      <ul>${r.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </article>`).join('\n    ')}
    <aside class="community" id="community">
      <h3 class="mono sg-name">Community</h3>
      <ul>${profile.community.map((c) => `<li><span class="c-role">${esc(c.role)}</span><span class="muted"> · ${esc(c.org)}</span><span class="mono c-when">${c.end === null ? `${fmtMonth(c.start).split(' ')[1]} – now` : fmtRange(c.start, c.end)}</span></li>`).join('')}</ul>
    </aside>
  </div>
</section>`;
}

function evalSection() {
  const langs = Object.entries(github.languages || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const recent = (github.repos || []).slice().sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 5);
  return `<section class="layer eval" id="certs" data-layer="11" data-layer-name="Evaluation" aria-labelledby="eval-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Evaluation">Layer 11 · Evaluation</p>
    <h2 id="eval-h" class="layer-title">Held-out <em>benchmarks</em>.</h2>
  </header>
  <div class="eval-grid">
    <div>
      <h3 class="mono sg-name">Certifications</h3>
      <ol class="certs">${profile.certifications.map((c, i) => `<li><span class="mono cert-n">${String(i + 1).padStart(2, '0')}</span><span class="cert-name">${esc(c.name)}</span><span class="mono cert-by">${esc(c.issuer)}${c.note ? ` · ${esc(c.note)}` : ''}</span></li>`).join('')}</ol>
    </div>
    <div class="gh" aria-live="off">
      <h3 class="mono sg-name">Live from GitHub <span class="muted">· refreshed hourly</span></h3>
      ${github.fetched_at ? `<p class="gh-stats mono"><span><b>${github.user.public_repos ?? github.repos.length}</b> public repos</span><span><b>${github.totals?.stars ?? 0}</b> stars</span><span><b>${github.user.followers ?? 0}</b> followers</span></p>
      <div class="lang-bar" role="img" aria-label="Languages by code size: ${langs.map(([l, v]) => `${l} ${Math.round((v / total) * 100)}%`).join(', ')}">${langs.map(([l, v], i) => `<span style="--w:${((v / total) * 100).toFixed(2)}%;--i:${i}" title="${esc(l)}"></span>`).join('')}</div>
      <ul class="lang-key mono">${langs.map(([l, v], i) => `<li style="--i:${i}">${esc(l)} <span class="muted">${Math.round((v / total) * 100)}%</span></li>`).join('')}</ul>
      <h4 class="mono gh-sub">Recently pushed</h4>
      <ul class="gh-recent">${recent.map((r) => `<li><a class="tok-link" href="${r.url}" rel="noopener">${esc(r.name)}</a><span class="mono muted">${r.pushed_at.slice(0, 10)}</span></li>`).join('')}</ul>` : `<p class="muted">GitHub data appears after the first sync.</p>`}
    </div>
  </div>
</section>`;
}

function contactSection() {
  return `<section class="layer contact" id="contact" data-layer="12" data-layer-name="Output head" aria-labelledby="contact-h">
  <p class="layer-tag mono" data-lt="Output">Layer 12 · Output</p>
  <h2 id="contact-h" class="contact-title">The next token<br><em>is yours.</em></h2>
  <p class="contact-lede">Open to AI/ML internships, research collaborations and roles after May 2027. Email is the fastest way to reach me.</p>
  <a class="contact-mail shimmer" href="mailto:${profile.email}">${esc(profile.email)}</a>
  <ul class="contact-links mono">${profile.links.map((l) => `<li><a class="tok-link" href="${l.url}" rel="me noopener">${esc(l.label)} <span class="muted">${esc(l.handle)}</span></a></li>`).join('')}</ul>
</section>`;
}

function railNav() {
  return `<nav class="rail" aria-label="Layer progress" data-rail>
  <p class="rail-label mono"><span data-rail-n>Layer 01</span> <span class="muted">/ 12</span></p>
  <ol class="rail-ticks">${Array.from({ length: 12 }, (_, i) => `<li><a href="#" data-rail-tick="${i + 1}" aria-label="Go to layer ${i + 1}"></a></li>`).join('')}</ol>
  <p class="rail-name mono" data-rail-name>Tokenizer</p>
</nav>`;
}

function personLD() {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: SITE,
    image: `${SITE}/assets/img/profile-520.webp`,
    jobTitle: 'AI Engineer',
    email: `mailto:${profile.email}`,
    alumniOf: { '@type': 'CollegeOrUniversity', name: profile.education.school },
    knowsAbout: ['Large Language Models', 'Natural Language Processing', 'Computer Vision', 'Generative AI', 'AI Agents', 'Retrieval-Augmented Generation'],
    sameAs: profile.links.map((l) => l.url),
  })}</script>`;
}

function renderHome() {
  return `${head({
    title: 'Sahaj Saliya · I build AI that reads, sees and acts',
    description: 'Sahaj Saliya is an AI engineer (B.Tech ICT, PDEU) building LLM, RAG, computer vision and agent systems. Projects as model cards, an embedding map and a chatbot that answers from his data.',
    url: '/',
    extra: personLD(),
  })}
<body class="home">
${bootHtml()}
${header({ home: true })}
${railNav()}
<main id="main">
${heroSection()}
${aboutSection()}
${mapSection()}
${workSection()}
${skillsSection()}
${experienceSection()}
${evalSection()}
${contactSection()}
</main>
${footer()}
<svg class="attn-layer" aria-hidden="true" data-attn-layer></svg>
${shellScripts()}
</body>
</html>
`;
}

// ---------- secondary pages ----------

function simplePage({ title, description, url, layer, kicker, heading, body, noindex = false }) {
  return `${head({ title, description, url, extra: noindex ? '<meta name="robots" content="noindex">' : '' })}
<body class="page">
${bootHtml()}
${header()}
<main id="main" class="page-main">
  <section class="layer solo" data-layer="${layer}" data-layer-name="${esc(kicker)}">
    <p class="layer-tag mono">${esc(kicker)}</p>
    <h1 class="solo-title">${heading}</h1>
    ${body}
  </section>
</main>
${footer()}
${shellScripts()}
</body>
</html>
`;
}

function render404() {
  return simplePage({
    title: '404 · Token not in vocabulary · Sahaj Saliya',
    description: 'This page does not exist.',
    url: '/404.html',
    layer: 0,
    kicker: 'Error 404 · <unk>',
    heading: `<span class="unk mono">&lt;unk&gt;</span><br><em>Token not in vocabulary.</em>`,
    noindex: true,
    body: `<p class="solo-lede">The model has never seen this address, so it cannot predict anything useful here.</p>
    <p class="solo-dist mono" aria-hidden="true"><span style="--p:.31">/</span><span style="--p:.24">/#work</span><span style="--p:.19">/#contact</span><span style="--p:.14">/#map</span><span style="--p:.12">/blogs/</span></p>
    <p class="solo-actions"><a class="btn shimmer" href="/">Back to the home page</a> <button class="btn btn-ghost" type="button" data-ask-open>Ask my portfolio</button></p>`,
  });
}

function loadPosts() {
  const dir = path('content/blog');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => {
    const { meta, body } = parseFrontMatter(readText(`content/blog/${f}`));
    if (meta.draft === 'true') return null;
    return { slug: meta.slug || slug(f.replace(/\.md$/, '')), title: meta.title || f, date: meta.date || '', summary: meta.summary || '', tags: (meta.tags || '').split(',').map((s) => s.trim()).filter(Boolean), html: marked.parse(body), body };
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
}

function renderBlogIndex() {
  if (!BLOG_LIVE) {
    return simplePage({
      title: 'Blog · Writing in progress · Sahaj Saliya',
      description: 'Sahaj Saliya’s blog on applied AI is being written.',
      url: '/blogs/',
      layer: 0,
      kicker: 'Blog · under maintenance',
      heading: `Writing in progress<span class="ellipsis" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>`,
      body: `<p class="solo-lede">Notes on retrieval, agents, vision and honest evaluation are still being generated. Check back soon.</p>
    <p class="solo-actions"><a class="btn shimmer" href="/">Back to the home page</a></p>`,
    });
  }
  return simplePage({
    title: 'Blog · Sahaj Saliya',
    description: 'Writing on applied AI: retrieval, agents, computer vision and evaluation.',
    url: '/blogs/',
    layer: 0,
    kicker: 'Blog',
    heading: 'Notes from the <em>forward pass</em>.',
    body: `<ol class="post-list">${posts.map((p) => `<li><a class="post-link" href="/blogs/${p.slug}/"><span class="mono post-date">${esc(p.date)}</span><span class="post-title">${esc(p.title)}</span><span class="post-sum muted">${esc(p.summary)}</span></a></li>`).join('')}</ol>`,
  });
}

function renderPost(p) {
  return simplePage({
    title: `${p.title} · Sahaj Saliya`,
    description: p.summary || p.title,
    url: `/blogs/${p.slug}/`,
    layer: 0,
    kicker: `Blog · ${p.date}`,
    heading: esc(p.title),
    body: `<article class="prose" data-attend>${p.html}</article><p class="solo-actions"><a class="tok-link mono" href="/blogs/">← All posts</a></p>`,
  });
}

function sitemap() {
  const urls = ['/', '/blogs/', ...(BLOG_LIVE ? posts.map((p) => `/blogs/${p.slug}/`) : [])];
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
}

// ---------- write ----------

const outputs = {
  'index.html': renderHome(),
  '404.html': render404(),
  'blogs/index.html': renderBlogIndex(),
  'sitemap.xml': sitemap(),
  'robots.txt': `User-agent: *\nAllow: /\nDisallow: /maintenance/\nSitemap: ${SITE}/sitemap.xml\n`,
  'site.webmanifest': JSON.stringify({ name: 'Sahaj Saliya', short_name: 'Sahaj', start_url: '/', display: 'standalone', background_color: '#F3EEE3', theme_color: '#0B1020', icons: [{ src: '/assets/brand/icon-192.png?v=3', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/assets/brand/icon-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/assets/brand/icon-maskable-512.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2) + '\n',
  'data/site.json': { blogLive: BLOG_LIVE, posts: BLOG_LIVE ? posts.map(({ slug: s, title, date, summary, tags }) => ({ slug: s, title, date, summary, tags })) : [] },
};
if (BLOG_LIVE) for (const p of posts) outputs[`blogs/${p.slug}/index.html`] = renderPost(p);

let changed = 0;
for (const [file, content] of Object.entries(outputs)) if (write(file, content)) { changed++; console.log('wrote', file); }
console.log(`build done, ${changed} file(s) changed`);
