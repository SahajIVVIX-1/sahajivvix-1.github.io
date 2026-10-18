// Places a small "next-token probability" popup next to the token it describes, and keeps it fully visible.
// It measures the real space around the token (minus the fixed header), then picks the first side that fits:
// above, below, to the right, to the left. It is clamped inside the viewport and gets a small notch (data-side,
// --nx / --ny) that points at the token. The popup must be an absolutely positioned child of the anchor, and no
// ancestor may clip it (overflow: hidden).

export function headerBottom() {
  const h = document.querySelector('[data-head]');
  return h ? h.getBoundingClientRect().bottom : 0;
}

export function placePopup(anchor, pop, { gap = 12, margin = 8 } = {}) {
  // Measure with only left/bottom set (the stylesheet default), so the size is its natural size.
  pop.style.left = '0'; pop.style.right = 'auto'; pop.style.top = 'auto'; pop.style.bottom = '0';
  const a = anchor.getBoundingClientRect();
  const pw = Math.min(pop.offsetWidth, innerWidth - margin * 2);
  const ph = pop.offsetHeight;
  // Every offset the chosen side does not use is set to auto. A leftover top AND bottom would stretch the box.
  const limit = { top: headerBottom() + margin, bottom: innerHeight - margin, left: margin, right: innerWidth - margin };
  const room = {
    above: a.top - gap - limit.top - ph,
    below: limit.bottom - (a.bottom + gap) - ph,
    right: limit.right - (a.right + gap) - pw,
    left: a.left - gap - limit.left - pw,
  };
  const order = ['above', 'below', 'right', 'left'];
  // the first side with enough room; if none fits, the roomiest one (it is still clamped below)
  const side = order.find((s) => room[s] >= 0) || order.reduce((best, s) => (room[s] > room[best] ? s : best), 'above');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  pop.dataset.side = side;
  if (side === 'above' || side === 'below') {
    const x = clamp(a.left, limit.left, Math.max(limit.left, limit.right - pw)); // viewport x of the popup's left edge
    pop.style.left = `${x - a.left}px`; pop.style.right = 'auto';
    if (side === 'above') { pop.style.bottom = `calc(100% + ${gap}px)`; pop.style.top = 'auto'; } else { pop.style.top = `calc(100% + ${gap}px)`; pop.style.bottom = 'auto'; }
    pop.style.setProperty('--nx', `${clamp(a.left + Math.min(a.width, 24) / 2 - x, 12, pw - 12)}px`);
  } else {
    const y = clamp(a.top + a.height / 2 - ph / 2, limit.top, Math.max(limit.top, limit.bottom - ph));
    pop.style.top = `${y - a.top}px`; pop.style.bottom = 'auto';
    if (side === 'right') { pop.style.left = `calc(100% + ${gap}px)`; pop.style.right = 'auto'; } else { pop.style.right = `calc(100% + ${gap}px)`; pop.style.left = 'auto'; }
    pop.style.setProperty('--ny', `${clamp(a.top + a.height / 2 - y, 12, ph - 12)}px`);
  }
  return side;
}
