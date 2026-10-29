// "Download resume (PDF)" buttons ([data-resume]): a short "compiling…" token animation (~600 ms), then the PDF
// (built from the site's data by scripts/resume-pdf.mjs) downloads as Sahaj-Saliya-Resume.pdf. Without JS the
// link still downloads the file directly.
const FILE = 'Sahaj-Saliya-Resume.pdf';
const STEPS = ['compiling', 'compiling ▸ profile', 'compiling ▸ projects', 'compiling ▸ pdf ✓'];

export function initResume() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-resume]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (a.classList.contains('is-compiling')) return;
    const label = a.querySelector('[data-resume-label]') || a;
    const text = label.textContent;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    a.classList.add('is-compiling');
    a.setAttribute('aria-busy', 'true');
    label.style.minWidth = `${label.offsetWidth}px`; // no width jump while the label changes
    let k = 0;
    const tick = () => { label.textContent = `${STEPS[k]}…`.replace('✓…', '✓'); k++; };
    tick();
    const timer = reduced ? 0 : setInterval(() => { if (k < STEPS.length) tick(); }, 150);
    setTimeout(() => {
      clearInterval(timer);
      const dl = document.createElement('a');
      dl.href = a.getAttribute('href');
      dl.download = FILE;
      document.body.append(dl);
      dl.click();
      dl.remove();
      setTimeout(() => { label.textContent = text; label.style.minWidth = ''; a.classList.remove('is-compiling'); a.removeAttribute('aria-busy'); }, 350);
    }, reduced ? 150 : 620);
  });
}
