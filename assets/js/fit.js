// Recruiter mode: paste a job description, get a match report built only from Sahaj's data (data/fit.json, the
// chatbot's knowledge chunks). Each requirement is matched two ways: exact terms (skills, project stacks, role tags,
// with a few aliases) and meaning (MiniLM embeddings, the chatbot's own model, loaded only when asked). Fit % is the
// share of requirements covered, counting partial matches as half; it is not a raw similarity. Requirements with no
// match are listed as gaps, never filled in. Everything runs in the browser; nothing is sent anywhere.
const SAMPLE = `Machine Learning Engineer (LLM / RAG)

What you'll do
- Build and ship retrieval-augmented generation (RAG) systems and LLM agents for internal knowledge tools
- Fine-tune and evaluate transformer models; design evaluation sets and track experiments
- Deploy models behind REST APIs with Docker and CI/CD

Requirements
- Strong Python and PyTorch
- Experience with LangChain or LangGraph and a vector database (Qdrant, Pinecone or similar)
- Solid understanding of machine learning and deep learning fundamentals
- 3+ years of industry experience building production ML systems
- Experience with Spark or large-scale data pipelines
- Bachelor's degree in Computer Science or a related field

Nice to have
- Computer vision experience
- Kubernetes and AWS`;

const CUE = /\b(experience|proficien|knowledge|familiar|skill|ability|able to|degree|years?|understanding|build|develop|design|deploy|implement|work(ing)? with|hands-on|strong|solid|expert|background|must|should|nice to have|plus|preferred|required)\b/i;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const re = (w) => new RegExp(`(^|[^a-z0-9+#])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z0-9+#])`, 'i');

