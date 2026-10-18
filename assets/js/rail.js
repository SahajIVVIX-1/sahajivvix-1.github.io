// "Layer n / 12" rail: tracks which section (layer) is in the middle of the viewport.
export function initRail() {
  const rail = document.querySelector('[data-rail]');
  const layers = [...document.querySelectorAll('.layer[data-layer]')].filter((l) => Number(l.dataset.layer) > 0);
  if (!rail || !layers.length) return;
  const n = rail.querySelector('[data-rail-n]');
  const name = rail.querySelector('[data-rail-name]');
  const ticks = [...rail.querySelectorAll('[data-rail-tick]')];
  const bar = document.createElement('div');
  bar.className = 'rail-mobile';
  bar.setAttribute('aria-hidden', 'true');
  document.body.append(bar);

  ticks.forEach((t) => {
    const target = layers.find((l) => l.dataset.layer === t.dataset.railTick);
    if (target?.id) t.href = `#${target.id}`;
  });

  let current = null;
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
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) set(e.target);
  }, { rootMargin: '-45% 0px -50% 0px' });
  layers.forEach((l) => io.observe(l));

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', `${max > 0 ? (scrollY / max) * 100 : 0}%`);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
