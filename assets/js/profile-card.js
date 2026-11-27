// The About photo as an animated CV card (from Sahaj's profile-hero kit, fitted to this site).
// The HTML already holds a complete still card (scripts/build.mjs, content/profile-card.json); this only animates
// it: typed roles, skill chips that pop in 6 at a time at the sides of the photo, and CV lines that tick in 4 at a
// time. No progress bar. The border, scan line and face frame are CSS. It pauses off-screen and in hidden tabs, and
// stays still with reduced motion or in plain view.
export function initProfileCard({ reducedMotion = false } = {}) {
  const root = document.querySelector('[data-pc]');
  if (!root) return;
  if (reducedMotion || window.__plain) { root.classList.add('pc-still'); return; }
  let data;
  try { data = JSON.parse(root.querySelector('[data-pc-data]').textContent); } catch { return; }
  const $ = (s) => root.querySelector(s);
  const typed = $('.pc-typed'), lines = $('.pc-lines');
  const slots = [...root.querySelectorAll('.pc-skill')];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let paused = true;
  // a wait that stands still while the card is paused
  const wait = (ms) => new Promise((res) => { (function tick(left) { if (left <= 0) return res(); setTimeout(() => tick(paused ? left : left - 50), 50); })(ms); });

  async function roles() {
    for (let i = 0; ; i = (i + 1) % data.roles.length) {
      const w = data.roles[i];
      for (let k = 1; k <= w.length; k++) { typed.textContent = w.slice(0, k); await wait(55); }
      await wait(1800);
      for (let k = w.length; k >= 0; k--) { typed.textContent = w.slice(0, k); await wait(26); }
      await wait(250);
    }
  }

  async function skills() {
    const n = data.skills.length;
    let page = 0;
    const fill = (offset) => slots.forEach((s, i) => {
      const [t, c] = data.skills[(offset + i) % n];
      s.textContent = t;
      s.style.setProperty('--c', `var(--pc-${c})`);
      s.style.animationDelay = `${-i * 0.5}s`;
    });
    slots.forEach((s) => s.classList.remove('is-on'));
    await wait(900);
    for (;;) {
      fill(page * 6);
      for (const s of slots) { s.classList.add('is-on'); await wait(220); }
      await wait(3600);
      for (const s of slots) { s.classList.remove('is-on'); await wait(90); }
      await wait(600);
      page = (page + 1) % Math.ceil(n / 6);
    }
  }

  const rows = (start) => data.cv.slice(start, start + 4).map(([k, v]) => `<li class="pc-line"><span class="ok" aria-hidden="true">✓</span><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></li>`).join('');
  async function cv() {
    const pages = Math.ceil(data.cv.length / 4);
    for (;;) {
      for (let p = 0; p < pages; p++) {
        lines.classList.remove('is-out');
        lines.innerHTML = rows(p * 4);
        await wait(300);
        for (const li of lines.children) { li.classList.add('is-on'); await wait(700); }
        await wait(2600);
        lines.classList.add('is-out');
        await wait(450);
      }
    }
  }

  const setPaused = (v) => { paused = v; root.classList.toggle('pc-paused', v); };
  let started = false;
  new IntersectionObserver((es) => {
    const on = es[es.length - 1].isIntersecting && !document.hidden;
    setPaused(!on);
    if (on && !started) { started = true; root.classList.add('pc-live'); roles(); skills(); cv(); }
  }, { threshold: 0.05 }).observe(root);
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  setPaused(true);
}
