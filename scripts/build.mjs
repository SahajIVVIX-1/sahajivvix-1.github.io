// Renders the static site (index, 404, resume, the blog redirects, sitemap) from content/ and data/.
// Usage: node scripts/build.mjs [--embed]   (--embed also recomputes the ML data first)
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readJSON, readText, write, esc, fmtMonth, fmtRange, slug, path, projectUrl, projectCodeLabel, loadPortfolio } from './lib.mjs';
import { renderResume, RESUME_PDF } from './resume.mjs';

if (process.argv.includes('--embed')) {
  const { embedAll } = await import('./embed.mjs');
  await embedAll();
  const { clipAll } = await import('./clip.mjs');
  await clipAll();
}

const SITE = 'https://info.sahaj.si';
const REPO = 'https://github.com/SahajIVVIX-1/sahajivvix-1.github.io';

// Source commit this build is made from: GITHUB_SHA in the hourly Action, HEAD locally. A commit cannot hold its own
// hash, so data/build.json names the commit the build started from (the parent of the commit that stores it).
const BUILD_SHA = (() => {
  if (/^[0-9a-f]{40}$/.test(process.env.GITHUB_SHA || '')) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { cwd: path('.'), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; }
})();

// Boot screen and visitor tag are inlined (see scripts/boot/): they must run before anything else loads.
// Minifier is deliberately simple: the sources use explicit semicolons and no '//' inside strings.
const minify = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').trim();
const BOOT_CSS = minify(readText('scripts/boot/boot.css'));
const BOOT_FRESH = minify(readText('scripts/boot/fresh.js'));
const BOOT_HEAD = minify(readText('scripts/boot/head.js'));
const BOOT_JS = minify(readText('scripts/boot/boot.js'));
// The minifier is deliberately simple (it only strips whole-line // comments). Refuse to build if it ever breaks a script.
for (const [name, code] of [['fresh.js', BOOT_FRESH], ['head.js', BOOT_HEAD], ['boot.js', BOOT_JS]]) {
  try { new Function(code); } catch (e) { throw new Error(`scripts/boot/${name} is not valid JavaScript after minifying (${e.message}). Put comments on their own line.`); }
}
const bootHtml = () => `<div id="boot-live" class="bs" role="status" aria-live="polite"></div><div id="boot" aria-hidden="true"><div class="boot-box"><p class="boot-cap" id="boot-cap"><span>forward pass · layer 1/5 · 0%</span><span>τ 0.7 · weights seeded per visitor</span></p><p class="boot-feat" id="boot-feat"></p><div class="boot-stage"><canvas id="boot-cv"></canvas></div><p class="boot-greet" id="boot-greet"></p><p class="boot-clock" id="boot-clock"></p><div class="boot-bottom"><ul id="boot-log"></ul><div class="boot-mat"><canvas id="boot-mat"></canvas><p>attention · head 3</p></div></div><p class="boot-hint"><span>heuristic guess · computed in your browser; only your public IP is looked up</span><span>click or press any key to skip</span></p></div></div><script>${BOOT_JS.replace('__V__', ASSET_VERSION)}</script>`;
const profile = readJSON('content/profile.json');
const gwr = readJSON('content/guinness.json');
const harvard = readJSON('content/harvard.json', { programs: [] }).programs;
// the header logo: Sahaj's own artwork (scripts/brand.mjs), the light and dark versions stacked so the theme
// toggle can cross-fade them; the scroll-progress ring and the ticks are drawn around it
const LOGO_MARK = '<image class="logo-img logo-l" href="/assets/brand/logo-light.webp?v=4" x="3" y="3" width="34" height="34"/><image class="logo-img logo-d" href="/assets/brand/logo-dark.webp?v=4" x="3" y="3" width="34" height="34"/>';
// Two horizontal-scroll sections: projects (model cards, the attention heads) and products (the feed-forward blocks).
// portfolioAll feeds everything that treats both alike (timeline, job-fit matcher, map listing).
const { projects, products, all: portfolioAll } = loadPortfolio();
// The page is one layer per section; each project is one attention-head layer, so the count follows projects.json.
// persona.js renumbers the same way in the browser.
const NP = projects.length;
const NPR = products.length;
const LAYER = { products: 4 + NP, skills: 4 + NP + NPR, experience: 5 + NP + NPR, certs: 6 + NP + NPR, contact: 7 + NP + NPR };
const LAYERS = LAYER.contact;
const L2 = (n) => String(n).padStart(2, '0');
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const numWord = (n) => NUM_WORDS[n] || String(n);

