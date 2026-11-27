// The Guinness World Records card: "the model reads the certificate".
//  - first visit: the thumbnail denoises in, a scan line passes over it, OCR-style boxes appear around the name,
//    the event text and the date, each draws a thin attention line to its card row, and that row's value is
//    generated token by token ("extracted" from the document). Boxes and lines fade after about 1.5 s.
//  - always: click / Enter opens a lightbox with the full certificate, zoom and pan, a "show what the model sees"
//    toggle (labelled boxes plus the extracted JSON). The full image loads only when it opens.
// The boxes are precomputed coordinates (content/guinness.json). Nothing runs OCR in the browser.
import { imageJob, wrapTokens } from './generate.js';

export function initGwr({ reducedMotion = false } = {}) {
  const card = document.querySelector('[data-gwr]');
  if (!card) return;
  const data = JSON.parse(card.querySelector('[data-gwr-data]').textContent);
  lightbox(card, data, reducedMotion);
  if (!reducedMotion && document.documentElement.classList.contains('gen')) firstVisit(card, data);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function firstVisit(card, data) {
  const frame = card.querySelector('.gwr-frame');
  const img = frame.querySelector('img');
  const scan = card.querySelector('.gwr-scan');
  const links = card.querySelector('.gwr-links');
  // the extracted rows start hidden (their real text stays in the DOM), and the thumbnail starts as noise
  const rows = {};
  for (const key of ['task', 'role', 'when']) {
    const dd = card.querySelector(`[data-row="${key}"] dd`);
    if (dd) rows[key] = wrapTokens(dd);
  }
  const noise = imageJob(img, frame, { announce: false });
  const stepper = (job) => new Promise((res) => {
    const t0 = performance.now();
    const f = (now) => { if (job.step(now - t0)) { job.finish(); res(); } else requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });

  let started = false;
  const run = async () => {
    if (started) return;
    started = true;
    await stepper(noise); // 1. denoise
    scan.style.setProperty('--h', `${frame.getBoundingClientRect().height}px`);
    scan.classList.add('is-run'); // 2. the scan line
    await wait(950);
    // 3. boxes, each with an attention line to its row, then that row is generated
    const cardRect = card.getBoundingClientRect();
    const rects = [...frame.querySelectorAll('[data-ocr]')];
    const paths = [];
    for (const b of data.boxes) {
      const el = frame.querySelector(`[data-ocr="${b.id}"]`);
      el.classList.add('is-on');
      await wait(120);
      if (!b.row) continue;
      const row = card.querySelector(`[data-row="${b.row}"] dd`);
      if (!row) continue;
      const a = el.getBoundingClientRect(), r = row.getBoundingClientRect();
      const x1 = a.left - cardRect.left, y1 = a.top + a.height / 2 - cardRect.top;
      const x2 = r.right - cardRect.left + 6, y2 = r.top + r.height / 2 - cardRect.top;
      const mx = Math.min(x1, x2) + Math.abs(x1 - x2) / 2;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}C${mx.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      p.setAttribute('pathLength', '1');
      links.append(p);
      requestAnimationFrame(() => p.classList.add('is-draw'));
      paths.push(p);
      // generate the row token by token (once per row)
      const toks = rows[b.row];
      if (toks && !toks.done) {
        toks.done = true;
        (async () => { for (const s of toks) { s.classList.add('gt-on'); await wait(22); } })();
      }
    }
    await wait(1500); // 4. fade everything out
    for (const p of paths) p.classList.add('is-out');
    for (const el of rects) el.classList.remove('is-on');
    setTimeout(() => { links.replaceChildren(); for (const t of Object.values(rows)) for (const s of t) s.classList.add('gt-on'); }, 700);
  };

  const gate = new Promise((res) => (window.__heroReady ? res() : document.addEventListener('hero:ready', res, { once: true })));
  new IntersectionObserver((es, io) => {
    if (es[0].isIntersecting) { io.disconnect(); gate.then(run); }
  }, { threshold: 0.4 }).observe(card);
  // safety: never leave the rows hidden
  setTimeout(() => { for (const t of Object.values(rows)) for (const s of t) s.classList.add('gt-on'); }, 30000);
}

// ---------- lightbox ----------
function lightbox(card, data, reducedMotion) {
  const open = card.querySelector('[data-gwr-open]');
  let box = null, opener = null, prevOverflow = '';
  const [W, H] = data.size;

  function build() {
    const el = document.createElement('div');
    el.className = 'gwr-lb';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Certificate of Participation');
    const tags = data.boxes.map((b) => {
      const [x, y, w] = b.rect;
      const tw = b.label.length * 7 + 10;
      return `<rect x="${b.rect[0]}" y="${b.rect[1]}" width="${b.rect[2]}" height="${b.rect[3]}" rx="3"/><rect class="tag" x="${x}" y="${y - 15}" width="${tw}" height="14" rx="2"/><text x="${x + 5}" y="${y - 4.5}">${b.label}</text>`;
    }).join('');
    el.innerHTML = `
      <div class="gwr-lb-bar">
        <button type="button" data-zoom="-1" aria-label="Zoom out"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8h10"/></svg></button>
        <button type="button" data-zoom="1" aria-label="Zoom in"><svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 3v10M3 8h10"/></svg></button>
        <button type="button" data-zoom="0">Reset</button>
        <button type="button" data-ocr-toggle aria-pressed="false">Show what the model sees</button>
        <button type="button" class="sp" data-close>Close <svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
      </div>
      <div class="gwr-lb-main">
        <div class="gwr-stage" data-stage>
          <div class="gwr-pan" data-pan>
            <img alt="${data.alt}" width="${W}" height="${H}" draggable="false">
            <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${tags}</svg>
          </div>
        </div>
        <pre class="gwr-json" aria-label="Extracted fields"><small>extracted · precomputed when the site is built, nothing runs in your browser · confidence ${data.confidence}</small>${highlight(data.json)}</pre>
      </div>`;
    return el;
  }

  function highlight(obj) {
    const lines = Object.entries(obj).map(([k, v]) => `  <span class="k">"${k}"</span>: ${typeof v === 'number' ? v : `"${String(v).replace(/[<&]/g, '')}"`}`);
    return `{\n${lines.join(',\n')}\n}`;
  }

  function show() {
    opener = open; // a programmatic click does not focus the button, so always return focus to it
    box = build();
    document.body.append(box);
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const img = box.querySelector('img');
    const stage = box.querySelector('[data-stage]');
    const pan = box.querySelector('[data-pan]');
    // the full image loads only now
    img.src = data.full;
    img.addEventListener('error', () => { img.src = data.fullJpg; }, { once: true });

    let scale = 1, fit = 1, tx = 0, ty = 0;
    const apply = () => { pan.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
    const layout = () => {
      const r = stage.getBoundingClientRect();
      fit = Math.min(r.width / W, r.height / H) * 0.96;
      pan.style.width = `${W}px`; pan.style.height = `${H}px`;
      img.style.width = `${W}px`; img.style.height = `${H}px`;
      reset();
    };
    const reset = () => { const r = stage.getBoundingClientRect(); scale = fit; tx = (r.width - W * scale) / 2; ty = (r.height - H * scale) / 2; apply(); };
    const zoomAt = (k, cx, cy) => {
      const ns = Math.min(fit * 6, Math.max(fit * 0.6, scale * k));
      const r = stage.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      tx = px - (px - tx) * (ns / scale); ty = py - (py - ty) * (ns / scale); scale = ns; apply();
    };
    layout();
    addEventListener('resize', layout);

    // wheel zoom, drag to pan, pinch zoom
    stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
    const ptrs = new Map();
    let lastDist = 0;
    stage.addEventListener('pointerdown', (e) => { stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); lastDist = 0; });
    stage.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 1) { tx += e.clientX - prev[0]; ty += e.clientY - prev[1]; apply(); }
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastDist) zoomAt(d / lastDist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        lastDist = d;
      }
    });
    const up = (e) => { ptrs.delete(e.pointerId); lastDist = 0; };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);

    box.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zoom]');
      if (z) { const k = Number(z.dataset.zoom); const r = stage.getBoundingClientRect(); if (k === 0) reset(); else zoomAt(k > 0 ? 1.4 : 1 / 1.4, r.left + r.width / 2, r.top + r.height / 2); }
      const t = e.target.closest('[data-ocr-toggle]');
      if (t) { const on = box.classList.toggle('is-ocr'); t.setAttribute('aria-pressed', String(on)); }
      if (e.target.closest('[data-close]')) close();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      // focus trap
      const f = [...box.querySelectorAll('button')].filter((b) => !b.disabled);
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    box._cleanup = () => removeEventListener('resize', layout);
    box.querySelector('[data-close]').focus();
  }

  function close() {
    if (!box) return;
    box._cleanup?.();
    box.remove(); box = null;
    document.documentElement.style.overflow = prevOverflow;
    opener?.focus();
  }

  open.addEventListener('click', show);
  void reducedMotion;
}
