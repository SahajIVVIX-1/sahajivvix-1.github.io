// While the site downloads a model or waits on one (the chat thinking, the console's MiniLM or CLIP), the header logo
// turns into the leaf-S loader (s-loader.js, "orbit"): the same logo, its rings spinning. It is a "working" sign
// only, never a progress bar. html[data-loading] lists who is waiting; CSS swaps the two logos.
const waiting = new Set();
let mounted = null;

export function setLoading(key, on) {
  if (on) waiting.add(key); else waiting.delete(key);
  const root = document.documentElement;
  if (waiting.size) { root.dataset.loading = [...waiting].join(' '); mount(); } else delete root.dataset.loading;
}

// A small leaf-S loader element (for inline "working" spots); null if the component cannot load.
export async function loader(variant = 'orbit', size = 18) {
  try { await import('./s-loader.js'); } catch { return null; }
  const l = document.createElement('s-loader');
  l.setAttribute('variant', variant);
  l.setAttribute('size', String(size));
  l.setAttribute('aria-hidden', 'true');
  return l;
}

function mount() {
  mounted ||= loader('orbit', 40).then((l) => {
    const logo = document.querySelector('[data-brand] .brand-logo');
    if (!l || !logo) return;
    l.classList.add('brand-loader');
    logo.after(l);
  });
}
