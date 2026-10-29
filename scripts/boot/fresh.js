/* Runs first in <head>, before the theme and boot scripts.
   A reload or a new visit is a fresh start, as on a new device: the site's own saved state is cleared (the
   "already generated" flag, the persona guess and pick, the boot flag, the visitor id, the saved theme, cached UI
   state) and the page starts at the top, without a #hash. Model weights live in Cache Storage / IndexedDB and are
   kept, so the restart stays fast.
   Kept as they are: back/forward, links followed inside the site, and ?noreplay (for testing). */
(function () {
  // /blog, /blogs and anything under them (any capitalisation) are the blog, now its own site at blog.sahaj.si:
  // go there at once, keeping the rest of the path, the query and the #hash.
  var bm = location.pathname.match(/^\/blogs?(\/.*)?$/i);
  if (bm) { location.replace('https://blog.sahaj.si' + (bm[1] || '/') + location.search + location.hash); return; }
  var params = new URLSearchParams(location.search);
  // Plain view: no loading screen, no agents, no animation. ?plain=1 (or ?for=recruiter) turns it on, ?plain=0 off.
  // It is the visitor's own choice, so it survives the fresh start below. While it is on, every script and the
  // stylesheet see "prefers reduced motion", so each effect falls back to its still version.
  var plain = null;
  try { plain = localStorage.getItem('plain'); } catch (e) { }
  if (params.get('plain') === '1' || params.get('for') === 'recruiter') plain = '1';
  if (params.get('plain') === '0') plain = null;
  if (params.has('plain')) {
    params.delete('plain');
    var qs = params.toString();
    try { history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) { }
  }
  window.__plain = !!plain;
  if (plain) {
    document.documentElement.classList.add('plain');
    var mm = window.matchMedia;
    var still = function (q) { var f = function () { }; return { matches: true, media: q, onchange: null, addEventListener: f, removeEventListener: f, addListener: f, removeListener: f, dispatchEvent: function () { return false; } }; };
    if (mm) window.matchMedia = function (q) { return /prefers-reduced-motion:\s*reduce/.test(q) ? still(q) : mm.call(window, q); };
  }
  var savePlain = function () { try { if (plain) localStorage.setItem('plain', '1'); else localStorage.removeItem('plain'); } catch (e) { } };
  savePlain();
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
    // what survives: the plain-view choice, and the last greeting line, so a reload never shows the same one twice
    var keep = null;
    try { keep = sessionStorage.getItem('greetLast'); } catch (e) { }
    try { localStorage.clear(); } catch (e) { }
    try { sessionStorage.clear(); } catch (e) { }
    try { if (keep) sessionStorage.setItem('greetLast', keep); } catch (e) { }
    savePlain();
  }
  try { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { }
  scrollTo(0, 0);
  addEventListener('DOMContentLoaded', function () { scrollTo(0, 0); });
})();
