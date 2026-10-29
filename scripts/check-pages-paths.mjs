// Guard against another repo taking over part of info.sahaj.si.
// Any repo of this account with GitHub Pages on and no domain of its own is served at info.sahaj.si/<repo-name>/,
// and it wins over a folder of the same name in this site. So a repo named "blog", "blogs", "resume", "assets",
// "data", ... with Pages on would replace that part of this site. This lists the account's Pages repos and fails
// (the deploy stops and GitHub emails the failure) when one of them uses a top-level path this site publishes.
// A repo with its own custom domain (for example blog.sahaj.si) is served only there, so it never collides.
// Usage: node scripts/check-pages-paths.mjs
import { execSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const USER = 'SahajIVVIX-1';
const SITE_REPO = 'sahajivvix-1.github.io';
// the top-level paths this site publishes (the same list scripts/deploy-pages.sh copies)
const PUBLISHED = ['404.html', 'assets', 'blogs', 'blog', 'resume', 'favicon.ico', 'index.html', 'robots.txt', 'site.webmanifest', 'sitemap.xml', 'data'];
const tracked = execSync(`git ls-tree --name-only HEAD -- ${PUBLISHED.join(' ')}`, { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
// GitHub Pages matches the repo segment without regard to case
const reserved = new Map([...tracked, 'CNAME', '.nojekyll'].map((p) => [p.toLowerCase(), p]));

const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'info.sahaj.si-builder', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
let repos;
try {
  const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`, { headers });
  if (!res.ok) throw new Error(`${res.status}`);
  repos = await res.json();
} catch (e) {
  // never block a deploy because GitHub's API is down; the next run checks again
  console.warn(`pages paths: could not list repos (${e.message}), skipping the check`);
  process.exit(0);
}

const clashes = [];
for (const r of repos.filter((x) => x.has_pages && x.name.toLowerCase() !== SITE_REPO)) {
  const hit = reserved.get(r.name.toLowerCase());
  let cname = null;
  try {
    const p = await fetch(`https://api.github.com/repos/${USER}/${r.name}/pages`, { headers });
    if (p.ok) cname = (await p.json()).cname;
  } catch { /* unknown: treat as no custom domain */ }
  const where = cname ? `https://${cname}/` : `https://info.sahaj.si/${r.name}/`;
  console.log(`pages: ${r.name.padEnd(28)} -> ${where}${hit && !cname ? '   CLASH' : ''}`);
  if (hit && !cname) clashes.push(`${r.name} (would replace info.sahaj.si/${hit}/)`);
}

if (clashes.length) {
  console.error(`\nThese repos publish over paths of info.sahaj.si: ${clashes.join(', ')}.`);
  console.error('Give that repo its own domain (Settings > Pages > Custom domain, e.g. blog.sahaj.si), rename it, or turn its Pages off.');
  process.exit(1);
}
console.log('pages paths: no repo overlaps info.sahaj.si');