const mapData = readJSON('data/map.json', null);
const github = readJSON('data/github.json', { repos: [], languages: {}, events: [], user: {} });
const heatmaps = readJSON('data/heatmaps.json', {});
// The blog is its own site (another repo, published at blog.sahaj.si). Every link to it, and /blog and /blogs on
// this site, go there.
const BLOG = 'https://blog.sahaj.si';
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
<meta name="project-count" content="${NP}">
<meta name="product-count" content="${NPR}">
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
<link rel="icon" type="image/svg+xml" href="/assets/brand/logo-small.svg?v=4">
<link rel="icon" href="/favicon.ico?v=4" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/icon-32.png?v=4">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png?v=4">
<link rel="manifest" href="/site.webmanifest?v=4">
<link rel="preload" href="/assets/fonts/instrument-serif-latin-400-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/anthropic-serif/anthropic-serif-text-500-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>${BOOT_FRESH}</script>
<script>${THEME_BOOT}</script>
<style>${BOOT_CSS}</style>
<script>${BOOT_HEAD}</script>
<link rel="stylesheet" href="/assets/css/main.css?v=${ASSET_VERSION}">
${extra}
</head>`;
}

const PRIVACY = 'Your IP is looked up from api.ipify.org when the page opens, shown only to you, and never stored.';

function header({ home = false } = {}) {
  const base = home ? '' : '/';
  const nav = [
    ['Work', `${base}#work`],
    ['Products', `${base}#products`],
    ['Map', `${base}#map`],
    ['Training', `${base}#experience`],
    ['Contact', `${base}#contact`],
    ['Blog', `${BLOG}/`],
  ];
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-head" data-head>
  <a class="brand" href="/" aria-label="info@sahaj.si, Sahaj Saliya, home" title="Sahaj Saliya, home" data-brand>
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
    <span class="ctx-wrap">
      <button class="ctx-chip mono" type="button" data-ctx hidden aria-expanded="false" aria-controls="ctx-tip" aria-label="ctx, you and the layer in view: show your address and the privacy note"><span class="ctx-k">ctx</span><span class="ctx-who" data-ctx-who>…</span><span class="ctx-layer" data-ctx-layer></span></button>
      <span class="ctx-tip" id="ctx-tip" role="note" hidden>${PRIVACY}</span>
    </span>
    <button class="kbd-btn" type="button" data-palette-open>
      <span class="mono">Search or ask</span><kbd>Ctrl K</kbd>
    </button>
    ${home ? `<button class="lens-btn mono" type="button" data-lens aria-pressed="false" title="Lens: point at any word to see which parts of the page it attends to">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="6.8" cy="6.8" r="4.6"/><path d="M10.2 10.2 14 14"/><circle class="lens-pupil" cx="6.8" cy="6.8" r="1.6"/></svg><span>lens</span>
    </button>` : ''}
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
  const privacy = PRIVACY;
  const ext = (l) => `<a class="foot-link" href="${l.url}" target="_blank" rel="me noopener" aria-label="${esc(l.label)} (opens in a new tab)">${esc(l.label)}</a>`;
  return `<footer class="site-foot" data-foot>
  <p class="foot-copy-line">© ${new Date().getFullYear()} Sahaj Saliya</p>
  <nav class="foot-links" aria-label="Elsewhere">${profile.links.map(ext).join('')}<a class="foot-link" href="mailto:${profile.email}" aria-label="Email Sahaj Saliya">Email</a></nav>
  <p class="foot-card mono">${synced ? `last forward pass <time datetime="${synced.toISOString()}" title="${utc}" data-foot-time>${utc}</time> <span data-foot-ago></span>` : ''}${BUILD_SHA ? `<span class="foot-build" data-build="${BUILD_SHA}"> · build <a class="foot-link" href="${REPO}/commit/${BUILD_SHA}" target="_blank" rel="noopener" aria-label="build ${BUILD_SHA.slice(0, 7)}: source commit on GitHub (opens in a new tab)">${BUILD_SHA.slice(0, 7)}</a><span data-build-state aria-live="polite"></span></span>` : ''}<span data-session hidden> · ip <b></b> <button class="foot-i" type="button" aria-label="About the IP lookup" aria-describedby="ip-tip">i</button><span class="foot-tip" id="ip-tip" role="tooltip">${privacy}</span></span></p>
  <span class="foot-btns"><button class="foot-top" type="button" data-plain-toggle aria-pressed="false" title="No loading screen, no animation">plain view</button>
  <button class="foot-top" type="button" data-to-top>↑ top</button></span>
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
        <span class="seg" data-seg><span class="seg-pill" aria-hidden="true"></span><button type="button" data-persona="recruiter" aria-pressed="false">Recruiter</button><button type="button" data-persona="developer" aria-pressed="false">Developer</button><button type="button" data-persona="researcher" aria-pressed="false">Researcher</button><button type="button" data-persona="curious" aria-pressed="false">Curious</button></span>
        <a class="seg-resume" href="${RESUME_PDF}" download="Sahaj-Saliya-Resume.pdf" data-resume><span data-resume-label>Download resume (PDF)</span></a>
      </span>
      <span aria-hidden="true">·</span>
      <button type="button" class="tok-link persona-switch" data-plain-toggle aria-pressed="false" title="No loading screen, no animation">plain view</button>
    </p>
    <ul class="focus-chips mono" aria-label="Focus areas">
      ${profile.focus.map((f, i) => `<li><span class="tid">${String(1000 + i * 137).padStart(5, '0')}</span>${esc(f)}</li>`).join('')}
    </ul>
    <a class="hero-badge" href="#recognition" data-badge aria-label="Guinness World Records participant, 2022. See details">
      <span class="hb-logo"><span class="hb-disc"><img class="hb-img" src="/assets/achievements/guinness/guinness-world-records-logo.svg" width="92" height="92" alt="" decoding="async"><i class="gwr-star" aria-hidden="true"></i></span><canvas class="hb-cv" aria-hidden="true"></canvas></span>
      <span class="hb-text"><span class="hb-name">Guinness World Records</span><span class="hb-sub mono">participant · 2022</span></span>
      <span class="hb-ph" aria-hidden="true"></span>
    </a>
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
      <div class="portrait-frame" data-tiles>
        <picture>
          <source type="image/avif" srcset="/assets/img/profile-260.avif 260w, /assets/img/profile-340.avif 340w, /assets/img/profile-520.avif 520w" sizes="(min-width: 1200px) 340px, (min-width: 900px) 300px, (min-width: 640px) 280px, 260px">
          <img src="/assets/img/profile-520.webp" srcset="/assets/img/profile-260.webp 260w, /assets/img/profile-340.webp 340w, /assets/img/profile-520.webp 520w" sizes="(min-width: 1200px) 340px, (min-width: 900px) 300px, (min-width: 640px) 280px, 260px" width="520" height="650" alt="Portrait of Sahaj Saliya by a lake, wearing glasses and a white polo shirt" loading="lazy" decoding="async">
        </picture>
      </div>
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
      <div id="recognition"><dt>recognition</dt><dd><a class="tok-link" href="#guinness">${esc(gwr.title)} · ${gwr.year}</a></dd></div>
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
      <div class="map-see" data-see>
        <button type="button" class="map-see-btn" data-see-pick><span class="see-ic" aria-hidden="true"></span>Show it an image</button>
        <input type="file" accept="image/*" hidden data-see-file aria-label="Choose an image to compare with the work">
        <p class="map-see-note mono">or drop or paste one on the map · Your image never leaves your browser: CLIP embeds it on your device (≈88 MB model, downloaded once).</p>
      </div>
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
    ${portfolioAll.map((p) => `<li>${p.product ? 'Product' : 'Project'} <a href="#p-${p.id}">${esc(p.name)}</a>: ${esc(p.kind)}.</li>`).join('')}
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

// One slide of a horizontal-scroll track. `sec` says which track it belongs to (the layer number, the "Head" or
// "Block" name and the kicker follow from it); persona.js renumbers the same way when the order changes.
function projectCard(p, i, sec) {
  const prod = sec.key === 'products';
  const gh = p.link ? null : github.repos.find((r) => r.name === p.repo);
  const links = p.links || [{ label: projectCodeLabel(p), url: projectUrl(p) }];
  const n = i + 1;
  return `<article class="card layer" id="p-${p.id}" data-default-index="${i}" data-layer="${sec.first + i}" data-layer-name="${sec.unit} ${n} · ${esc(p.name)}" aria-labelledby="p-${p.id}-h">
  <div class="card-side">
  <header class="card-head">
    ${heatmapSVG(p.id)}
    <div class="card-id">
      <p class="mono card-kicker">${sec.card} · <span data-ci>${String(n).padStart(2, '0')}</span> / ${String(sec.list.length).padStart(2, '0')} · ${esc(p.kind)}</p>
      <h3 id="p-${p.id}-h" class="card-title">${esc(p.name)}</h3>
      <p class="mono card-task">${esc(p.task)}</p>
      <div class="card-metric"><span class="metric-val">${esc(p.metric.value)}</span><span class="metric-label mono">${esc(p.metric.label)}</span></div>
    </div>
  </header>
  <dl class="card-meta" data-attend>
    <div class="cb-row cb-stack"><dt class="mono">Stack</dt><dd><ul class="stack mono">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></dd></div>
    <div class="cb-row cb-team"><dt class="mono">Authors</dt><dd class="muted">${esc(p.team)}</dd></div>
  </dl>
  </div>
  <dl class="card-body" data-attend>
    <div class="cb-row cb-problem"><dt class="mono">Problem</dt><dd>${esc(p.problem)}</dd></div>
    <div class="cb-row cb-approach"><dt class="mono">Approach</dt><dd>${esc(p.approach)}</dd></div>
    ${p.features?.length ? `<div class="cb-row cb-features"><dt class="mono">Features</dt><dd><ul class="feat">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></dd></div>` : ''}
    <div class="cb-row cb-eval"><dt class="mono">${prod ? 'Specs' : 'Evaluation'}</dt><dd><table class="evals"><tbody>${p.metrics.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="mono">${esc(v)}</td></tr>`).join('')}</tbody></table></dd></div>
    ${p.limits ? `<div class="cb-row cb-limits"><dt class="mono">Limits</dt><dd class="muted">${esc(p.limits)}</dd></div>` : ''}
  </dl>
  <footer class="card-foot mono">
    <span class="card-links">${links.map((l) => `<a class="tok-link card-repo" href="${l.url}" rel="noopener">${esc(l.label)} <span aria-hidden="true">↗</span></a>`).join('')}</span>
    ${gh ? `<span class="card-gh">${gh.language ? esc(gh.language) + ' · ' : ''}★ ${gh.stars} · updated ${gh.pushed_at.slice(0, 10)}</span>` : ''}
  </footer>
</article>`;
}

