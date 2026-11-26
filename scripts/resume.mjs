// The resume as a print-styled page (/resume/), built only from content/ (profile, projects, Guinness entry).
// scripts/resume-pdf.mjs prints it to /assets/resume/Sahaj-Saliya-Resume.pdf. No phone number and no street
// address: location is the city only. Asset URLs are relative so the same file renders over http and file://.
import { esc, fmtMonth, fmtRange, projectUrl } from './lib.mjs';

export const RESUME_PDF = '/assets/resume/Sahaj-Saliya-Resume.pdf';
const first = (s) => (String(s).match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
const bare = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

// One line for the Harvard ManageMentor programs: issuer, count, months, then the names (the one closest to his work
// first). Short programs, so they stay one line and never read as a degree.
function harvardLine(list = []) {
  if (!list.length) return '';
  const a = fmtMonth(list[0].month), b = fmtMonth(list[list.length - 1].month);
  const span = a === b ? a : a.slice(-4) === b.slice(-4) ? `${a.slice(0, 3)} to ${b}` : `${a} to ${b}`;
  const names = [...list.filter((p) => p.focus), ...list.filter((p) => !p.focus)].map((p) => p.program);
  return `<li>Harvard ManageMentor (Harvard Business Impact): ${list.length} programs, ${span}: ${names.map(esc).join(', ')}</li>`;
}

export function renderResume({ profile, projects, products = [], gwr, harvard = [], site }) {
  const links = [
    `<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>`,
    `<a href="${site}">${bare(site)}</a>`,
    ...profile.links.map((l) => `<a href="${esc(l.url)}">${esc(bare(l.url))}</a>`),
    esc(profile.location),
  ];
  const ed = profile.education;
  const section = (title, body) => `<section><h2>${title}</h2>${body}</section>`;
  const row = (left, right, sub = '') => `<div class="row"><h3>${left}</h3><span class="when">${right}</span></div>${sub ? `<p class="sub">${sub}</p>` : ''}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sahaj Saliya · Resume</title>
<meta name="description" content="Resume of Sahaj Saliya, AI engineer: education, experience, projects, skills and achievements.">
<link rel="canonical" href="${site}/resume/">
<link rel="icon" type="image/svg+xml" href="../assets/brand/logo-small.svg?v=4">
<link rel="icon" href="../favicon.ico?v=4" sizes="any">
<style>
@font-face { font-family: "Inter Tight"; font-weight: 100 900; src: url("../assets/fonts/inter-tight-latin-wght-normal.woff2") format("woff2"); }
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url("../assets/fonts/instrument-serif-latin-400-italic.woff2") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 100 800; src: url("../assets/fonts/jetbrains-mono-latin-wght-normal.woff2") format("woff2"); }
@page { size: A4; margin: 14mm 15mm; }
:root { --ink: #16140F; --ink-2: #48443B; --ink-3: #6A6458; --rule: #D9D0BF; --accent: #B23E0E; --paper: #FFFFFF; }
* { box-sizing: border-box; }
html { background: #EEE8DC; }
body { margin: 0; color: var(--ink); font: 400 10pt/1.42 "Inter Tight", system-ui, sans-serif; }
.sheet { max-width: 210mm; margin: 24px auto; padding: 14mm 15mm; background: var(--paper); box-shadow: 0 10px 40px -20px rgba(0,0,0,.35); }
header h1 { margin: 0; font: italic 400 30pt/1 "Instrument Serif", Georgia, serif; letter-spacing: -.01em; }
header .tag { margin: 4px 0 6px; font-size: 10.5pt; color: var(--ink-2); }
header .links { display: flex; flex-wrap: wrap; gap: 2px 14px; margin: 0; font: 400 8.2pt/1.5 "JetBrains Mono", monospace; color: var(--ink-3); }
a { color: inherit; text-decoration: none; }
section { margin-top: 12px; break-inside: auto; }
h2 { margin: 0 0 5px; padding-bottom: 3px; border-bottom: 1px solid var(--rule); font: 500 8pt/1 "JetBrains Mono", monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
h3 { margin: 0; font-size: 10.2pt; font-weight: 600; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-top: 6px; }
.when { flex: none; font: 400 8.2pt "JetBrains Mono", monospace; color: var(--ink-3); }
.sub { margin: 1px 0 0; color: var(--ink-2); }
ul { margin: 3px 0 0; padding-left: 14px; }
li { margin: 1px 0; }
.item { break-inside: avoid; }
.metric { font-weight: 600; color: var(--accent); }
.stack { font: 400 8pt/1.5 "JetBrains Mono", monospace; color: var(--ink-3); margin: 2px 0 0; }
.skills { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0; }
.skills dt { font-weight: 600; }
.skills dd { margin: 0; color: var(--ink-2); }
.tools { max-width: 210mm; margin: 16px auto 0; display: flex; justify-content: space-between; gap: 12px; padding: 0 4px; font: 400 13px "JetBrains Mono", monospace; }
.tools a { color: var(--accent); text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 600px) { .sheet { margin: 0; padding: 20px 16px; box-shadow: none; } .row { flex-wrap: wrap; } .skills { grid-template-columns: 1fr; } .tools { padding: 0 16px; } }
@media print { html { background: none; } .sheet { margin: 0; padding: 0; max-width: none; box-shadow: none; } .tools { display: none; } }
</style>
</head>
<body>
<nav class="tools" aria-label="Resume"><a href="/">← info.sahaj.si</a><a href="${RESUME_PDF}" download="Sahaj-Saliya-Resume.pdf">Download PDF</a></nav>
<main class="sheet">
<header>
  <h1>${esc(profile.name)}</h1>
  <p class="tag">${esc(profile.tagline)}</p>
  <p class="links">${links.map((l) => `<span>${l}</span>`).join('')}</p>
</header>
${section('Education', `<div class="item">${row(esc(ed.school), fmtRange(ed.start, ed.end), `${esc(ed.degree)} · CGPA ${esc(ed.cgpa)} · ${esc(ed.place)}`)}</div>`)}
${section('Experience', profile.experience.map((r) => `<div class="item">${row(`${esc(r.role)} · ${esc(r.org)}`, fmtRange(r.start, r.end), `${esc(r.kind)} · ${esc(r.place)}`)}<ul>${r.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join(''))}
${section('Projects', projects.map((p) => `<div class="item">${row(`${esc(p.name)} <span class="sub">· ${esc(p.kind)}</span>`, esc(p.year))}<p class="sub"><span class="metric">${esc(p.metric.value)}</span> ${esc(p.metric.label)}. ${esc(first(p.problem))} ${esc(first(p.approach))}</p><p class="stack">${p.stack.map(esc).join(' · ')} · ${esc(projectUrl(p).replace(/^https:\/\//, ''))}</p></div>`).join(''))}
${section('Products', products.map((p) => `<div class="item">${row(`${esc(p.name)} <span class="sub">· ${esc(p.kind)}</span>`, esc(p.year))}<p class="sub"><span class="metric">${esc(p.metric.value)}</span> ${esc(p.metric.label)}. ${esc(first(p.problem))} ${esc(first(p.approach))}</p><p class="stack">${p.stack.map(esc).join(' · ')} · ${esc(projectUrl(p).replace(/^https:\/\//, ''))}</p></div>`).join(''))}
${section('Skills', `<dl class="skills">${profile.skills.map((g) => `<dt>${esc(g.group)}</dt><dd>${g.items.map(esc).join(', ')}</dd>`).join('')}</dl>`)}
${section('Certifications', `<ul>${profile.certifications.map((c) => `<li>${esc(c.name)} · ${esc(c.issuer)}${c.note ? ` (${esc(c.note)})` : ''}</li>`).join('')}${harvardLine(harvard)}</ul>`)}
${section('Achievements &amp; community', `<ul><li><b>${esc(gwr.title)} · ${esc(gwr.year)}</b>: ${esc(gwr.record)}, ${esc(gwr.where)}, ${esc(gwr.when)}.</li>${profile.community.map((c) => `<li>${esc(c.role)} · ${esc(c.org)} (${c.end === null ? `since ${c.start.slice(0, 4)}` : fmtRange(c.start, c.end)})</li>`).join('')}</ul>`)}
</main>
</body>
</html>
`;
}
