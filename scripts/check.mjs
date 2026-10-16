// Quality gate run in CI after every build. A failing check blocks the deploy,
// so a bad scrape or template change can never ship a broken page.
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { path } from './lib.mjs';

const D = path('dist/');
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const html = await readFile(D + 'index.html', 'utf8');
const gz = gzipSync(html).length;

for (const f of ['index.html', '404.html', 'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', 'llms.txt', 'profile.json', 'manifest.webmanifest', 'data/live.json', 'data/corpus.json', 'js/app.js', 'js/ask.js', 'resume/Sahaj_Saliya_Resume.pdf', 'img/og.jpg', 'build.json']) {
  ok(await stat(D + f).then(() => true, () => false), `missing dist/${f}`);
}

// Template leaks
for (const bad of ['undefined', 'NaN', '[object Object]', '${']) ok(!html.includes(`>${bad}<`) && !html.includes(`"${bad}"`) && !(bad === '${' && html.includes(bad)), `index.html contains "${bad}"`);

// Every in-page anchor points at a real id
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const [, h] of html.matchAll(/href="\/?#([^"]+)"/g)) ok(ids.has(h), `broken anchor #${h}`);

// SEO / a11y basics
ok(/<title>[^<]{20,}<\/title>/.test(html), 'title too short');
ok(/<meta name="description" content="[^"]{80,}"/.test(html), 'meta description too short');
ok((html.match(/<h1[\s>]/g) || []).length === 1, 'need exactly one <h1>');
ok(/<html lang="en"/.test(html), 'missing lang');
ok(!/<img(?![^>]*\balt=)[^>]*>/.test(html), 'img without alt');
ok(html.includes('application/ld+json'), 'missing JSON-LD');

// The email address must never be printed on the page.
ok(!/[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/i.test(html.replace(/<script[\s\S]*?<\/script>/g, '')), 'plain email address in HTML');

// Content sanity: live data present
const live = JSON.parse(await readFile(D + 'data/live.json', 'utf8'));
ok(live.github?.repos?.length > 0, 'no GitHub repos in live data');

// Budget: the whole page (CSS + inline SVG) must stay small over the wire.
ok(gz < 60 * 1024, `index.html is ${(gz / 1024).toFixed(1)} KB gzipped (budget 60 KB)`);

if (fails.length) {
  console.error('✗ checks failed:\n  - ' + fails.join('\n  - '));
  process.exit(1);
}
console.log(`✓ all checks passed · index.html ${(gz / 1024).toFixed(1)} KB gzipped · ${ids.size} ids`);