// A horizontal-scroll track. Without JavaScript (and on phones and with reduced motion) it is a swipeable row; on wide
// screens assets/js/hscroll.js pins it and turns the page's vertical scroll into sideways movement until the last
// card, then lets the page go on (see .hs in main.css).
function hsTrack(sec) {
  const n = sec.list.length;
  return `<div class="hs" data-hs aria-label="${esc(sec.label)}">
    <div class="hs-pin">
      <p class="hs-bar mono" aria-hidden="true"><span class="hs-count"><b data-hs-n>01</b> / ${String(n).padStart(2, '0')}</span><span class="hs-name" data-hs-name></span><span class="hs-rule"><i data-hs-fill></i></span><span class="hs-hint"></span></p>
      <div class="hs-track" data-hs-track>
        ${sec.list.map((p, i) => projectCard(p, i, sec)).join('\n')}
      </div>
    </div>
  </div>`;
}

const PROJECT_SEC = { key: 'projects', list: projects, first: 4, unit: 'Head', card: 'Model card', label: 'Projects, scroll sideways' };
const PRODUCT_SEC = { key: 'products', list: products, first: LAYER.products, unit: 'Block', card: 'Product card', label: 'Products, scroll sideways' };

function workSection() {
  return `<section class="work" id="work" aria-labelledby="work-h">
  <header class="layer-head work-head">
    <p class="layer-tag mono" data-lt-range="Attention heads">Layers 04–${L2(3 + NP)} · Attention heads</p>
    <h2 id="work-h" class="layer-title">${numWord(NP)[0].toUpperCase() + numWord(NP).slice(1)} heads, <em>${numWord(NP)} things</em> they learned.</h2>
    <p class="layer-sub">Every project is documented like a model card: problem, approach, evaluation and limits. The header heatmap is real self-attention over that project's README, computed when the site builds. Scroll to move sideways through them.</p>
  </header>
  ${hsTrack(PROJECT_SEC)}
</section>`;
}

