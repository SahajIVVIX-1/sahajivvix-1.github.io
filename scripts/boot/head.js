/* Runs in <head>, before first paint.
   1. Picks the boot mode:
        full  first visit of a session, home page: the whole "forward pass"
        calm  same, but the visitor prefers reduced motion: static network + greeting
        mini  anything else (same-session return, other pages): greeting only, ~400 ms
   2. Gives the visitor a tag (random 6 characters, kept in this browser) and puts it in the address bar. */
(function () {
  var d = document.documentElement;
  var mode = 'mini';
  try {
    // Only the home page counts: reading the blog first must not use up the full boot.
    var seen = sessionStorage.getItem('booted');
    var home = location.pathname === '/' || location.pathname === '/index.html';
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (home) { sessionStorage.setItem('booted', '1'); if (!seen) mode = calm ? 'calm' : 'full'; }
  } catch (e) { }
  d.className += ' booting boot-' + mode;

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

  // Any tag in the URL that is not this browser's own (for example from a shared link) is replaced.
  // Other query parameters and the #hash are left exactly as they were.
  try {
    var parts = location.search.replace(/^\?/, '');
    parts = parts ? parts.split('&') : [];
    var found = false;
    var changed = false;
    parts = parts.map(function (p) {
      if (p.split('=')[0] !== 'visitor') return p;
      found = true;
      if (p === 'visitor=' + tag) return p;
      changed = true;
      return 'visitor=' + tag;
    });
    if (!found) { parts.push('visitor=' + tag); changed = true; }
    if (changed) history.replaceState(history.state, '', location.pathname + '?' + parts.join('&') + location.hash);
  } catch (e) { }
})();
