// Footer behaviour: the "last forward pass" time in the visitor's local time (UTC on hover) with a ticking
// relative time, and the back-to-top button. The footer itself is rendered at build time by footer() in
// scripts/build.mjs, so every page gets the same one.

export function initFooter({ reducedMotion = false } = {}) {
  const foot = document.querySelector('[data-foot]');
  if (!foot) return;
  clock(foot);
  foot.querySelector('[data-to-top]')?.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
}

function clock(foot) {
  const time = foot.querySelector('[data-foot-time]');
  const ago = foot.querySelector('[data-foot-ago]');
  if (!time) return;
  const at = new Date(time.getAttribute('datetime'));
  if (isNaN(at)) return;
  const pad = (n) => String(n).padStart(2, '0');
  time.textContent = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const rel = () => {
    const m = Math.max(0, Math.floor((Date.now() - at) / 60000));
    ago.textContent = m < 1 ? '· just now' : m < 60 ? `· ${m} min ago` : m < 1440 ? `· ${Math.floor(m / 60)} h ago` : `· ${Math.floor(m / 1440)} d ago`;
  };
  rel();
  setInterval(() => { if (!document.hidden) rel(); }, 30000);
}