function productsSection() {
  return `<section class="work products" id="products" aria-labelledby="products-h">
  <header class="layer-head work-head">
    <p class="layer-tag mono" data-lt-range="Feed-forward blocks">Layers ${L2(LAYER.products)}–${L2(LAYER.products + NPR - 1)} · Feed-forward blocks</p>
    <h2 id="products-h" class="layer-title">${numWord(NPR)[0].toUpperCase() + numWord(NPR).slice(1)} things I <em>shipped</em>.</h2>
    <p class="layer-sub">Projects are what I studied; products are what other people can run. Each is a working tool with its own users, installer or repo, described the same way: what it is for, how it works, what it can do and where it stops.</p>
  </header>
  ${hsTrack(PRODUCT_SEC)}
</section>`;
}

function skillsSection() {
  let n = 0;
  return `<section class="layer skills" id="skills" data-layer="${LAYER.skills}" data-layer-name="Parameters" aria-labelledby="skills-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Parameters">Layer ${L2(LAYER.skills)} · Parameters</p>
    <h2 id="skills-h" class="layer-title">The weights I <em>reach for</em>.</h2>
  </header>
  <div class="skill-groups" data-attend>
    ${profile.skills.map((g) => `<div class="skill-group" id="s-${slug(g.group)}">
      <h3 class="mono sg-name">${esc(g.group)}</h3>
      <ul class="sg-items">${g.items.map((s) => `<li><span class="w mono" aria-hidden="true">w${String(n++).padStart(2, '0')}</span><span class="sk">${esc(s)}</span></li>`).join('')}</ul>
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
    ...portfolioAll.map((p) => ({ d: p.date || repoDate(p.repo) || `${p.year}-01`, t: `Shipped ${p.name}`, k: 'project', href: `#p-${p.id}` })),
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
  return `<section class="layer training" id="experience" data-layer="${LAYER.experience}" data-layer-name="Training run" aria-labelledby="exp-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Training run">Layer ${L2(LAYER.experience)} · Training run</p>
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
      <ul>${profile.community.map((c) => `<li id="c-${slug(c.role)}"><span class="c-role">${esc(c.role)}</span><span class="muted"> · ${esc(c.org)}</span><span class="mono c-when">${c.end === null ? `${fmtMonth(c.start).split(' ')[1]} – now` : fmtRange(c.start, c.end)}</span></li>`).join('')}</ul>
    </aside>
  </div>
  ${trainingLog()}
</section>`;
}

