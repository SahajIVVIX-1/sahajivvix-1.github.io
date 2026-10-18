/* Boot screen, runs right after the #boot element is parsed.
   Progress is real: fonts, the main script (main.js calls __boot.mark('js')) and the data JSON files.
   Shown at least MIN ms (so it never flashes) and at most MAX ms (then the page is revealed anyway). */
(function () {
  var d = document.documentElement;
  var el = document.getElementById('boot');
  if (!el) return;
  var full = d.classList.contains('boot-full');
  if (!full && !d.classList.contains('boot-quick')) return;

  var P = { fonts: 0, js: 0, data: 0 };
  var W = full ? { fonts: 0.3, js: 0.3, data: 0.4 } : { fonts: 0.5, js: 0.5, data: 0 };
  var MIN = full ? 800 : 260;
  var MAX = full ? 2500 : 700;
  var fill = document.getElementById('boot-fill');
  var pct = document.getElementById('boot-pct');
  var log = document.getElementById('boot-log');
  var typed = document.getElementById('boot-type');
  var t0 = performance.now();
  var shown = 0;
  var done = false;
  var queue = [];
  var pumping = false;

  window.__boot = { mark: function (k) { if (k === 'js') { P.js = 1; line('attention heads: 12'); } } };

  // Fonts.
  var faces = ['italic 400 1em "Instrument Serif"', '400 1em "Inter Tight"', '400 1em "JetBrains Mono"'];
  var loaded = 0;
  var fontDone = function () {
    loaded++;
    P.fonts = loaded / faces.length;
    if (loaded === faces.length) line('tokenizer ready');
  };
  faces.forEach(function (f) {
    if (document.fonts && document.fonts.load) document.fonts.load(f).then(fontDone, fontDone); else fontDone();
  });

  // Data files used by the attention lines and the embedding map (full boot only).
  if (full) {
    window.__data = {};
    var frac = { attention: 0, map: 0 };
    var update = function () { P.data = (frac.attention + frac.map) / 2; };
    var read = function (r, on) {
      var len = Number(r.headers.get('content-length')) || 0;
      if (!r.body || !r.body.getReader) return r.text();
      var rd = r.body.getReader();
      var parts = [];
      var got = 0;
      return rd.read().then(function step(x) {
        if (x.done) return new Blob(parts).text();
        parts.push(x.value);
        got += x.value.length;
        if (len) on(Math.min(0.95, got / len));
        return rd.read().then(step);
      });
    };
    [['attention', 'attention'], ['latent-map', 'map']].forEach(function (n) {
      var key = n[1];
      window.__data[key] = fetch('/data/' + n[0] + '.json')
        .then(function (r) { return read(r, function (f) { frac[key] = f; update(); }); })
        .then(function (t) { return JSON.parse(t); })
        .catch(function () { return null; })
        .then(function (v) {
          frac[key] = 1;
          update();
          if (frac.attention === 1 && frac.map === 1) line('portfolio embedded', 'embedding portfolio…');
          return v;
        });
    });
    line('embedding portfolio…');
  }

  // Typed first line.
  var text = 'loading weights...';
  if (full) {
    var i = 0;
    var type = function () {
      if (done) return;
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(type, 30);
    };
    type();
  }

  // Status lines are queued so each one is readable, and flicker briefly as they appear.
  function line(msg, replace) {
    if (!full) return;
    queue.push([msg, replace]);
    if (!pumping) pump();
  }
  function pump() {
    var item = queue.shift();
    if (!item) { pumping = false; return; }
    pumping = true;
    var li = null;
    if (item[1]) {
      var items = log.children;
      for (var k = 0; k < items.length; k++) if (items[k].textContent === item[1]) li = items[k];
    }
    if (!li) { li = document.createElement('li'); log.appendChild(li); }
    li.textContent = item[0];
    li.className = '';
    void li.offsetWidth;
    li.className = 'flick';
    setTimeout(pump, 150);
  }

  function paint(v) {
    fill.style.transform = 'scaleX(' + v + ')';
    if (pct) pct.textContent = Math.round(v * 100) + '%';
  }

  function real() { return P.fonts * W.fonts + P.js * W.js + P.data * W.data; }

  function tick() {
    if (done) return;
    var elapsed = performance.now() - t0;
    var r = real();
    // The bar can never run ahead of real progress, nor fill faster than MIN allows.
    var cap = Math.min(r, elapsed / MIN, 1);
    shown += (cap - shown) * 0.25;
    if (cap - shown < 0.002) shown = cap;
    paint(shown);
    if (elapsed >= MAX) return finish(r >= 1 ? 'ok' : 'late');
    if (r >= 1 && shown >= 1 && elapsed >= MIN) return finish('ok');
    (window.requestAnimationFrame || setTimeout)(tick, 16);
  }

  function finish(how) {
    if (done) return;
    done = true;
    if (how === 'ok') { paint(1); line('ready'); }
    var go = function () {
      el.classList.add('out');
      d.classList.add('boot-reveal');
      d.classList.remove('booting');
      document.dispatchEvent(new Event('boot:done'));
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
        d.classList.remove('boot-full', 'boot-quick');
      }, 900);
    };
    setTimeout(go, full && how === 'ok' ? 260 : 0);
  }

  // Click or any key skips.
  var skip = function () { finish('skip'); };
  document.addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });

  // If anything above stalls, never leave the screen up.
  setTimeout(function () { finish('late'); }, MAX + 400);
  tick();
})();
