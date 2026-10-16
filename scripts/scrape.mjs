// Live data collector. Runs hourly in CI (see .github/workflows/deploy.yml).
//
// Every source is independent: if one fails, its last good snapshot is reused and
// marked "stale", so a flaky API never blanks the site. The previous snapshot comes
// from the deployed site (/data/live.json), so no data commits are needed.
import { writeFile, mkdir } from 'node:fs/promises';
import { http, readJSON, writeJSON, path } from './lib.mjs';

const profile = await readJSON(path('content/profile.json'));
const H = profile.handles;
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const PREV_URL = process.env.PREV_URL ?? 'https://info.sahaj.si/data/live.json';
const UA = 'Mozilla/5.0 (compatible; info.sahaj.si-sync/2.0; +https://info.sahaj.si)';

const gh = {
  'User-Agent': UA,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// Strip markdown/HTML to plain prose for the search index and the project map.
function plain(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/[#>*_`~|=-]{1,}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let prev = null;

const sources = {
  async github() {
    const featured = new Set(profile.featured.map((f) => f.repo.toLowerCase()));
    const skip = new Set([H.github.toLowerCase(), `${H.github}.github.io`.toLowerCase()]);
    const [user, list] = await Promise.all([
      http(`https://api.github.com/users/${H.github}`, { headers: gh }),
      http(`https://api.github.com/users/${H.github}/repos?per_page=100&sort=pushed`, { headers: gh }),
    ]);
    const keep = list.filter((r) => !r.private && !skip.has(r.name.toLowerCase()) && (!r.fork || featured.has(r.name.toLowerCase())));

    const repos = await Promise.all(keep.map(async (r) => {
      const [langs, readme] = await Promise.all([
        http(r.languages_url, { headers: gh, retries: 1 }).catch(() => ({})),
        http(`https://api.github.com/repos/${r.full_name}/readme`, { headers: { ...gh, Accept: 'application/vnd.github.raw' }, as: 'text', retries: 1 }).catch(() => ''),
      ]);
      return {
        name: r.name,
        url: r.html_url,
        homepage: r.homepage || null,
        description: r.description || '',
        topics: r.topics || [],
        language: r.language,
        languages: langs,
        stars: r.stargazers_count,
        forks: r.forks_count,
        fork: r.fork,
        archived: r.archived,
        created: r.created_at,
        pushed: r.pushed_at,
        readme: plain(readme).slice(0, 2400),
      };
    }));

    let contributions = null;
    if (TOKEN) {
      const q = `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
      const d = await http('https://api.github.com/graphql', {
        method: 'POST', headers: { ...gh, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, variables: { l: H.github } }),
      }).catch(() => null);
      const cal = d?.data?.user?.contributionsCollection?.contributionCalendar;
      if (cal) contributions = { total: cal.totalContributions, days: cal.weeks.flatMap((w) => w.contributionDays.map((x) => [x.date, x.contributionCount])) };
    }

    return {
      user: { name: user.name, bio: user.bio, followers: user.followers, following: user.following, publicRepos: user.public_repos, avatar: user.avatar_url, created: user.created_at },
      repos,
      // GraphQL needs a token; keep the last calendar rather than dropping the heatmap.
      contributions: contributions || prev?.github?.contributions || null,
    };
  },

  async leetcode() {
    const q = `query($u:String!){
      allQuestionsCount{difficulty count}
      matchedUser(username:$u){
        profile{ranking reputation}
        submitStatsGlobal{acSubmissionNum{difficulty count}}
        languageProblemCount{languageName problemsSolved}
        tagProblemCounts{advanced{tagName problemsSolved} intermediate{tagName problemsSolved} fundamental{tagName problemsSolved}}
      }
      userContestRanking(username:$u){rating attendedContestsCount topPercentage}
      recentAcSubmissionList(username:$u,limit:8){title titleSlug timestamp}
    }`;
    const d = await http('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': UA },
      body: JSON.stringify({ query: q, variables: { u: H.leetcode } }),
    });
    if (d.errors || !d.data?.matchedUser) throw new Error('LeetCode: ' + JSON.stringify(d.errors || 'no user'));
    const m = d.data.matchedUser;
    const by = (arr) => Object.fromEntries(arr.map((x) => [x.difficulty, x.count]));
    const t = m.tagProblemCounts || {};
    const tags = [...(t.advanced || []), ...(t.intermediate || []), ...(t.fundamental || [])]
      .sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 8).map((x) => [x.tagName, x.problemsSolved]);
    return {
      solved: by(m.submitStatsGlobal.acSubmissionNum),
      total: by(d.data.allQuestionsCount),
      ranking: m.profile.ranking,
      languages: m.languageProblemCount.sort((a, b) => b.problemsSolved - a.problemsSolved).map((x) => [x.languageName, x.problemsSolved]),
      tags,
      contest: d.data.userContestRanking ? { rating: Math.round(d.data.userContestRanking.rating), attended: d.data.userContestRanking.attendedContestsCount, top: d.data.userContestRanking.topPercentage } : null,
      recent: (d.data.recentAcSubmissionList || []).filter((x, i, a) => a.findIndex((y) => y.titleSlug === x.titleSlug) === i).slice(0, 5).map((x) => ({ title: x.title, slug: x.titleSlug, at: Number(x.timestamp) * 1000 })),
    };
  },

  // X has no free API. The public embed endpoint sometimes returns the header and recent posts.
  async x() {
    const html = await http(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${H.x}`, { as: 'text', headers: { 'User-Agent': UA } });
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) throw new Error('X: no embed data');
    const pp = JSON.parse(m[1]).props?.pageProps || {};
    const posts = (pp.timeline?.entries || [])
      .map((e) => e.content?.tweet).filter(Boolean)
      .slice(0, 4)
      .map((t) => ({ text: t.full_text || t.text, at: t.created_at, url: `https://x.com/${H.x}/status/${t.id_str}`, likes: t.favorite_count }));
    const u = pp.timeline?.entries?.[0]?.content?.tweet?.user;
    if (!posts.length && !u) throw new Error('X: embed returned no posts (API-gated)');
    return { posts, followers: u?.followers_count ?? null, bio: u?.description ?? null };
  },

  // LinkedIn serves bots HTTP 999. We still try the public profile (JSON-LD) so that if it
  // ever becomes reachable, headline/about flow in automatically. Otherwise: profile.json wins.
  async linkedin() {
    const html = await http(`https://www.linkedin.com/in/${H.linkedin}/`, {
      as: 'text', retries: 0,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'Accept-Language': 'en' },
    });
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => { try { return JSON.parse(x[1]); } catch { return null; } });
    const person = ld.flatMap((x) => x?.['@graph'] || [x]).find((x) => x?.['@type'] === 'Person');
    if (!person) throw new Error('LinkedIn: no public Person data (auth wall)');
    return { headline: person.jobTitle?.[0] || person.description || null, about: person.description || null, followers: person.interactionStatistic?.userInteractionCount ?? null };
  },

  // Optional: RESUME_URL (repo variable) pointing at a direct-download PDF, e.g. the same file
  // you feature on LinkedIn. When set, the deployed resume follows it automatically.
  async resume() {
    const url = process.env.RESUME_URL;
    if (!url) return { source: 'repo', note: 'RESUME_URL not set — using public/resume/Sahaj_Saliya_Resume.pdf' };
    const buf = await http(url, { as: 'buffer', headers: { 'User-Agent': UA } });
    if (buf.subarray(0, 4).toString() !== '%PDF') throw new Error('RESUME_URL did not return a PDF');
    await mkdir(path('data'), { recursive: true });
    await writeFile(path('data/resume.pdf'), buf);
    return { source: 'remote', bytes: buf.length };
  },
};

prev = (PREV_URL ? await http(PREV_URL, { retries: 1 }).catch(() => null) : null) || (await readJSON(path('data/live.json'), {}));
const out = { generatedAt: new Date().toISOString(), status: {} };
const only = process.argv.slice(2);

await Promise.all(Object.entries(sources).map(async ([name, fn]) => {
  if (only.length && !only.includes(name)) { out[name] = prev?.[name] ?? null; out.status[name] = prev?.status?.[name] ?? { state: 'skipped' }; return; }
  const t0 = Date.now();
  try {
    out[name] = await fn();
    out.status[name] = { state: 'ok', at: out.generatedAt, ms: Date.now() - t0 };
  } catch (e) {
    out[name] = prev?.[name] ?? null;
    out.status[name] = { state: out[name] ? 'stale' : 'unavailable', at: prev?.status?.[name]?.at ?? null, error: String(e.message || e).slice(0, 160) };
  }
  const s = out.status[name];
  console.log(`${s.state.padEnd(11)} ${name}${s.ms ? ` (${s.ms}ms)` : ''}${s.error ? ' — ' + s.error : ''}`);
}));

await writeJSON(path('data/live.json'), out);
console.log('wrote data/live.json');