// The live training log: his real public GitHub activity, refreshed by the hourly Action, drawn like a training
// run. step = public contributions in the last 12 months (GitHub's own count); loss = open ÷ all issues and pull
// requests (it falls as they are closed); streak = days in a row with public work (calendar, push events or a repo's last push, since
// the calendar leaves out forks); the chart is work per day over the last 12 weeks.
function trainingLog() {
  const cal = github.calendar || [];
  if (!github.fetched_at || !cal.length) return '';
  const byDay = new Map(cal.map(([d, n]) => [d, n]));
  for (const e of github.events || []) if (e.type === 'PushEvent') { const d = e.at.slice(0, 10); if (!byDay.get(d)) byDay.set(d, Math.max(byDay.get(d) || 0, e.commits || 1)); }
  // each repo's last push is public too (it catches work on forks that the calendar and recent events miss)
  for (const r of github.repos || []) { const d = (r.pushed_at || '').slice(0, 10); if (d && !byDay.get(d)) byDay.set(d, 1); }
  const last = cal[cal.length - 1][0];
  const day = (k) => { const t = new Date(`${last}T00:00:00Z`); t.setUTCDate(t.getUTCDate() - k); return t.toISOString().slice(0, 10); };
  const days = Array.from({ length: 84 }, (_, i) => day(83 - i)).map((d) => [d, byDay.get(d) || 0]);
  let streak = 0; for (let k = byDay.get(last) ? 0 : 1; byDay.get(day(k)); k++) streak++;
  const step = cal.reduce((a, [, n]) => a + n, 0);
  const w = github.work || { issuesOpen: 0, issuesClosed: 0, prsOpen: 0, prsMerged: 0 };
  const open = w.issuesOpen + w.prsOpen, all = open + w.issuesClosed + w.prsMerged;
  const loss = all ? open / all : 0;
  const since = new Date(Date.parse(`${last}T00:00:00Z`) - 30 * 864e5).toISOString();
  const updated = (github.repos || []).filter((r) => r.pushed_at >= since).length;
  const max = Math.max(1, ...days.map(([, n]) => n));
  const ema = []; days.forEach(([, n], i) => ema.push(i ? ema[i - 1] * 0.8 + n * 0.2 : n));
  const W = 840, H = 74, bw = W / days.length;
  const bars = days.map(([d, n], i) => `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - 4 - (n / max) * (H - 12)).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(n ? 2 : 1, (n / max) * (H - 12)).toFixed(1)}" class="${n ? 'on' : ''}"><title>${d}: ${n} contribution${n === 1 ? '' : 's'}</title></rect>`).join('');
  const line = ema.map((v, i) => `${(i * bw + bw / 2).toFixed(1)},${(H - 4 - (v / max) * (H - 12)).toFixed(1)}`).join(' ');
  // latest pushes, one line per repo and day (several pushes on one day are added up)
  const pushes = [];
  for (const e of (github.events || []).filter((x) => x.type === 'PushEvent')) {
    const d = e.at.slice(0, 10), same = pushes.find((p) => p.repo === e.repo && p.at.slice(0, 10) === d);
    // a push whose count is unknown makes the total a lower bound (shown as N+)
    if (same) { same.n += e.commits || 0; same.more ||= e.commits == null; } else pushes.push({ ...e, n: e.commits || 0, more: e.commits == null });
  }
  pushes.splice(5);
  const langs = Object.entries(github.languages || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const lt = langs.reduce((a, [, v]) => a + v, 0) || 1;
  const fmt = (n) => n.toLocaleString('en-US');
  return `<div class="trainlog" aria-labelledby="tl-h">
    <header class="tl-head mono"><h3 id="tl-h"><span class="tl-dot" aria-hidden="true"></span>training log · live from GitHub</h3><span>updated <time datetime="${github.fetched_at}" data-live-ago>${github.fetched_at.slice(0, 16).replace('T', ' ')} UTC</time> · refreshed hourly</span></header>
    <p class="tl-run mono"><span>step <b>${fmt(step)}</b><small>public contributions, last 12 months</small></span><span>loss <b>${loss.toFixed(2)}</b><small>open ÷ all issues and PRs (${open} of ${all}) · falls as they close</small></span><span>streak <b>${streak} day${streak === 1 ? '' : 's'}</b><small>in a row with public work</small></span><span>repos <b>${updated}</b><small>pushed in the last 30 days</small></span></p>
    <figure class="tl-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Public work per day over the last 12 weeks, with a moving average"><g class="tl-bars">${bars}</g><polyline class="tl-ema" points="${line}"/></svg><figcaption class="mono"><span>${days[0][0]}</span><span>work per day · moving average</span><span>${last}</span></figcaption></figure>
    <div class="tl-foot"><ol class="tl-pushes mono" aria-label="Latest pushes">${pushes.map((e) => `<li><span class="tl-repo">${esc(e.repo)}</span><span>${e.n ? `${e.n}${e.more ? '+' : ''} commit${e.n === 1 && !e.more ? '' : 's'}` : 'push'}</span><time datetime="${e.at}">${e.at.slice(0, 10)}</time></li>`).join('')}</ol><p class="tl-langs mono">${langs.map(([l, v]) => `${esc(l)} <b>${Math.round((v / lt) * 100)}%</b>`).join(' · ')}</p></div>
  </div>`;
}

// The Guinness World Records participation, shown as a benchmark entry whose values are "read" from the certificate.
function guinnessCard() {
  const A = '/assets/achievements/guinness';
  const [cw, ch] = gwr.size;
  const rows = [
    ['benchmark', gwr.benchmark, ''],
    ['task', gwr.task, 'task'],
    ['role', gwr.role, 'role'],
    ['when·where', `${gwr.when} · ${gwr.where}`, 'when'],
  ];
  return `<article class="gwr" id="guinness" aria-labelledby="gwr-h" data-gwr>
  <span class="gwr-badge" aria-hidden="false"><img class="gwr-logo" src="${A}/guinness-world-records-logo.svg" width="56" height="56" alt="Guinness World Records logo" loading="lazy" decoding="async"><i class="gwr-star" aria-hidden="true"></i></span>
  <div class="gwr-body">
    <h3 id="gwr-h" class="gwr-title">${esc(gwr.title)}</h3>
    <dl class="gwr-rows">
      ${rows.map(([k, v, key]) => `<div${key ? ` data-row="${key}"` : ''}><dt class="mono">${k}</dt><dd>${esc(v)}</dd></div>`).join('\n      ')}
      <div data-row="status"><dt class="mono">status</dt><dd><span class="gwr-ok" aria-hidden="true">✓</span> ${esc(gwr.status)}</dd></div>
    </dl>
    <p class="gwr-note">${esc(gwr.certificate)}: ${esc(gwr.record)}, ${esc(gwr.place)}, ${esc(gwr.when)}. Sahaj took part as a participant.</p>
  </div>
  <button class="gwr-thumb" type="button" aria-haspopup="dialog" data-gwr-open aria-label="Open the certificate: ${esc(gwr.certificate)}, ${esc(gwr.when)}">
    <span class="gwr-frame" style="aspect-ratio:${cw} / ${ch}">
      <img src="${A}/certificate-thumb.webp" width="300" height="435" alt="${esc(gwr.alt)}" loading="lazy" decoding="async">
      <svg class="gwr-ocr" viewBox="0 0 ${cw} ${ch}" aria-hidden="true">${gwr.boxes.map((b) => `<rect data-ocr="${b.id}" x="${b.rect[0]}" y="${b.rect[1]}" width="${b.rect[2]}" height="${b.rect[3]}" rx="3"/>`).join('')}</svg>
      <i class="gwr-scan" aria-hidden="true"></i>
    </span>
    <span class="gwr-hint mono">open · see what the model sees</span>
  </button>
  <svg class="gwr-links" aria-hidden="true"></svg>
  <script type="application/json" data-gwr-data>${JSON.stringify({ boxes: gwr.boxes, json: gwr.json, confidence: gwr.confidence, size: gwr.size, full: `${A}/certificate.webp`, fullJpg: `${A}/certificate.jpg`, alt: gwr.alt }).replace(/</g, '\\u003c')}</script>
</article>`;
}

function evalSection() {
  const langs = Object.entries(github.languages || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = langs.reduce((s, [, v]) => s + v, 0) || 1;
  const recent = (github.repos || []).slice().sort((a, b) => b.pushed_at.localeCompare(a.pushed_at)).slice(0, 5);
  return `<section class="layer eval" id="certs" data-layer="${LAYER.certs}" data-layer-name="Evaluation" aria-labelledby="eval-h">
  <header class="layer-head">
    <p class="layer-tag mono" data-lt="Evaluation">Layer ${L2(LAYER.certs)} · Evaluation</p>
    <h2 id="eval-h" class="layer-title">Held-out <em>benchmarks</em>.</h2>
  </header>
  ${guinnessCard()}
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
  ${adaptersBlock()}
</section>`;
}

// The Harvard ManageMentor completion badges (content/harvard.json) as "adapters merged into the base model": the
// base model card, the rack of badges (each flips to its certificate and opens a lightbox) and a plain list for plain
// view and the Recruiter persona. assets/js/adapters.js runs the merge animation. Wording rules: short online
// programs from Harvard Business Impact, never a degree; "r=8" is decorative LoRA notation only.
function adaptersBlock() {
  if (!harvard.length) return '';
  const n = harvard.length;
  const first = harvard[0].month, last = harvard[n - 1].month;
  const span = first.slice(0, 4) === last.slice(0, 4) ? `${fmtMonth(first).split(' ')[0]} to ${fmtMonth(last)}` : `${fmtMonth(first)} to ${fmtMonth(last)}`;
  const long = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const alt = (p) => `Harvard ManageMentor completion badge: ${p.program}, ${long(p.month)}`;
  const slot = (p, i) => `<li class="ad-slot${p.focus ? ' is-focus' : ''}" data-ad="${p.slug}" style="--i:${i}">
        <button class="ad-badge" type="button" aria-haspopup="dialog" data-ad-open>
          <span class="ad-card" style="--front:url('${p.badge.small}');--back:url('${p.certificate.tile}')"><img class="ad-front" src="${p.badge.small}" srcset="${p.badge.small} 256w, ${p.badge.src} 512w" sizes="(min-width: 900px) 132px, 120px" width="${p.badge.width}" height="${p.badge.height}" alt="${esc(alt(p))}" loading="lazy" decoding="async"><img class="ad-back" src="${p.certificate.tile}" width="${p.badge.width}" height="${p.badge.height}" alt="" aria-hidden="true" loading="lazy" decoding="async"></span>
          <span class="ad-prog" aria-hidden="true"></span>
        </button>
        <p class="ad-label mono" aria-hidden="true"><span class="ad-name">adapter/${p.slug}</span><span class="ad-meta">r=8 · ${fmtMonth(p.month)}</span><span class="ad-file"></span></p>
        ${p.focus ? `<span class="ad-tag mono">${esc(p.focus)}</span>` : ''}
      </li>`;
  const data = harvard.map((p) => ({ slug: p.slug, program: p.program, month: long(p.month), file: p.file, cert: p.certificate.src, w: p.certificate.width, h: p.certificate.height, pdf: p.pdf, links: p.links || [] }));
  return `<div class="adapters" id="adapters" aria-labelledby="ad-h" data-adapters>
    <h3 id="ad-h" class="mono sg-name">Adapters · Harvard ManageMentor</h3>
    <p class="ad-sub">${n} short online management programs from Harvard ManageMentor®, Harvard Business Impact, completed ${span}. Drawn as LoRA adapters: small add-ons merged on top of an AI-engineer base model, adding management skills without changing the core. Completion badges, not a degree.</p>
    <div class="ad-grid">
      <div class="ad-base mono" data-ad-base>
        <p class="ad-base-h">model card</p>
        <dl>
          <div><dt>base</dt><dd>sahaj-saliya · AI engineer</dd></div>
          <div><dt>adapters merged</dt><dd><span class="ad-n" data-ad-n>${n}</span> / ${n}<span class="ad-ok" aria-hidden="true"> ✓</span></dd></div>
          <div><dt>issuer</dt><dd>Harvard Business Impact</dd></div>
        </dl>
        <p class="ad-base-note">r=8 on each adapter is LoRA notation for decoration, not a measurement.</p>
      </div>
      <ol class="ad-rack" data-ad-rack aria-label="Harvard ManageMentor completion badges, oldest first">
      ${harvard.map(slot).join('\n      ')}
      </ol>
      <svg class="ad-wires" aria-hidden="true" data-ad-wires></svg>
    </div>
    <ol class="ad-plain">${harvard.map((p) => `<li><span class="ad-plain-name">${esc(p.program)}</span> <span class="mono muted">· ${fmtMonth(p.month)}</span> <a class="tok-link" href="${p.pdf}" download>certificate (PDF)</a></li>`).join('')}</ol>
    <script type="application/json" data-ad-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
  </div>`;
}

// Recruiter mode: paste a job description, get a match report from Sahaj's own data (assets/js/fit.js). It is a
// probe, not one of the layers, so the rail does not count it.
function fitSection() {
  return `<section class="layer probe fit" id="fit" aria-labelledby="fit-h" data-fit>
  <header class="layer-head">
    <p class="layer-tag mono">Probe · fine-tune on your role</p>
    <h2 id="fit-h" class="layer-title">Paste a job description. <em>See the fit.</em></h2>
    <p class="layer-sub">It runs in your browser: each requirement is matched against Sahaj's real projects, roles and skills, every match cites where it comes from, and what is missing is said plainly. Nothing is sent anywhere and nothing is invented.</p>
  </header>
  <form class="fit-form" data-fit-form>
    <label class="sr" for="fit-jd">Job description</label>
    <textarea id="fit-jd" class="fit-jd" rows="8" maxlength="12000" placeholder="Paste the job description here: responsibilities, requirements, nice-to-haves…" data-fit-jd></textarea>
    <div class="fit-actions">
      <button class="btn shimmer" type="submit">Check the fit</button>
      <button class="btn btn-ghost" type="button" data-fit-sample>Try a sample</button>
      <span class="fit-status mono" data-fit-status role="status" aria-live="polite"></span>
    </div>
  </form>
  <div class="fit-out" data-fit-out hidden></div>
</section>`;
}

function contactSection() {
  return `<section class="layer contact" id="contact" data-layer="${LAYER.contact}" data-layer-name="Output head" aria-labelledby="contact-h">
  <p class="layer-tag mono" data-lt="Output">Layer ${L2(LAYER.contact)} · Output</p>
  <h2 id="contact-h" class="contact-title">The next token<br><em>is yours.</em></h2>
  <p class="contact-lede">Open to AI/ML internships, research collaborations and roles after May 2027. Email is the fastest way to reach me.</p>
  <a class="contact-mail shimmer" href="mailto:${profile.email}">${esc(profile.email)}</a>
  <ul class="contact-links mono">${profile.links.map((l) => `<li><a class="tok-link" href="${l.url}" rel="me noopener">${esc(l.label)} <span class="muted">${esc(l.handle)}</span></a></li>`).join('')}</ul>
</section>`;
}

function railNav() {
  return `<nav class="rail" aria-label="Layer progress" data-rail>
  <p class="rail-label mono"><span data-rail-n>Layer 01</span> <span class="muted">/ ${LAYERS}</span></p>
  <ol class="rail-ticks">${Array.from({ length: LAYERS }, (_, i) => `<li><a href="#" data-rail-tick="${i + 1}" aria-label="Go to layer ${i + 1}"></a></li>`).join('')}</ol>
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
${productsSection()}
${skillsSection()}
${experienceSection()}
${evalSection()}
${fitSection()}
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
    <p class="solo-dist mono" aria-hidden="true"><span style="--p:.31">/</span><span style="--p:.24">/#work</span><span style="--p:.19">/#contact</span><span style="--p:.14">/#map</span><span style="--p:.12">/resume/</span></p>
    <p class="solo-actions"><a class="btn shimmer" href="/">Back to the home page</a> <button class="btn btn-ghost" type="button" data-ask-open>Ask my portfolio</button></p>`,
  });
}

