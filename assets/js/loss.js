// Training-curve section: draws the smoothed loss when it enters view and links checkpoints to the list.
export function initLoss() {
  const wrap = document.querySelector('[data-loss]');
  if (!wrap) return;
  const tip = wrap.querySelector('.loss-tip');
  const list = [...document.querySelectorAll('.ckpt-list li')];
  const marks = [...wrap.querySelectorAll('.ckpt')];
  marks.forEach((m, k) => m.style.setProperty('--k', k));

  new IntersectionObserver((entries, io) => {
    if (entries[0].isIntersecting) { wrap.classList.add('is-drawn'); io.disconnect(); }
  }, { threshold: 0.35 }).observe(wrap);

  const hot = (i, on) => {
    marks[i]?.classList.toggle('is-hot', on);
    list[i]?.classList.toggle('is-hot', on);
    if (!tip) return;
    if (!on) { tip.classList.remove('is-on'); return; }
    const c = marks[i].querySelector('circle').getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    tip.textContent = marks[i].getAttribute('aria-label');
    const x = Math.min(Math.max(c.left + c.width / 2 - w.left, 120), w.width - 120);
    tip.style.left = `${x}px`;
    tip.style.top = `${c.top - w.top}px`;
    tip.classList.add('is-on');
  };

  marks.forEach((m, i) => {
    m.addEventListener('pointerenter', () => hot(i, true));
    m.addEventListener('pointerleave', () => hot(i, false));
    m.addEventListener('focus', () => hot(i, true));
    m.addEventListener('blur', () => hot(i, false));
    m.addEventListener('click', () => list[i]?.querySelector('a')?.click());
  });
  list.forEach((li, i) => {
    li.addEventListener('pointerenter', () => hot(i, true));
    li.addEventListener('pointerleave', () => hot(i, false));
  });
}
