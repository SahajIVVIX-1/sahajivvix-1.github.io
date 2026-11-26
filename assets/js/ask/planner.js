// Agent planner: turns a request into tool calls. The local LLM plans when it is loaded (its JSON is validated
// against the tool list); otherwise, or when its plan is not valid, rule-based intents do. Project choice is
// always grounded in retrieval over the model cards (engine.rankProjects), never guessed.
import { SECTIONS } from './tools.js';

// Questions that ask the page to do something. Plain questions ("what is X?") are only answered.
export const ACTION = /\b(show|open|take me|go to|jump|scroll|highlight|point|find|filter|switch|turn|toggle|enable|copy|share|best|top|strongest|favou?rite)\b|\b(dark|light) (mode|theme)\b/i;

// Short forms people type, expanded before ranking projects.
const ALIASES = [
  [/\bcv\b/gi, 'computer vision images'], [/\bnlp\b/gi, 'natural language'], [/\brl\b/gi, 'reinforcement learning'],
  [/\bxai\b/gi, 'explainable'], [/\bgans?\b/gi, 'generative adversarial'], [/\bllms?\b/gi, 'language model agents'],
  [/\bmed(ical)?\b/gi, 'medical healthcare'], [/\bml ?ops\b/gi, 'mlops deployment'],
];
const expand = (q) => ALIASES.reduce((s, [re, w]) => s.replace(re, (m) => `${m} ${w}`), q);

// "Best" is not similarity: among the projects that match the topic about as well as the top one, take the one
// Sahaj lists first. Without "best", the closest match wins.
export const BEST = /\b(best|top|strongest|favou?rite|flagship)\b/i;
export const NEAR = 0.08;
function pickBest(s, ranked) {
  if (!ranked.length || !BEST.test(s)) return ranked[0];
  return ranked.filter((p) => p.score >= ranked[0].score - NEAR).sort((a, b) => a.order - b.order)[0];
}

// Project names and the words that name them directly.
const NAMED = [
  ['crohnsight', /crohn/i], ['agentic-rag', /\b(agentic|rag|orchestrator)\b/i], ['openenv', /open ?env|data.?cleaning/i],
  ['student-xai', /student|explainable/i], ['dcgan', /dcgan|\bgan\b/i],
  ['sleep-llm', /sleep|consolidat|dream|forgetting|continual/i], ['quantum-compilation', /quantum|qubit|toffoli|invsqrt|\bdqi\b/i],
  ['santa-elf-calculator', /santa|\belf\b|elf calculator/i],
];

export async function planRules(q, eng) {
  const s = q.toLowerCase();
  const steps = [];
  let focus = null, ranked = null;

  const theme = /\b(dark|night)\b/.test(s) ? 'dark' : /\blight\b/.test(s) ? 'light' : /\b(auto|system)\b/.test(s) ? 'auto' : null;
  if (theme && /\b(mode|theme)\b/.test(s)) return { steps: [{ name: 'switch_theme', args: { mode: theme } }] };

  // Harvard ManageMentor badges ("adapters"): the rack, or one program's certificate when it is named
  if (/harvard|managementor|\badapters?\b/.test(s) && /\b(show|open|see|view|where|take me|go to|scroll|jump)\b/.test(s)) {
    let names = [];
    try { names = JSON.parse(document.querySelector('[data-ad-data]')?.textContent || '[]').map((d) => d.program); } catch { /* no rack on this page */ }
    const program = names.find((n) => s.includes(n.toLowerCase())) || (/\bgen(erative)? ?ai\b/.test(s) ? 'Leading with Generative AI' : '');
    return { steps: [{ name: 'open_adapters', args: { program } }] };
  }

  if (/certificate|guinness/.test(s) && /\b(show|open|see|view)\b/.test(s)) return { steps: [{ name: 'open_certificate', args: {} }] };

  const named = NAMED.find(([, re]) => re.test(s))?.[0];
  const section = Object.entries(SECTIONS).find(([, [, words]]) => words.split(' ').some((w) => new RegExp(`\\b${w}\\b`).test(s)))?.[0];

  if (/\bcopy\b|\bshare\b|\blink to\b/.test(s) && /\blink|url|share\b/.test(s)) {
    return { steps: [{ name: 'copy_link', args: { selector: named ? `#p-${named}` : section && section !== '#top' ? section : '' } }] };
  }

  if (/\bmap\b/.test(s) && /\b(show|filter|find|search|highlight|where|light)\b/.test(s)) {
    const query = s.replace(/\b(on|in|the|map|show|me|filter|find|search|highlight|where|is|are|light up|please|embedding)\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (query) return { steps: [{ name: 'filter_map', args: { query } }] };
  }

  const wantsProject = named || /\b(project|projects|work|card|model card)\b/.test(s);
  if (wantsProject && ACTION.test(s)) {
    ranked = await eng.rankProjects(expand(q));
    focus = named || pickBest(s, ranked)?.id;
    if (focus) {
      steps.push({ name: 'search_projects', args: { query: q }, ranked });
      steps.push({ name: 'scroll_to', args: { selector: `#p-${focus}` } }, { name: 'highlight', args: { selector: `#p-${focus}` } }, { name: 'open_project', args: { id: focus } });
      return { steps, focus, ranked, best: !named && BEST.test(s) };
    }
  }

  if (section && /\b(show|open|go to|take me|jump|scroll|where)\b/.test(s)) {
    return { steps: [{ name: 'scroll_to', args: { selector: section } }, { name: 'highlight', args: { selector: section } }] };
  }
  return { steps: [] };
}

// The local LLM plans with the tool list and the retrieval ranking in its prompt. Anything that is not a valid
// call is dropped; an empty or broken plan falls back to the rules.
export async function planLLM(q, eng, llm, check, docs) {
  const all = await eng.rankProjects(expand(q));
  // Same "best" rule as the rules planner: the recommended project goes first in the list the model sees.
  const pick = pickBest(q.toLowerCase(), all);
  const ranked = pick ? [pick, ...all.filter((p) => p !== pick)] : all;
  const system = `You operate Sahaj Saliya's portfolio web page with tools. Reply with JSON only, no prose: {"steps":[{"name":"<tool>","args":{...}}]}. At most 4 steps. If the request needs no action on the page, reply {"steps":[]}.
Tools:
${docs.join('\n')}
Sections: ${Object.keys(SECTIONS).join(', ')}. A project card is "#p-<id>".
Projects ranked by retrieval for this request (pick the first unless the visitor names another): ${ranked.map((p) => `${p.id} (${p.name}, ${p.score.toFixed(2)})`).join('; ')}.
To show a project: scroll_to "#p-<id>", then highlight "#p-<id>", then open_project <id>.`;
  let raw = '';
  try { raw = await llm.complete([{ role: 'system', content: system }, { role: 'user', content: q }], { max_tokens: 160 }); } catch { return null; }
  let plan;
  try { plan = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { return null; }
  const steps = (Array.isArray(plan?.steps) ? plan.steps : []).slice(0, 4).map(check).filter(Boolean);
  if (!steps.length) return null;
  const focus = steps.find((x) => x.name === 'open_project')?.args.id || null;
  if (focus) steps.unshift({ name: 'search_projects', args: { query: q }, ranked: all });
  return { steps, focus, ranked: all, best: focus === pick?.id && BEST.test(q), by: 'llm' };
}