// /blog/ and /blogs/ are real pages (a static host needs one) that forward to the blog at once, keeping the query
// and #hash. Deeper paths (/blogs/some-post/) reach 404.html, where fresh.js forwards them the same way.
function blogRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Blog · Sahaj Saliya</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${BLOG}/">
<meta http-equiv="refresh" content="0; url=${BLOG}/">
<script>location.replace('${BLOG}/' + location.search + location.hash);</script>
</head>
<body><p><a href="${BLOG}/">Go to the blog at blog.sahaj.si</a></p></body>
</html>
`;
}

function sitemap() {
  const urls = ['/', '/resume/'];
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
  'blogs/index.html': blogRedirect(),
  'sitemap.xml': sitemap(),
  'robots.txt': `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`,
  'site.webmanifest': JSON.stringify({ name: 'Sahaj Saliya', short_name: 'Sahaj', start_url: '/', display: 'standalone', background_color: '#171715', theme_color: '#171715', icons: [{ src: '/assets/brand/icon-192.png?v=4', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/assets/brand/icon-512.png?v=4', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/assets/brand/icon-maskable-512.png?v=4', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }, null, 2) + '\n',
  'resume/index.html': renderResume({ profile, projects, products, gwr, harvard, site: SITE }),
  'blog/index.html': blogRedirect(),
  'data/fit.json': fitData(),
  'data/site.json': { blog: `${BLOG}/` },
};

let changed = 0;
for (const [file, content] of Object.entries(outputs)) if (write(file, content)) { changed++; console.log('wrote', file); }
if (write('data/build.json', manifest())) { changed++; console.log('wrote data/build.json'); }
noSourceMaps();
console.log(`build done, ${changed} file(s) changed`);

// Facts for Recruiter mode: only what is already in content/, plus a vocabulary of every term in it (skills,
// project stacks, role tags) with where each one comes from. Aliases are other ways a job description says it.
function fitData() {
  const ALIAS = {
    'LLMs': ['llm', 'large language model', 'large language models', 'genai', 'generative ai', 'gpt'], 'Machine Learning': ['ml', 'machine-learning'],
    'Deep Learning': ['dl', 'neural network', 'neural networks'], 'Computer Vision': ['cv', 'vision', 'image recognition', 'object detection'],
    'NLP': ['natural language processing', 'nlu', 'text mining'], 'Reinforcement Learning': ['rl', 'ppo'], 'RAG': ['retrieval augmented generation', 'retrieval-augmented generation', 'vector search', 'semantic search'],
    'Multi-Agent Orchestration': ['agents', 'agentic', 'ai agents', 'multi-agent', 'agent'], 'Tool Calling': ['function calling', 'tool use'],
    'Kubernetes': ['k8s'], 'PostgreSQL': ['postgres'], 'scikit-learn': ['sklearn'], 'Hugging Face Spaces': ['hugging face', 'huggingface'],
    'GitHub Actions': ['ci/cd', 'ci cd', 'continuous integration'], 'MLflow': ['experiment tracking', 'track experiments', 'mlops'], 'RAGAS': ['evaluation', 'evaluation sets', 'evals', 'llm evaluation'], 'Docker': ['containers', 'containerization'],
    'AWS Bedrock': ['aws', 'amazon bedrock', 'bedrock'], 'Transformers': ['transformer', 'transformer models', 'bert'], 'FastAPI': ['rest api', 'apis', 'api development'],
    'Data Structures & Algorithms': ['data structures', 'algorithms', 'dsa'], 'OOP': ['object oriented', 'object-oriented'], 'Linux / Windows administration': ['linux'],
    'Qdrant': ['vector database', 'vector db'], 'ChromaDB': ['chroma'], 'OCR': ['optical character recognition'], 'SHAP': ['explainability', 'explainable ai', 'xai'],
  };
  const terms = new Map();
  const add = (t, src) => { const k = t.toLowerCase(); if (!terms.has(k)) terms.set(k, { t, aliases: ALIAS[t] || [], src: [] }); const e = terms.get(k); if (!e.src.some((x) => x.url === src.url)) e.src.push(src); };
  for (const g of profile.skills) for (const s of g.items) add(s, { label: `${g.group} skills`, url: '#skills' });
  for (const p of portfolioAll) for (const s of p.stack) add(s, { label: p.name, url: `#p-${p.id}` });
  for (const r of profile.experience) for (const s of r.tags) add(s, { label: `${r.role} · ${r.org}`, url: `#x-${r.id}` });
  const first = (s) => (String(s).match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
  return {
    name: profile.name, tagline: profile.tagline, email: profile.email, site: SITE, location: profile.location,
    links: profile.links.map((l) => ({ label: l.label, url: l.url })),
    education: profile.education,
    terms: [...terms.values()],
    projects: portfolioAll.map((p) => ({ id: p.id, name: p.name, kind: p.kind, year: p.year, metric: p.metric, stack: p.stack, summary: `${first(p.problem)} ${first(p.approach)}`, url: `#p-${p.id}`, repo: projectUrl(p) })),
    experience: profile.experience.map((r) => ({ id: r.id, role: r.role, org: r.org, kind: r.kind, when: fmtRange(r.start, r.end), points: r.points, url: `#x-${r.id}` })),
    certifications: profile.certifications,
    programs: harvardFit(),
    achievement: `${gwr.title} · ${gwr.year}`,
  };
}

