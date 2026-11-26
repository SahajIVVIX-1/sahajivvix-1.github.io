// Agent tools for "Ask my portfolio": the chatbot can act on the page, not only answer. Every tool works on this
// page only (scroll, highlight, theme, clipboard); none of them sends anything anywhere. Arguments are validated
// here, whoever planned the call (the rule-based planner or the local LLM).
import { ORIGIN } from '../origin.js';

const NS = 'http://www.w3.org/2000/svg';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isHome = () => location.pathname === '/' || location.pathname === '/index.html' || /^\/ip=/.test(location.pathname);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ID = /^#[a-z][a-z0-9-]{0,60}$/;

// Sections the agent may take the visitor to: [name, the words people use for them].
export const SECTIONS = {
  '#top': ['the top of the page', 'home top intro start'],
  '#about': ['About', 'about bio background education'],
  '#map': ['the embedding map', 'map embedding latent'],
  '#work': ['Work (model cards)', 'work projects model cards'],
  '#products': ['Products', 'products shipped apps tools'],
  '#skills': ['Skills', 'skills stack parameters'],
  '#experience': ['Experience', 'experience training internships jobs'],
  '#certs': ['Certifications and evaluation', 'certifications certificates evaluation github stats'],
  '#guinness': ['the Guinness World Records entry', 'guinness world record'],
  '#adapters': ['the Harvard ManageMentor adapters', 'harvard managementor adapters badges'],
  '#contact': ['Contact', 'contact email hire reach'],
};

