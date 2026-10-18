// Theme as a temperature dial: auto (follow the system), 0.2 (light paper), 0.9 (latent night).
// The choice is applied before first paint by an inline script in <head>; this module only handles changes.
const ORDER = ['auto', 'light', 'dark'];
const LABEL = { auto: 'auto', light: 'τ 0.2', dark: 'τ 0.9' };
const NAME = { auto: 'follow system', light: 'light', dark: 'dark' };

export function initTheme() {
  const btn = document.querySelector('[data-theme-toggle]');
  const root = document.documentElement;
  const sys = matchMedia('(prefers-color-scheme: dark)');
  let mode = 'auto';
  try { mode = localStorage.getItem('theme') || 'auto'; } catch { /* storage blocked */ }
  if (!ORDER.includes(mode)) mode = 'auto';

  const apply = () => {
    if (mode === 'auto') delete root.dataset.theme; else root.dataset.theme = mode;
    const effective = mode === 'auto' ? (sys.matches ? 'dark' : 'light') : mode;
    root.dataset.effectiveTheme = effective;
    if (btn) {
      btn.dataset.themeState = mode;
      btn.setAttribute('aria-label', `Theme: ${NAME[mode]}. Click to change.`);
      const val = btn.querySelector('[data-theme-val]');
      if (val) val.textContent = LABEL[mode];
    }
    document.dispatchEvent(new CustomEvent('themechange', { detail: { effective } }));
  };

  btn?.addEventListener('click', () => {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    try { mode === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', mode); } catch { /* ignore */ }
    apply();
  });
  sys.addEventListener('change', () => { if (mode === 'auto') apply(); });
  apply();
}

export const isDark = () => document.documentElement.dataset.effectiveTheme === 'dark';
