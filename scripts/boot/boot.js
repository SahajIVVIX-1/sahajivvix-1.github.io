/* "Forward pass" boot screen: the small inline core. Runs right after the #boot element is parsed.
   - Progress is REAL: tasks are fonts, the main script, the renderer, and (registered by boot-fx.js) the data files.
   - Everything is computed in the browser; nothing is sent anywhere.
   - The heavy parts (visitor context, heuristic intent classifier, greeting, canvas) live in assets/js/boot-fx.js. */
(function () {
  var d = document.documentElement;
  var el = document.getElementById('boot');
  if (!el) return;
  var cl = d.classList;
  var mode = cl.contains('boot-full') ? 'full' : cl.contains('boot-calm') ? 'calm' : cl.contains('boot-mini') ? 'mini' : '';
  if (!mode) return;
  var rich = mode !== 'mini';
  var $ = function (id) { return document.getElementById(id); };
  var kb = function (n) { return (n / 1024).toFixed(1) + ' KB'; };

  // Weights sum to 1. boot-fx.js completes att / map / gh / img.
  var W = rich ? { f0: 0.07, f1: 0.07, f2: 0.07, js: 0.22, fx: 0.06, att: 0.14, map: 0.2, gh: 0.08, img: 0.09 } : { f0: 0.17, f1: 0.17, f2: 0.16, js: 0.5 };
  var T = {};
  Object.keys(W).forEach(function (k) { T[k] = { w: W[k], p: 0, done: false }; });
  var real = function () { var s = 0; for (var k in T) s += T[k].w * T[k].p; return s; };

  var B = window.__boot = {
    mode: mode, ev: [], fx: null, p: 0, kb: kb,
    emit: function (t, v) { B.ev.push([t, v]); if (B.fx) B.fx.on(t, v); },
    attach: function (fx) { B.fx = fx; B.ev.forEach(function (e) { fx.on(e[0], e[1]); }); },
    setp: function (k, p) { if (T[k] && !T[k].done) T[k].p = p; },
    done: complete, log: log,
    size: function (test) {
      var s = 0;
      performance.getEntriesByType('resource').forEach(function (r) { if (test(r.name)) s += r.transferSize || r.encodedBodySize || 0; });
      return s;
    },
    mark: function (k) {
      if (k === 'js') complete('js', 'sampler ready · ' + kb(B.size(function (n) { return /\/assets\/js\//.test(n) && !/boot-fx/.test(n); })));
    }
  };
  B.sizeOf = function (part) { return B.size(function (n) { return n.indexOf(part) > -1; }); };

  function complete(k, msg) {
    var t = T[k];
    if (!t || t.done) return;
    t.p = 1; t.done = true;
    B.emit('task', { id: k, w: t.w });
    if (msg) log(msg);
  }

  var faces = ['italic 400 1em "Instrument Serif"', '400 1em "Inter Tight"', '400 1em "JetBrains Mono"'];
  var loaded = 0;
  var fontDone = function () {
    complete('f' + loaded, null);
    if (++loaded === faces.length) log('fonts resolved · 3/3 · ' + kb(B.sizeOf('.woff2')));
  };
  faces.forEach(function (f) { if (document.fonts && document.fonts.load) document.fonts.load(f).then(fontDone, fontDone); else fontDone(); });

  if (rich) {
    var s = document.createElement('script');
    s.src = '/assets/js/boot-fx.js?v=__V__';
    s.async = true;
    s.onload = s.onerror = function () { complete('fx', null); };
    document.head.appendChild(s);
  }

  /* ---------- streaming log: 3-4 lines visible, older ones fade upward ---------- */
  var logEl = $('boot-log');
  var queue = [];
  var pumping = false;
  function log(msg) {
    if (!rich) return;
    queue.push(msg);
    if (!pumping) pump();
  }
  function pump() {
    var msg = queue.shift();
    if (!msg) { pumping = false; return; }
    pumping = true;
    var li = document.createElement('li');
    li.textContent = msg;
    li.className = 'flick';
    logEl.appendChild(li);
    while (logEl.children.length > 5) logEl.removeChild(logEl.firstChild);
    setTimeout(pump, 130);
  }

  /* ---------- timeline ---------- */
  var MIN = rich ? 4600 : 400;
  var MAX = rich ? 6500 : 800;
  var t0 = performance.now();
  var shown = 0;
  var done = false;
  var decStarted = false;
  var decDone = false;
  var greetText = '';
  var capEl = $('boot-cap');
  var greetEl = $('boot-greet');
  var live = $('boot-live');
  var announce = function (t) { if (live) live.textContent = t; };
  announce("Loading Sahaj Saliya's portfolio");

  function startDecode() {
    decStarted = true;
    var fx = B.fx;
    // Full text comes from boot-fx.js (it knows the visitor context). Mini reuses the greeting of this session.
    try { greetText = fx && fx.greeting ? fx.greeting() : sessionStorage.getItem('greeting') || ''; } catch (e) { }
    greetText = greetText || "Loading Sahaj Saliya's portfolio.";
    var fin = function () { decDone = true; announce(greetText); };
    if (mode === 'full' && fx && fx.decode) fx.decode(greetText, fin);
    else { greetEl.textContent = greetText; fin(); }
  }

  function tick() {
    if (done) return;
    var t = performance.now() - t0;
    var r = real();
    // The display never runs ahead of real progress, nor fills faster than ~3.6 s: the network is built from it,
    // one connection at a time, so the last connection lands as loading completes and the build stays readable.
    var cap = Math.min(r, t / (rich ? 3600 : 1100), 1);
    shown += (cap - shown) * 0.2;
    if (cap - shown < 0.002) shown = cap;
    B.p = shown;
    if (rich) capEl.firstChild.textContent = 'forward pass · layer ' + Math.min(5, 1 + Math.floor(shown * 5)) + '/5 · ' + Math.round(shown * 100) + '%';
    var waitGh = rich && B.returning && !T.gh.done && t < 1000;
    var ready = !rich || ((B.fx || t >= 1400) && t >= 600 && (shown >= 0.5 || t >= 1400));
    if (!decStarted && ready && !waitGh) startDecode();
    if (t >= MAX) return go('late');
    if (decDone && t >= MIN && (!rich || (r >= 1 && shown >= 0.995))) return go('ok');
    (window.requestAnimationFrame || setTimeout)(tick, 16);
  }

  function go(how) {
    if (done) return;
    done = true;
    if (!decStarted) startDecode();
    if (!decDone) { if (B.fx && B.fx.skipDecode) B.fx.skipDecode(); else greetEl.textContent = greetText; announce(greetText); }
    if (how === 'ok') {
      B.emit('task', { id: 'done' });
      log('forward pass complete · ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s');
    }
    // Only the home page counts as a visit, so reading the blog first does not make a visitor "returning".
    if (rich) try { localStorage.setItem('lastVisit', new Date().toISOString()); } catch (e) { }
    var fly = mode === 'full' && how !== 'skip' && B.fx && B.fx.handoff;
    var ms = 0;
    el.classList.add('out');
    cl.add('boot-reveal');
    cl.remove('booting');
    if (fly) ms = B.fx.handoff() || 0;
    // the hero starts once the network has collapsed into it (the output neuron is the logo's cursor dot by then)
    setTimeout(function () { document.dispatchEvent(new Event('boot:done')); }, ms);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      cl.remove('boot-full', 'boot-calm', 'boot-mini');
    }, 900 + ms);
  }

  // Click or any key skips.
  var skip = function () { go('skip'); };
  document.addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });
  setTimeout(function () { go('late'); }, MAX + 400);
  tick();
})();