export function createTools({ projects, onPhoneAction }) {
  const byId = new Map(projects.map((p) => [p.id, p]));
  let layer = null;

  const target = (sel) => {
    if (typeof sel !== 'string' || !ID.test(sel)) throw new Error(`not a page anchor: ${sel}`);
    const el = document.querySelector(sel);
    if (!el) throw new Error(`${sel} is not on this page`);
    return el;
  };
  const settle = () => new Promise((r) => {
    let done = false;
    const end = () => { if (!done) { done = true; removeEventListener('scrollend', end); r(); } };
    addEventListener('scrollend', end, { once: true });
    setTimeout(end, reduced() ? 50 : 900);
  });
  // Sections above the target can still change height while the page scrolls past them (lazy map, scroll effects),
  // so the target is re-aimed until it lands under the header.
  const scroll = async (el) => {
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    onPhoneAction?.();
    await settle();
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    for (let i = 0; i < 3 && Math.abs(el.getBoundingClientRect().top - pad) > 24; i++) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      await wait(120);
    }
  };
  const label = (el) => SECTIONS[`#${el.id}`]?.[0] || (el.querySelector('h2, h3')?.textContent || el.getAttribute('aria-label') || el.id).trim();

  // The attention-line effect: an arc from the chat trace (where the agent "attended") to the element it acted on.
  function arc(from, el) {
    if (!layer) {
      layer = document.createElementNS(NS, 'svg');
      layer.setAttribute('class', 'attn-layer agent-layer');
      layer.setAttribute('aria-hidden', 'true');
      document.body.append(layer);
    }
    layer.replaceChildren();
    const t = el.getBoundingClientRect();
    const f = from?.isConnected && from.getBoundingClientRect();
    const tx = t.left + Math.min(t.width / 2, 160), ty = t.top + Math.min(24, t.height / 2);
    const fx = f && f.width ? f.left : innerWidth - 24, fy = f && f.width ? f.top + f.height / 2 : innerHeight - 40;
    const dist = Math.hypot(fx - tx, fy - ty), lift = Math.min(180, 30 + dist * 0.25);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', `M${fx},${fy} Q${(fx + tx) / 2},${Math.min(fy, ty) - lift} ${tx},${ty}`);
    path.setAttribute('stroke-width', '2');
    path.style.setProperty('--len', String(Math.ceil(dist * 1.4 + lift)));
    if (!reduced()) path.classList.add('draw');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(tx)); dot.setAttribute('cy', String(ty)); dot.setAttribute('r', '4');
    layer.append(path, dot);
    clearTimeout(arc.t);
    arc.t = setTimeout(() => layer.replaceChildren(), 2600);
  }

  const glow = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  const tools = {
    scroll_to: {
      args: ['selector'],
      doc: 'scroll_to(selector): scroll to a section or card, e.g. "#work", "#p-crohnsight"',
      async run({ selector }) { const el = target(selector); await scroll(el); return `at ${label(el)}`; },
    },
    highlight: {
      args: ['selector'],
      doc: 'highlight(selector): draw an attention line to an element and outline it',
      async run({ selector }, ctx) { const el = target(selector); arc(ctx.from, el); glow(el, 'agent-hl', 2600); return `highlighted ${label(el)}`; },
    },
    open_project: {
      args: ['id'],
      doc: `open_project(id): show a project's model card. ids: ${projects.map((p) => p.id).join(', ')}`,
      async run({ id }, ctx) {
        const p = byId.get(id);
        if (!p) throw new Error(`unknown project ${id}`);
        if (!isHome()) { location.href = `/#p-${id}`; return 'opening the home page'; }
        const card = target(`#p-${id}`);
        if (card.getBoundingClientRect().top > innerHeight || card.getBoundingClientRect().bottom < 0) await scroll(card);
        glow(card, 'is-spot', 3200);
        arc(ctx.from, card.querySelector('.card-title') || card);
        return `model card ${p.name} open`;
      },
    },
    filter_map: {
      args: ['query'],
      doc: 'filter_map(query): search the embedding map and light up the matching points',
      async run({ query }) {
        const q = String(query || '').trim().slice(0, 120);
        if (!q) throw new Error('empty query');
        const el = target('#map');
        await scroll(el);
        for (let i = 0; i < 40 && !window.__map; i++) await wait(150);
        if (!window.__map) throw new Error('map not ready');
        const input = el.querySelector('.map-q');
        if (input) input.value = q;
        await window.__map.ask(q);
        const hits = window.__map.state().query?.hits || [];
        return hits.length ? `${hits.length} points lit, top: ${hits[0].title}` : 'map filtered';
      },
    },
    switch_theme: {
      args: ['mode'],
      doc: 'switch_theme(mode): "light", "dark" or "auto"',
      async run({ mode }) {
        if (!['light', 'dark', 'auto'].includes(mode)) throw new Error(`unknown theme ${mode}`);
        const btn = document.querySelector('[data-theme-toggle]');
        for (let i = 0; i < 3 && btn && btn.dataset.themeState !== mode; i++) btn.click();
        return `theme ${mode}`;
      },
    },
    open_certificate: {
      args: [],
      doc: 'open_certificate(): open the Guinness World Records certificate',
      async run() {
        const btn = document.querySelector('[data-gwr-open]');
        if (!btn) { if (!isHome()) { location.href = '/#guinness'; return 'opening the home page'; } throw new Error('certificate not on this page'); }
        await scroll(btn.closest('section, article') || btn);
        btn.click();
        return 'certificate open';
      },
    },
    open_adapters: {
      args: ['program'],
      opt: ['program'],
      doc: 'open_adapters(program?): show the Harvard ManageMentor completion badges ("adapters"); with a program name, also open its certificate',
      async run({ program }, ctx) {
        if (!isHome()) { location.href = '/#adapters'; return 'opening the home page'; }
        const el = target('#adapters');
        await scroll(el);
        const api = await window.__adapters?.();
        if (!api) throw new Error('adapters not ready');
        const p = program ? api.find(program) : null;
        if (program && !p) throw new Error(`no Harvard ManageMentor program called ${program}`);
        if (p) { api.open(p.slug); return `certificate open: ${p.program}`; }
        // the Recruiter view shows the plain list instead of the rack
        const rack = el.querySelector('.ad-rack');
        const shown = rack?.offsetParent ? rack : el;
        arc(ctx.from, shown);
        glow(shown, 'agent-hl', 2600);
        return 'adapter rack in view';
      },
    },
    copy_link: {
      args: ['selector'],
      doc: 'copy_link(selector): copy a link to a section or card to the clipboard',
      async run({ selector }) {
        const hash = selector && ID.test(selector) ? selector : '';
        const url = `${ORIGIN}/${hash}`;
        await navigator.clipboard.writeText(url);
        return `copied ${url.replace(/^https:\/\//, '')}`;
      },
    },
  };

  // Validates one planned call; returns null if it is not a real tool with the right arguments.
  function check(call) {
    const t = call && tools[call.name];
    if (!t) return null;
    const args = call.args && typeof call.args === 'object' ? call.args : {};
    if (t.args.some((a) => a !== 'selector' && !(t.opt || []).includes(a) && args[a] == null)) return null;
    if (call.name === 'scroll_to' || call.name === 'highlight') { if (!ID.test(args.selector || '')) return null; }
    return { name: call.name, args: Object.fromEntries(t.args.filter((a) => args[a] != null).map((a) => [a, String(args[a])])) };
  }

  return { tools, check, docs: Object.values(tools).map((t) => t.doc) };
}
