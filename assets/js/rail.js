// "Layer n / 12" rail: tracks which section (layer) is in the middle of the viewport.
// Layers can be reordered by persona.js, so the rail re-reads them on "persona:change".
export function initRail() {
  const rail = document.querySelector('[data-rail]');
  if (!rail) return;
  const n = rail.querySelector('[data-rail-n]');
  const name = rail.querySelector('[data-rail-name]');
  const ticks = [...rail.querySelectorAll('[data-rail-tick]')];
  const bar = document.createElement('div');
  bar.className = 'rail-mobile';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);

  let current = null;
  let io = null;

  const set = (layer) => {
    if (layer === current) return;
    current = layer;
    const k = Number(layer.dataset.layer);
    n.textContent = `Layer ${String(k).padStart(2, '0')}`;
    name.textContent = layer.dataset.layerName;
    ticks.forEach((t) => {
      const i = Number(t.dataset.railTick);
      t.classList.toggle('is-on', i === k);
      t.classList.toggle('is-past', i < k);
      if (i === k) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
    });
    // the context window (context.js) follows the layer in the address bar and the header chip
    document.dispatchEvent(new CustomEvent('layer:change', { detail: { layer: k } }));
  };

  const bind = () => {
    const layers = [...document.querySelectorAll('.layer[data-layer]')].filter((l) => Number(l.dataset.layer) > 0);
    if (!layers.length) return;
    ticks.forEach((t) => {
      const target = layers.find((l) => l.dataset.layer === t.dataset.railTick);
      if (target?.id) t.href = `#${target.id}`;
    });
    io?.disconnect();
    current = null;
    io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) set(e.target);
    }, { rootMargin: '-45% 0px -50% 0px' });
    layers.forEach((l) => io.observe(l));
  };
  bind();
  document.addEventListener('persona:change', bind);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', `${max > 0 ? (scrollY / max) * 100 : 0}%`);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
