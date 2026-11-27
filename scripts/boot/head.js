/* Runs in <head>, before first paint.
   1. Picks the boot mode:
        full  first visit of a session, home page: the whole "forward pass"
        calm  same, but the visitor prefers reduced motion: static network + greeting
        mini  anything else (same-session return, other pages): greeting only, ~400 ms
   2. (No IP lookup any more: the site makes no third-party requests. __ipPromise resolves to null, which every
      party) for the "context window" (assets/js/context.js writes ?context=you@<address>&layer=NN into the address
      bar). A context or IP that came with a shared link is removed at once, before anything is shown. Old
      /ip=<address> links still open the right page.
   3. Keeps a random id in this browser (never shown, never sent) that only seeds the loading animation. */
(function () {
  var d = document.documentElement;
  // Old links put the IP in the path (/ip=<address>). A static host answers such a path with 404.html, so a page
  // opened on an /ip= path is replaced by the real page for the path without that segment (no extra history entry).
  var SEG = /\/?ip=[0-9a-fA-F:.]{2,45}\/?$/;
  var basePath = function (p) {
    p = p.replace(SEG, '/');
    if (p.slice(-11) === '/index.html') p = p.slice(0, -10);
    if (p.charAt(p.length - 1) !== '/') p += '/';
    return p;
  };
  var run = function () {
  var mode = 'mini';
  try {
    // Only the home page counts: reading the blog first must not use up the full boot.
    var seen = sessionStorage.getItem('booted');
    var home = basePath(location.pathname) === '/';
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // plain view (fresh.js) skips the full loading screen, like ?noreplay
    var noreplay = /[?&]noreplay(=|&|$)/.test(location.search) || window.__plain;
    if (home) { sessionStorage.setItem('booted', '1'); if (!seen && !noreplay) mode = calm ? 'calm' : 'full'; }
  } catch (e) { }
  d.className += ' booting boot-' + mode;

  /* ---------- local random id (seeds the animation only) ---------- */
  var KEY = 'visitorTag';
  var ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var valid = function (v) { return /^[a-z0-9]{6}$/.test(v || ''); };
  var make = function () {
    var bytes = new Uint8Array(6);
    var s = '';
    try { crypto.getRandomValues(bytes); } catch (e) { for (var i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256); }
    for (var j = 0; j < 6; j++) s += ALPHABET.charAt(bytes[j] % 36);
    return s;
  };
  var tag = '';
  try { tag = localStorage.getItem(KEY); } catch (e) { }
  if (!valid(tag)) { try { tag = sessionStorage.getItem(KEY); } catch (e) { } }
  if (!valid(tag)) {
    tag = make();
    try { localStorage.setItem(KEY, tag); } catch (e) { try { sessionStorage.setItem(KEY, tag); } catch (e2) { } }
  }
  window.__visitor = tag;

  /* ---------- the visitor's public IP in the address bar ---------- */
  // Only plausible IPv4 / IPv6 text is ever used, so nothing odd can end up in the URL or the page.
  var okIp = function (v) {
    return typeof v === 'string' && v.length <= 45 && (/^\d{1,3}(\.\d{1,3}){3}$/.test(v) || (v.indexOf(':') > -1 && /^[0-9a-fA-F:.]{2,45}$/.test(v)));
  };
  // Removes any context, layer, ip or visitor parameter and any /ip= path segment; other parameters and the #hash stay.
  var write = function () {
    try {
      var parts = location.search.replace(/^\?/, '');
      parts = parts ? parts.split('&') : [];
      var out = parts.filter(function (p) { var k = p.split('=')[0]; return k !== 'visitor' && k !== 'ip' && k !== 'context' && k !== 'layer'; });
      var search = out.length ? '?' + out.join('&') : '';
      var next = basePath(location.pathname) + search + location.hash;
      if (next !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', next);
    } catch (e) { }
  };
  // never show an IP that came from a shared link, not even for a moment
  write();

  // no IP lookup: the site makes no third-party requests; everything that used the IP handles null
  // (you@anonymous in the address bar, nothing in the footer)
  try { sessionStorage.removeItem('visitorIp'); } catch (e) { }
  window.__ipPromise = Promise.resolve(null);
  };
  if (!window.__ipSwap && SEG.test(location.pathname)) {
    window.__ipSwap = true;
    d.style.visibility = 'hidden';
    try { sessionStorage.setItem('ipBounce', '1'); } catch (e) { }
    // Load the real page for the path without the /ip= segment.
    location.replace(basePath(location.pathname) + location.search + location.hash);
    setTimeout(function () { d.style.visibility = ''; run(); }, 5000);
  } else run();
})();
