/* Runs first in <head>, before the theme and boot scripts.
   A reload or a new visit is a fresh start, as on a new device: the site's own saved state is cleared (the
   "already generated" flag, the persona guess and pick, the boot flag, the visitor id, the saved theme, cached UI
   state) and the page starts at the top, without a #hash. Model weights live in Cache Storage / IndexedDB and are
   kept, so the restart stays fast.
   Kept as they are: back/forward, links followed inside the site, and ?noreplay (for testing). */
(function () {
  var params = new URLSearchParams(location.search);
  var nav = null;
  try { nav = performance.getEntriesByType('navigation')[0]; } catch (e) { }
  var type = nav ? nav.type : 'navigate';
  var inside = false;
  try { inside = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { }
  var bounce = false;
  try { bounce = !!sessionStorage.getItem('ipBounce'); sessionStorage.removeItem('ipBounce'); } catch (e) { }
  var fresh = !params.has('noreplay') && (type === 'reload' || (type === 'navigate' && !inside));
  window.__fresh = fresh;
  // A generation will run on this load (generate.js): hold back what it animates in, from the very first paint, so
  // nothing shows for a moment before its animation. main.css shows it all anyway after a few seconds.
  try {
    var motion = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var willGen = motion && !params.has('noreplay') && (params.has('replay') || fresh || !localStorage.getItem('sahaj:generated'));
    if (willGen) document.documentElement.classList.add('gen-pending');
  } catch (e) { }
  if (!fresh && !bounce) return;
  try { history.scrollRestoration = 'manual'; } catch (e) { }
  if (fresh) {
    // the one key that survives: the last greeting line, so a reload never shows the same one twice
    var keep = null;
    try { keep = sessionStorage.getItem('greetLast'); } catch (e) { }
    try { localStorage.clear(); } catch (e) { }
    try { sessionStorage.clear(); } catch (e) { }
    try { if (keep) sessionStorage.setItem('greetLast', keep); } catch (e) { }
  }
  try { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { }
  scrollTo(0, 0);
  addEventListener('DOMContentLoaded', function () { scrollTo(0, 0); });
})();
