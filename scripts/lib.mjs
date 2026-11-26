// Shared helpers for the build scripts. Paths are resolved from the repo root.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const path = (...p) => join(ROOT, ...p);

// Where a project's code lives: its public GitHub repo, or the "link" in projects.json (a competition page) when the
// repo is private or does not exist.
export const projectUrl = (p) => p.link?.url || p.links?.[0]?.url || `https://github.com/SahajIVVIX-1/${p.repo}`;
export const projectCodeLabel = (p) => (p.link ? p.link.label : 'Code & README on GitHub');

// Projects (content/projects.json) are the research and competition work; products (content/products.json) are the
// things Sahaj shipped. Both are model-card-shaped and share one id space ("p-<id>" anchors), so the data pipelines
// (knowledge base, Q&A bank, map, heat-maps, CLIP) read `all`; only the page renders them in two sections.
export function loadPortfolio() {
  const projects = readJSON('content/projects.json', []);
  const products = readJSON('content/products.json', []).map((p) => ({ ...p, product: true }));
  return { projects, products, all: [...projects, ...products] };
}

export function readJSON(rel, fallback = null) {
  const p = path(rel);
  if (!existsSync(p)) return fallback;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fallback; }
}

export function readText(rel, fallback = '') {
  const p = path(rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : fallback;
}

// Writes only when the content changed, so the hourly job commits nothing on quiet hours.
export function write(rel, content) {
  const p = path(rel);
  mkdirSync(dirname(p), { recursive: true });
  const next = typeof content === 'string' ? content : JSON.stringify(content, null, 0) + '\n';
  if (existsSync(p) && readFileSync(p, 'utf8') === next) return false;
  writeFileSync(p, next);
  return true;
}

export const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtMonth(ym) {
  if (!ym) return 'Present';
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export const fmtRange = (a, b) => (a === b ? fmtMonth(a) : `${fmtMonth(a)} – ${fmtMonth(b)}`);

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Words that carry no meaning for attention links or keyword scoring.
export const STOP = new Set(`a an the and or but if then else of to in on at by for with from into onto over under as is are was were be been being it its this that these those he his him she her they them their we our you your i me my not no nor so than too very can will just do does did done have has had having which who whom whose what when where why how all any both each few more most other some such only own same also via per vs up down out off about after before again further once here there through during while above below between because until against among across within without upon around use used using uses one two three four five six seven eight nine ten every like new make made gets get got lets let see e.g i.e etc`.split(/\s+/));

export function tokenizeWords(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#.-]*[a-z0-9+#]|[a-z]/g) || []);
}

// Tiny front-matter + section parser for content/*.md files.
export function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: src.slice(m[0].length) };
}
