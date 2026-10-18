/* Runs in <head>, before first paint.
   1. Picks the boot mode:
        full  first visit of a session, home page: the whole "forward pass"
        calm  same, but the visitor prefers reduced motion: static network + greeting
        mini  anything else (same-session return, other pages): greeting only, ~400 ms
   2. Looks up the visitor's public IP address (api.ipify.org, the only network call this site makes to a third
      party) and writes it into the address bar as /ip=<address> (home page), /blogs/ip=<address> (blog), on every page with history.replaceState: no reload and no extra
      back-button entry. Other query parameters and the #hash stay exactly as they were. A foreign IP (from a
      shared link) is removed at once and replaced by the visitor's own.
   3. Keeps a random id in this browser (never shown, never sent) that only seeds the loading animation. */
(function () {
  var d = document.documentElement;
  // The address bar shows the visitor's IP as the last path segment: /ip=<address> on the home page, /blogs/ip=<address>
  // on the blog, and so on (also on the 404 page). A static host answers such an unknown path with 404.html, so when a
  // page is opened on an /ip= path, the real page for the path without that segment is fetched and swapped in. If
  // there is no such page, the 404 page stays (it is the right page).
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
    if (home) { sessionStorage.setItem('booted', '1'); if (!seen) mode = calm ? 'calm' : 'full'; }
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
  // Puts the IP into the address as /ip=<address> (home page) or /blogs/ip=<address> (blog); other pages keep their own path and removes any
  // ?ip= / ?visitor= query. Other query parameters and the #hash stay as they were. With ip === null it removes it.
  var write = function (ip) {
    try {
      var parts = location.search.replace(/^\?/, '');
      parts = parts ? parts.split('&') : [];
      var out = parts.filter(function (p) { var k = p.split('=')[0]; return k !== 'visitor' && k !== 'ip'; });
      var search = out.length ? '?' + out.join('&') : '';
      var base = basePath(location.pathname);
      var path = ip ? base + 'ip=' + ip : base;
      var next = path + search + location.hash;
      if (next !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', next);
    } catch (e) { }
  };
  // never show an IP that came from a shared link, not even for a moment
  write(null);

  var cached = null;
  try { cached = sessionStorage.getItem('visitorIp'); } catch (e) { }
  if (okIp(cached)) {
    window.__ip = cached;
    window.__ipPromise = Promise.resolve(cached);
    write(cached);
  } else {
    window.__ipPromise = new Promise(function (resolve) {
      var done = function (ip) {
        if (okIp(ip)) {
          window.__ip = ip;
          try { sessionStorage.setItem('visitorIp', ip); } catch (e) { }
          write(ip);
          resolve(ip);
        } else resolve(null);
      };
      try {
        var ctl = window.AbortController ? new AbortController() : null;
        var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 3500);
        fetch('https://api.ipify.org?format=json', ctl ? { signal: ctl.signal, cache: 'no-store', referrerPolicy: 'no-referrer' } : { cache: 'no-store' })
          .then(function (r) { return r.json(); })
          .then(function (j) { clearTimeout(timer); done(j && j.ip); })
          .catch(function () { done(null); });
      } catch (e) { resolve(null); }
    });
  }
  };
  if (!window.__ipSwap && SEG.test(location.pathname)) {
    window.__ipSwap = true;
    d.style.visibility = 'hidden';
    fetch(basePath(location.pathname) + 'index.html', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('no page'); return r.text(); })
      .then(function (html) { if (html.indexOf('<html') < 0) throw new Error('not a page'); document.open(); document.write(html); document.close(); })
      .catch(function () { d.style.visibility = ''; run(); });
  } else run();
})();
