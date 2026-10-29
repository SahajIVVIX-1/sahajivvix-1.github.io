// Fetches public GitHub data and the featured READMEs into data/.
// On any failure the previous files are kept, so the site always has the last good data.
import { readJSON, write } from './lib.mjs';

const USER = 'SahajIVVIX-1';
const API = 'https://api.github.com';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'info.sahaj.si-builder',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function gh(url, raw = false) {
  const res = await fetch(url.startsWith('http') ? url : API + url, { headers: raw ? { ...headers, Accept: 'application/vnd.github.raw' } : headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return raw ? res.text() : res.json();
}

const projects = readJSON('content/projects.json');
const previous = readJSON('data/github.json');

try {
  const user = await gh(`/users/${USER}`);
  const repos = (await gh(`/users/${USER}/repos?per_page=100&sort=pushed`)).filter((r) => !r.archived);
  const languages = {};
  for (const r of repos) {
    if (r.fork && !projects.some((p) => p.repo === r.name)) continue;
    try {
      const l = await gh(`/repos/${USER}/${r.name}/languages`);
      // Notebooks inflate byte counts enormously; count them at a tenth so the bar reflects real code.
      for (const [k, v] of Object.entries(l)) languages[k] = (languages[k] || 0) + (k === 'Jupyter Notebook' ? v / 10 : v);
    } catch { /* one repo failing should not drop the rest */ }
  }
  let events = [];
  try {
    const raw = (await gh(`/users/${USER}/events/public?per_page=30`))
      .filter((e) => ['PushEvent', 'CreateEvent', 'ReleaseEvent', 'PullRequestEvent'].includes(e.type))
      .slice(0, 30);
    const known = new Map((previous?.events || []).filter((e) => e.head).map((e) => [e.head, e.commits]));
    for (const e of raw) {
      const ev = { type: e.type, repo: e.repo.name.split('/')[1], at: e.created_at };
      if (e.type === 'PushEvent') {
        // The events API no longer reports commit counts, so ask the compare endpoint once per push
        // and remember the answer (keyed by head sha) so hourly runs stay cheap.
        ev.head = e.payload.head;
        const before = e.payload.before;
        if (known.has(ev.head)) ev.commits = known.get(ev.head);
        else if (!before || /^0+$/.test(before)) ev.commits = null; // new branch: count unknown
        else {
          try { ev.commits = (await gh(`/repos/${e.repo.name}/compare/${before}...${ev.head}`)).total_commits; }
          catch { ev.commits = null; }
        }
      }
      events.push(ev);
    }
  } catch { events = previous?.events || []; }

  // The contribution calendar (last 12 months): GraphQL with a token (the hourly Action), otherwise the public
  // calendar page. Kept from the previous run if both fail.
  let calendar = previous?.calendar || [];
  try {
    if (process.env.GITHUB_TOKEN) {
      const q = `query { user(login: "${USER}") { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`;
      const res = await fetch(`${API}/graphql`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      const j = await res.json();
      calendar = j.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => [d.date, d.contributionCount]));
    } else {
      const html = await (await fetch(`https://github.com/users/${USER}/contributions`, { headers: { 'User-Agent': headers['User-Agent'] } })).text();
      const tips = Object.fromEntries([...html.matchAll(/<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)</g)].map((m) => [m[1], m[2]]));
      const days = [...html.matchAll(/data-date="(\d{4}-\d\d-\d\d)"[^>]*id="(contribution-day-component-[\d-]+)"/g)]
        .map(([, d, id]) => { const t = tips[id] || ''; const n = /^No /.test(t) ? 0 : parseInt(t, 10); return [d, Number.isFinite(n) ? n : 0]; });
      if (days.length > 300) calendar = days.sort((a, b) => a[0].localeCompare(b[0]));
    }
  } catch { /* keep the previous calendar */ }
  // Issues and pull requests across his public repos (search API), for the training log's "loss".
  let work = previous?.work || null;
  try {
    const count = async (q) => (await gh(`/search/issues?per_page=1&q=${encodeURIComponent(`user:${USER} ${q}`)}`)).total_count;
    work = { issuesOpen: await count('is:issue is:open'), issuesClosed: await count('is:issue is:closed'), prsOpen: await count('is:pr is:open'), prsMerged: await count('is:pr is:merged') };
  } catch { /* keep the previous counts */ }

  const slim = repos.map((r) => ({
    name: r.name,
    description: r.description || '',
    url: r.html_url,
    language: r.language,
    stars: r.stargazers_count,
    forks: r.forks_count,
    topics: r.topics || [],
    fork: r.fork,
    created_at: r.created_at,
    pushed_at: r.pushed_at,
  }));

  const data = {
    fetched_at: new Date().toISOString(),
    user: { login: user.login, public_repos: user.public_repos, followers: user.followers, bio: user.bio || '', since: user.created_at },
    totals: { stars: slim.reduce((s, r) => s + r.stars, 0), repos: slim.length },
    languages: Object.fromEntries(Object.entries(languages).map(([k, v]) => [k, Math.round(v)])),
    repos: slim,
    events,
    calendar,
    work,
  };

  // Keep fetched_at stable when nothing else changed, so quiet hours produce no commit.
  if (previous) {
    const strip = ({ fetched_at, ...rest }) => JSON.stringify(rest);
    if (strip(previous) === strip(data)) data.fetched_at = previous.fetched_at;
  }
  write('data/github.json', JSON.stringify(data, null, 1) + '\n');

  for (const p of projects) {
    try {
      const md = await gh(`/repos/${USER}/${p.repo}/readme`, true);
      write(`data/readmes/${p.repo}.md`, md);
    } catch (e) { console.warn('README kept from last run:', p.repo, e.message); }
  }
  // READMEs of the other public repos feed the embedding map (they are not featured projects, just more of the work).
  // The profile repo (named like the user) is skipped. Capped so one huge README cannot dominate.
  const featured = new Set(projects.map((p) => p.repo));
  for (const r of slim) {
    if (featured.has(r.name) || r.name.toLowerCase() === USER.toLowerCase()) continue;
    try {
      const md = await gh(`/repos/${USER}/${r.name}/readme`, true);
      write(`data/readmes/${r.name}.md`, md.slice(0, 40000));
    } catch (e) { console.warn('no README for', r.name, '-', e.message); }
  }
  console.log(`github: ${slim.length} repos, ${Object.keys(languages).length} languages`);
} catch (e) {
  console.warn('GitHub fetch failed, keeping last good data:', e.message);
}