export function initFit() {
  const root = document.querySelector('[data-fit]');
  if (!root) return;
  const form = root.querySelector('[data-fit-form]');
  const jd = root.querySelector('[data-fit-jd]');
  const status = root.querySelector('[data-fit-status]');
  const out = root.querySelector('[data-fit-out]');
  let facts = null, eng = null, last = null;

  root.querySelector('[data-fit-sample]').addEventListener('click', () => { jd.value = SAMPLE; jd.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = jd.value.trim();
    if (text.length < 40) { status.textContent = 'Paste a longer job description (a few requirements at least).'; return; }
    form.querySelector('button[type="submit"]').disabled = true;
    try { last = await analyse(text); render(last); } catch (err) { status.textContent = 'Something went wrong while matching. Please try again.'; console.warn('fit:', err); }
    form.querySelector('button[type="submit"]').disabled = false;
  });

  async function load() {
    if (!facts) { status.textContent = 'loading Sahaj\'s data…'; facts = await (await fetch('/data/fit.json')).json(); facts.terms.forEach((t) => { t.res = [t.t, ...t.aliases].map(re); }); }
    if (!eng) {
      status.textContent = 'loading the matching model (MiniLM, ≈23 MB, once)…';
      const { createEngine } = await import('./ask/engine.js');
      eng = await createEngine();
      await eng.loadEmbedder((p) => { if (p.status === 'progress' && p.progress != null) status.textContent = `loading the matching model… ${Math.round(p.progress)}%`; });
    }
  }

  // The requirement lines of a job description: bullets, list items and sentences that name a skill or ask for one.
  const HEADER = /^(what you('|’)ll do|what you will do|responsibilities|requirements|qualifications|minimum qualifications|preferred qualifications|nice to have|nice-to-have|bonus|about (us|the role|you)|who you are|benefits|perks|the role|your role|skills)\b/i;
  function requirements(text) {
    // the first line is usually the job title: it names the role, it is not a requirement
    const title = (text.split('\n').map((l) => l.trim()).find((l) => l.length > 3) || '').toLowerCase();
    const lines = text.replace(/\r/g, '').split(/\n|•|·|;|(?<=\.)\s+(?=[A-Z])/).map((l) => l.replace(/^\s*([-*–—]|\d+[.)])\s*/, '').trim());
    const seen = new Set(), outL = [];
    for (const l of lines) {
      if (l.length < 12 || l.length > 260 || /:$/.test(l) || l.toLowerCase() === title) continue;
      if (HEADER.test(l) && l.split(/\s+/).length <= 5) continue; // a section heading
      const known = facts.terms.some((t) => t.res.some((r) => r.test(l)));
      if (!known && !CUE.test(l)) continue;
      const k = l.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); outL.push(l);
      if (outL.length >= 24) break;
    }
    return outL;
  }

  async function analyse(text) {
    await load();
    const reqs = requirements(text);
    if (!reqs.length) throw new Error('no requirements found');
    status.textContent = `matching ${reqs.length} requirements against Sahaj's data…`;
    const chunks = eng.chunks.filter((c) => /^\/#(p|x)-/.test(c.url));
    const semantic = eng.semantic;
    const results = [];
    for (const r of reqs) {
      const terms = facts.terms.filter((t) => t.res.some((x) => x.test(r)));
      let best = null, v = null;
      if (semantic) {
        v = await eng.embed(r);
        for (const c of chunks) { let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * c.vec[i]; s /= 127; if (!best || s > best.s) best = { s, c }; }
      }
      const res = { text: r, terms, best, state: 'gap', note: '', vec: v };
      // facts that need the record, not a similarity: years of experience, degrees
      const yrs = r.match(/(\d+)\s*\+?\s*(years?|yrs)/i);
      if (yrs && /experience|industry|professional|production|working/i.test(r)) {
        res.state = 'gap';
        res.note = `Asks for ${yrs[1]}+ years. Sahaj is a B.Tech ICT student at PDEU (graduating ${facts.education.end.slice(0, 4)}) with a 3-month internship and 7 months of freelance work.`;
      } else if (/\b(bachelor|b\.?tech|b\.?e\.?|b\.?sc|undergraduate|degree)\b/i.test(r) && !/\b(master|m\.?s\.?c?|ph\.?d|doctorate)\b/i.test(r)) {
        res.state = 'covered'; res.note = `${facts.education.degree}, ${facts.education.school} (in progress, until ${facts.education.end.slice(0, 4)}).`;
      } else if (/\b(master|m\.?s\.?c?|ph\.?d|doctorate)\b/i.test(r) && !/\b(bachelor|b\.?tech|or equivalent)\b/i.test(r)) {
        res.state = 'gap'; res.note = `Asks for a postgraduate degree; Sahaj is completing a ${facts.education.degree}.`;
      } else if (terms.length || (best && best.s >= 0.5)) res.state = 'covered';
      else if (best && best.s >= 0.4) res.state = 'partial';
      results.push(res);
    }
    const n = results.length;
    const covered = results.filter((x) => x.state === 'covered').length, partial = results.filter((x) => x.state === 'partial').length;
    // projects: requirements whose terms come from the project, plus how close the requirement is to its chunks
    const projects = facts.projects.map((p) => {
      let score = 0; const why = new Set(), reqHit = [];
      for (const r of results) {
        const ts = r.terms.filter((t) => t.src.some((s) => s.url === p.url));
        ts.forEach((t) => why.add(t.t));
        let sim = 0;
        if (r.vec) for (const c of chunks) if (c.url === `/${p.url}`) { let s = 0; for (let i = 0; i < r.vec.length; i++) s += r.vec[i] * c.vec[i]; sim = Math.max(sim, s / 127); }
        const gain = ts.length + (sim >= 0.4 ? sim : 0);
        if (gain > 0) { score += gain; reqHit.push(r.text); }
      }
      return { ...p, score, why: [...why], req: reqHit[0] || '' };
    }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const role = (text.split('\n').map((l) => l.trim()).find((l) => l.length > 3) || 'the role').slice(0, 90);
    return { role, results, n, covered, partial, fit: Math.round(((covered + partial * 0.5) / n) * 100), projects, semantic };
  }

  function evidence(r) {
    // decided by the record (degree, years of experience): the fact alone, no similarity noise
    if (r.note) return esc(r.note);
    const bits = [];
    for (const t of r.terms.slice(0, 3)) bits.push(`<b>${esc(t.t)}</b> · ${t.src.slice(0, 2).map((s) => `<a href="${s.url}">${esc(s.label)}</a>`).join(', ')}`);
    if (!r.terms.length && r.best && r.state !== 'gap') bits.push(`closest: <a href="${r.best.c.url.slice(1)}">${esc(r.best.c.source || r.best.c.title)}</a> <span class="mono">(${r.best.s.toFixed(2)})</span>`);
    return bits.join(' · ') || 'No match in Sahaj\'s data.';
  }

  function render(a) {
    const mark = { covered: '✓', partial: '~', gap: '✗' };
    out.hidden = false;
    out.innerHTML = `
      <div class="fit-score">
        <p class="fit-pct"><span class="metric-val">${a.fit}%</span><span class="mono">fit for “${esc(a.role)}”</span></p>
        <p class="fit-sum mono">${a.covered} of ${a.n} requirements covered · ${a.partial} partly · ${a.n - a.covered - a.partial} not in his data · ${a.semantic ? 'meaning + exact terms' : 'exact terms only (model unavailable)'} · computed in your browser</p>
        <span class="fit-bar" aria-hidden="true"><i style="width:${a.fit}%"></i></span>
      </div>
      <div class="fit-grid">
        <div><h3 class="mono fit-h">Top projects for this role</h3>
          <ol class="fit-projects">${a.projects.length ? a.projects.map((p) => `<li><a class="fit-pname" href="${p.url}">${esc(p.name)}</a><span class="mono fit-pmeta">${esc(p.kind)} · ${esc(p.metric.value)} ${esc(p.metric.label)}</span><span class="fit-why">${p.why.length ? `matches ${p.why.map(esc).join(', ')}` : 'close in meaning'}${p.req ? ` · “${esc(p.req.slice(0, 90))}${p.req.length > 90 ? '…' : ''}”` : ''}</span></li>`).join('') : '<li class="muted">No project matches these requirements.</li>'}</ol>
        </div>
        <div><h3 class="mono fit-h">Requirement by requirement</h3>
          <ul class="fit-reqs">${a.results.map((r) => `<li class="is-${r.state}"><span class="fit-mark" aria-label="${r.state}">${mark[r.state]}</span><span><span class="fit-req">${esc(r.text)}</span><span class="fit-ev">${evidence(r)}</span></span></li>`).join('')}</ul>
        </div>
      </div>
      ${a.n - a.covered ? `<div class="fit-gaps"><h3 class="mono fit-h">Gaps, stated plainly</h3><ul>${a.results.filter((r) => r.state !== 'covered').map((r) => `<li>${esc(r.text)}${r.note ? ` · <span class="muted">${esc(r.note)}</span>` : r.state === 'partial' ? ' · <span class="muted">related work, not a direct match</span>' : ''}</li>`).join('')}</ul></div>` : ''}
      <p class="fit-print-row"><button class="btn shimmer" type="button" data-fit-print>One-page summary (print / save as PDF)</button><span class="muted mono">only facts from his data</span></p>`;
    status.textContent = `${a.fit}% fit · ${a.covered}/${a.n} covered`;
    out.querySelector('[data-fit-print]').addEventListener('click', () => printSummary(a));
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  // A one-page, print-ready summary: name, contact, the fit, the matching skills and projects, experience, education,
  // certifications and the gaps. Only facts from data/fit.json; printed with the browser (Save as PDF).
  function printSummary(a) {
    const f = facts;
    const skills = [...new Set(a.results.flatMap((r) => r.terms.map((t) => t.t)))];
    const projs = (a.projects.length ? a.projects : f.projects).slice(0, 3); // three, so it stays on one page
    let sheet = document.getElementById('fit-print');
    if (!sheet) { sheet = document.createElement('div'); sheet.id = 'fit-print'; sheet.className = 'fit-print'; document.body.append(sheet); }
    sheet.innerHTML = `
      <header><h1>${esc(f.name)}</h1><p>${esc(f.tagline)}</p><p class="m">${esc(f.email)} · ${esc(f.site.replace(/^https:\/\//, ''))} · ${f.links.map((l) => esc(l.url.replace(/^https?:\/\/(www\.)?/, ''))).join(' · ')} · ${esc(f.location)}</p></header>
      <section><h2>For: ${esc(a.role)}</h2><p><b>${a.fit}%</b> of the listed requirements are covered by his own work (${a.covered} of ${a.n} fully, ${a.partial} partly), matched in the browser on ${new Date().toLocaleDateString()}.</p>${skills.length ? `<p><b>Matching skills:</b> ${skills.map(esc).join(', ')}</p>` : ''}</section>
      <section><h2>Most relevant projects</h2>${projs.map((p) => `<div class="i"><p><b>${esc(p.name)}</b> · ${esc(p.kind)} · ${esc(p.year)} · <b>${esc(p.metric.value)}</b> ${esc(p.metric.label)}</p><p>${esc(p.summary)}</p><p class="m">${p.stack.map(esc).join(' · ')} · ${esc(p.repo.replace(/^https:\/\//, ''))}</p></div>`).join('')}</section>
      <section><h2>Experience</h2>${f.experience.map((r) => `<div class="i"><p><b>${esc(r.role)}</b> · ${esc(r.org)} · ${esc(r.when)}</p><ul>${r.points.slice(0, 1).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</section>
      <section><h2>Education &amp; recognition</h2><p>${esc(f.education.degree)}, ${esc(f.education.school)} · CGPA ${esc(f.education.cgpa)} · ${esc(f.education.start.slice(0, 4))}–${esc(f.education.end.slice(0, 4))}</p><p>${f.certifications.map((c) => esc(`${c.name} (${c.issuer})`)).join(' · ')}</p><p>${esc(f.achievement)}</p></section>
      ${a.n - a.covered ? `<section><h2>Not covered by his data</h2><ul>${a.results.filter((r) => r.state !== 'covered').map((r) => `<li>${esc(r.text)}${r.note ? ` · ${esc(r.note)}` : ''}</li>`).join('')}</ul></section>` : ''}
      <p class="m">Generated in the browser at info.sahaj.si from Sahaj's own data; the job description was not sent anywhere.</p>`;
    document.documentElement.classList.add('fit-printing');
    const done = () => document.documentElement.classList.remove('fit-printing');
    addEventListener('afterprint', done, { once: true });
    setTimeout(() => { print(); setTimeout(done, 500); }, 50);
  }
}