// Recruiter mode evidence from the Harvard ManageMentor programs: which job-description words each program can be
// cited for. They count as a partial match at most (a short program, not experience) and are labelled that way.
function harvardFit() {
  const WORDS = {
    'team-management': ['leadership', 'lead a team', 'leading teams', 'team lead', 'team management', 'people management', 'manage a team', 'managing teams', 'mentoring', 'mentor'],
    'project-management': ['project management', 'manage projects', 'managing projects', 'project planning', 'deliver projects', 'delivery', 'milestones', 'stakeholders'],
    'time-management': ['time management', 'prioritization', 'prioritisation', 'prioritize', 'prioritise', 'deadlines', 'multitasking', 'multi-task'],
    'writing-skills': ['communication', 'communicate', 'written communication', 'writing', 'technical writing', 'documentation', 'communication skills'],
    'negotiating': ['negotiation', 'negotiating', 'negotiate'],
    'strategic-thinking': ['strategic thinking', 'strategic', 'strategy'],
    'strategy-planning-and-execution': ['strategy', 'strategic planning', 'execution', 'roadmap', 'planning and execution'],
    'marketing-essentials': ['marketing', 'go-to-market', 'go to market', 'product marketing'],
    'leading-with-generative-ai': ['ai strategy', 'ai adoption', 'ai leadership', 'leading ai', 'genai adoption', 'generative ai strategy'],
  };
  return harvard.map((p) => ({ program: p.program, month: fmtMonth(p.month), url: '#adapters', words: WORDS[p.slug] || [p.program.toLowerCase()] }));
}

