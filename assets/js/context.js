// The "context window": the address bar reads like the model's context. The site no longer looks up the visitor's IP (no third-party
// requests), so it reads you@anonymous, written in token by token, as if generated: /?context=you@152.58.62.67 (or you@anonymous),
// one history.replaceState per token, ~60 ms apart. While the visitor scrolls, &layer=NN follows the layer in view
// (throttled, replaceState only: no history entries). The header chip shows only ctx · you · layer 03; clicking it
// shows the address with the privacy note, so the IP is never on screen unasked. A reload starts all of it again (fresh.js, head.js strip the old values).
const STEP = 60;
const THROTTLE = 450;

export function initContext({ reducedMotion = false } = {}) {
  const chip = document.querySelector('[data-ctx]');
  const tip = document.getElementById('ctx-tip');
  const whoEl = chip?.querySelector('[data-ctx-who]');
  const layerEl = chip?.querySelector('[data-ctx-layer]');
  let who = '', shown = '', layer = 0, typed = false, pending = 0, lastWrite = 0;

  // Other query parameters (e.g. ?noreplay) are taken once, before the first token, and always kept after ours.
  const rest = location.search.replace(/^\?/, '').split('&').filter((p) => p && !/^(context|layer)(=|$)/.test(p));
  // The current address with our two parameters set as given ("raw" is a partly generated first token).
  const url = (ctx, lay, raw) => {
    const own = raw ? [raw] : [ctx != null ? `context=${ctx}` : '', lay ? `layer=${String(lay).padStart(2, '0')}` : ''].filter(Boolean);
    const q = [...own, ...rest].join('&');
    return location.pathname + (q ? `?${q}` : '') + location.hash;
  };
  const put = (ctx, lay) => { try { history.replaceState(history.state, '', url(ctx, lay)); } catch { /* some browsers rate-limit replaceState */ } };

  const writeLayer = () => {
    pending = 0;
    lastWrite = performance.now();
    if (typed) put(who, layer);
    if (layerEl && layer) layerEl.textContent = `layer ${String(layer).padStart(2, '0')}`;
  };
  document.addEventListener('layer:change', (e) => {
    layer = e.detail.layer;
    if (pending) return;
    const wait = Math.max(0, THROTTLE - (performance.now() - lastWrite));
    pending = setTimeout(writeLayer, wait);
  });

  // "context", "=", "you", "@", then the address in pieces: each piece is one token.
  const tokens = (w) => ['context', '=', ...w.split(/([@.:])/).filter(Boolean)];
  async function typeIn(w) {
    who = w;
    if (reducedMotion) { shown = w; typed = true; put(who, layer); return; }
    let acc = '';
    for (const t of tokens(w)) {
      acc += t;
      const eq = acc.indexOf('=');
      shown = eq < 0 ? '' : acc.slice(eq + 1);
      try { history.replaceState(history.state, '', eq < 0 ? url(null, 0, acc) : url(shown, 0)); } catch { /* ignore */ }
      await new Promise((r) => setTimeout(r, STEP));
    }
    typed = true;
    put(who, layer);
  }

  // The IP lookup may still be running; the address is written once it settles (or fails: you@anonymous).
  (window.__ipPromise || Promise.resolve(null)).then((ip) => {
    const w = `you@${ip || 'anonymous'}`;
    if (chip) { chip.hidden = false; if (whoEl) whoEl.textContent = 'you'; }
    if (tip) { const b = document.createElement('b'); b.className = 'ctx-ip mono'; b.textContent = ip ? `Your address: ${ip}.` : 'Your address could not be looked up.'; tip.prepend(b, ' '); }
    // after the loading screen, so the address is generated where the visitor can watch it
    let started = false;
    const go = () => { if (started) return; started = true; typeIn(w); };
    if (document.documentElement.classList.contains('booting')) { document.addEventListener('boot:done', go, { once: true }); setTimeout(go, 7000); }
    else go();
  });

  if (chip && tip) {
    const show = (on) => { tip.hidden = !on; chip.setAttribute('aria-expanded', String(on)); };
    chip.addEventListener('click', () => show(tip.hidden));
    document.addEventListener('click', (e) => { if (!tip.hidden && !chip.contains(e.target) && !tip.contains(e.target)) show(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tip.hidden) { show(false); chip.focus(); } });
  }
}