// Build manifest: the source commit plus a SHA-256 of every data file, so the footer can check that the data it is
// served matches this build. The time only moves when the commit or a hash changes, so a quiet rebuild writes nothing.
function manifest() {
  const files = Object.fromEntries(readdirSync(path('data')).filter((f) => f.endsWith('.json') && f !== 'build.json').sort().map((f) => {
    const buf = readFileSync(path(`data/${f}`));
    return [`/data/${f}`, { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length }];
  }));
  const prev = readJSON('data/build.json', {});
  const same = prev.sha === BUILD_SHA && JSON.stringify(prev.files) === JSON.stringify(files);
  return { sha: BUILD_SHA, repo: REPO, built_at: same ? prev.built_at : new Date().toISOString(), files };
}

// Production ships readable sources and no source maps; refuse to build if one ever appears.
function noSourceMaps() {
  const bad = [];
  const walk = (dir) => readdirSync(path(dir), { withFileTypes: true }).forEach((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return walk(rel);
    if (e.name.endsWith('.map') || (/\.(js|css)$/.test(e.name) && /sourceMappingURL=/.test(readFileSync(path(rel), 'utf8')))) bad.push(rel);
  });
  walk('assets');
  if (bad.length) throw new Error(`source maps must not ship: ${bad.join(', ')}`);
}
