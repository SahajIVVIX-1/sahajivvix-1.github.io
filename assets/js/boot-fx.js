/* Boot screen brains and visuals ("forward pass"). Loaded by the inline boot script; plain script, no modules.
   Holds the visitor context, the heuristic intent classifier, the greeting, the data loading and the canvas.
   What is real: the progress (B.p), every pulse (one per finished asset), the log numbers (all in the inline part).
   What is illustrative: connection weights are seeded from a random id kept in this browser, and the attention matrix is a
   visualisation seeded from the visitor's context features. Neither is a trained model. */
(function () {
  var B = window.__boot;
  var el = document.getElementById('boot');
  if (!B || !el) return;
  var cv = document.getElementById('boot-cv');
  var stage = el.querySelector('.boot-stage');
  var matCv = document.getElementById('boot-mat');
  var greetEl = document.getElementById('boot-greet');
  if (!cv || !stage) return;
  var g = cv.getContext('2d');
  if (!g) return;

  var calm = B.mode === 'calm';
  var phone = innerWidth < 700;
  var dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
  var NAMES = ['Recruiter', 'Developer', 'Researcher', 'Curious'];
  var COUNTS = phone ? [4, 6, 7, 6, 4] : [6, 9, 10, 9, 4];
  var L = COUNTS.length;

  /* ---------- small helpers ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function softmax(z) { var m = Math.max.apply(null, z); var e = z.map(function (v) { return Math.exp(v - m); }); var s = e.reduce(function (a, b) { return a + b; }, 0); return e.map(function (v) { return v / s; }); }
  var tag = window.__visitor || 'visitor';
  var rand = rng(hash(tag));

  var C = {};
  function readColors() {
    var cs = getComputedStyle(el);
    ['fg', 'ac', 'rule', 'dim', 'bg'].forEach(function (k) { var h = cs.getPropertyValue('--' + k).trim(); C[k] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
    C.dark = document.documentElement.dataset.effectiveTheme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };

  /* ---------- visitor context: computed in the browser (the only network call to a third party is the IP lookup in head.js) ---------- */
  var store = function (area) {
    return function (k, v) {
      try { if (v === undefined) return window[area].getItem(k); window[area].setItem(k, v); } catch (e) { }
      return null;
    };
  };
  var SS = store('sessionStorage');
  var LS = store('localStorage');
  var num = function (n) { return String(n).replace(/\B(?=(\d{3})+$)/g, ','); };
  var today = new Date();
  var H = today.getHours();
  var part = H >= 5 && H < 12 ? 'morning' : H >= 12 && H < 17 ? 'afternoon' : H >= 17 && H < 22 ? 'evening' : 'night';
  var coarse = matchMedia('(pointer: coarse)').matches;
  var device = coarse && innerWidth < 700 ? 'phone' : coarse && innerWidth < 1100 ? 'tablet' : 'desktop';
  var manual = LS('theme');
  var isDark = manual ? manual === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = (isDark ? 'dark' : 'light') + (manual === 'dark' || manual === 'light' ? ' (manual)' : ' (system)');
  // Most apps strip the referrer, so ?ref=linkedin (or utm_source) is honoured as well.
  var qs = new URLSearchParams(location.search);
  var src = (qs.get('ref') || qs.get('utm_source') || '').toLowerCase();
  var host = '';
  try { host = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) { }
  if (host === location.hostname) host = '';
  src = src || host;
  var via = !src ? 'direct' : /linkedin|lnkd/.test(src) ? 'LinkedIn' : /github/.test(src) ? 'GitHub' : /^x$|^x\.com$|^t\.co$|twitter/.test(src) ? 'X' : /google/.test(src) ? 'Google' : /bing|duckduckgo|ecosia|brave|yahoo|search/.test(src) ? 'search' : src;
  var prevVisit = SS('prevVisit');
  if (prevVisit === null) { prevVisit = LS('lastVisit') || ''; SS('prevVisit', prevVisit); }
  var returning = !!prevVisit;
  B.returning = returning;
  B.feat = [['time', part], ['device', device], ['via', via], ['lang', navigator.language || '?'], ['theme', theme], ['returning', returning ? 'yes' : 'no']];

  /* ---------- intent classifier (HEURISTIC) ----------
     Hand-set evidence weights from the context above, passed through a softmax. It is a guess, not a
     measurement: the referrer is the only strong signal, and most visits are "direct", which falls back
     to "curious". The hero lets the visitor correct it ("not you? switch"). */
  var PERSONAS = ['recruiter', 'developer', 'researcher', 'curious'];
  function classify() {
    var z = [0, 0, 0, 0.5];
    var add = function (a, b, c, e) { z[0] += a; z[1] += b; z[2] += c; z[3] += e; };
    if (via === 'LinkedIn') add(2.4, 0, 0, 0);
    else if (via === 'GitHub') add(0, 2.4, 0.5, 0);
    else if (via === 'X') add(0, 0.8, 0.5, 0.6);
    else if (via === 'Google' || via === 'search') add(0, 0.3, 0.6, 0.5);
    // Other referrers that say something about the visitor (hosts, matched loosely).
    else if (/arxiv|scholar|semanticscholar|researchgate|paperswithcode|huggingface|\.edu$|\.ac\.[a-z]+$/.test(src)) add(0, 0.3, 2.2, 0);
    else if (/ycombinator|reddit|stackoverflow|dev\.to|hashnode|lobste/.test(src)) add(0, 1.6, 0.4, 0.2);
    else if (/indeed|glassdoor|naukri|wellfound|angel\.co|greenhouse|lever\.co|workday|unstop/.test(src)) add(2.0, 0, 0, 0);
    else if (via === 'direct') add(0, 0, 0, 0.8);
    else add(0.1, 0.2, 0.2, 0.4);
    if (today.getDay() % 6 !== 0 && H >= 9 && H < 18) add(0.4, 0.1, 0, 0);
    if (H >= 22 || H < 5) add(0, 0.5, 0.2, 0.1);
    if (device === 'desktop') add(0.1, 0.4, 0.2, 0); else if (device === 'phone') add(0.2, 0, 0, 0.3);
    return softmax(z);
  }
  var pr = classify();
  var autoPersona = PERSONAS[pr.indexOf(Math.max.apply(null, pr))];
  var pickP = SS('personaPick');
  var persona = PERSONAS.indexOf(pickP) > -1 ? pickP : autoPersona;
  B.probs = pr;
  SS('persona', JSON.stringify({ p: autoPersona, probs: pr, via: via }));
  window.__persona = { p: persona, auto: autoPersona, probs: pr, via: via };
  document.dispatchEvent(new CustomEvent('persona:ready'));

  /* ---------- greeting ---------- */
  var ROLE = { recruiter: 'recruiter', developer: 'fellow developer', researcher: 'researcher', curious: 'curious visitor' };
  var LOAD = { recruiter: "Loading Sahaj's experience for you.", developer: 'Loading the code and model cards.', researcher: 'Loading the research and metrics.', curious: "Loading Sahaj's work for you." };
  var ghData = null;
  function commits() {
    if (!ghData || !prevVisit) return null;
    var t = Date.parse(prevVisit);
    var ev = ghData.events || [];
    var n = 0;
    for (var i = 0; i < ev.length; i++) if (ev[i].type === 'PushEvent' && Date.parse(ev[i].at) > t) n += ev[i].commits == null ? 1 : ev[i].commits;
    // GitHub only returns the latest events; if all of them are newer than the last visit, more may exist.
    return { count: n, more: ev.length > 0 && Date.parse(ev[ev.length - 1].at) > t };
  }
  function greeting() {
    var n = returning ? commits() : null;
    var text;
    if (returning) {
      text = 'Welcome back. ' + (n === null ? LOAD[persona] : n.count > 0 ? n.count + (n.more ? '+' : '') + ' new commit' + (n.count === 1 && !n.more ? '' : 's') + ' since your last visit.' : 'Nothing new since your last visit.');
    } else {
      text = (part === 'night' ? 'Hello, night owl' : 'Good ' + part) + ', ' + ROLE[persona] + (via === 'direct' ? '' : ' from ' + via) + '. ' + LOAD[persona];
    }
    SS('greeting', text); // the 400 ms version on later pages of this session shows the same greeting
    return text;
  }

  /* ---------- real loading of the data the page uses; each file completes one task ---------- */
  var ago = function (iso) {
    var m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago';
  };
  function readBody(r, on) {
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
  }
  function loadJSON(file, task, label) {
    return fetch('/data/' + file + '.json')
      .then(function (r) { return readBody(r, function (f) { B.setp(task, f); }); })
      .then(function (t) { return JSON.parse(t); })
      .catch(function () { return null; })
      .then(function (v) {
        B.done(task, v ? label(v) + ' · ' + B.kb(B.sizeOf(file + '.json')) : file + ' unavailable');
        return v;
      });
  }
  if (B.mode !== 'mini') {
    window.__data = {
      attention: loadJSON('attention', 'att', function (v) { return 'attention index loaded · ' + num(Object.keys(v).length) + ' words'; }),
      map: loadJSON('map', 'map', function (v) { return 'embedding map loaded · ' + num(v.points.length) + ' points'; }),
    };
    loadJSON('github', 'gh', function (v) { ghData = v; return 'GitHub data · synced ' + ago(v.fetched_at); }).then(function (v) { ghData = v; });
    var im = new Image();
    im.onload = im.onerror = function () { B.done('img', 'portrait decoded · ' + B.kb(B.sizeOf('profile-260'))); };
    im.src = '/assets/img/profile-260.avif';

    B.log('model config · 12 layers · 12 heads');
    setTimeout(function () { B.log('theme: ' + theme); }, 120);
    // the IP is looked up by the head script (api.ipify.org); show it, or say honestly that the lookup failed
    (window.__ipPromise || Promise.resolve(null)).then(function (ip) { B.log('visitor ip · ' + (ip || 'lookup unavailable')); });
    // Input features are "read" one by one; each one lights an input neuron.
    var featEl = document.getElementById('boot-feat');
    B.feat.forEach(function (f, i) {
      setTimeout(function () {
        on('feat', i);
        featEl.textContent = B.feat.slice(0, i + 1).map(function (x) { return x[0] + ': ' + x[1]; }).join(' · ');
      }, 160 + i * 85);
    });
    setTimeout(function () { on('intent'); }, 760);
  }

  /* ---------- network ---------- */
  var nodes = [];
  var W = []; // W[l][i][j]: weight between node i of layer l and node j of layer l+1, in [-1, 1]
  var act = COUNTS.map(function (n) { return new Array(n).fill(0); });
  for (var l = 0; l < L - 1; l++) {
    W[l] = [];
    for (var i = 0; i < COUNTS[l]; i++) { W[l][i] = []; for (var j = 0; j < COUNTS[l + 1]; j++) W[l][i][j] = rand() * 2 - 1; }
  }
  var VW = 0, VH = 0;
  var lines = [];   // lines[l][bucket]: one reusable Path2D per layer gap and weight bucket (3 strokes per gap, not 100)
  var box = null;   // the only region of the full-viewport canvas that changes while the network runs

  function layout() {
    VW = innerWidth; VH = innerHeight;
    var r = stage.getBoundingClientRect();
    var padL = phone ? 12 : 160, padR = phone ? 104 : 190;
    var x0 = r.left + padL, x1 = r.right - padR, y0 = r.top + 12, y1 = r.bottom - 12;
    nodes = COUNTS.map(function (c, l) {
      var a = [];
      for (var i = 0; i < c; i++) a.push({ x: x0 + (x1 - x0) * l / (L - 1), y: y0 + (y1 - y0) * (i + 0.5) / c });
      return a;
    });
    lines = [];
    for (var l = 0; l < L - 1; l++) {
      lines[l] = [new Path2D(), new Path2D(), new Path2D()];
      for (var i = 0; i < COUNTS[l]; i++) for (var j = 0; j < COUNTS[l + 1]; j++) {
        var w = Math.abs(W[l][i][j]), k = w < 0.35 ? 0 : w < 0.7 ? 1 : 2;
        lines[l][k].moveTo(nodes[l][i].x, nodes[l][i].y);
        lines[l][k].lineTo(nodes[l + 1][j].x, nodes[l + 1][j].y);
      }
    }
    box = [r.left - 40, r.top - 30, r.width + 80, r.height + 60]; // same box the CSS gives the canvas
    sizeCanvas();
    lastUpto = -1;
    // matrix canvas
    if (matCv) { var s = Math.round(matCv.clientWidth * dpr) || 88; matCv.width = s; matCv.height = s; }
  }

  // While loading, the canvas only covers the network (a quarter of the pixels to composite).
  // The handoff uses a NEW full-viewport canvas: resizing a visible element would count as a layout shift.
  // The canvas sits inside .boot-stage from the first paint (CSS: 40px / 30px bigger than the stage on every side),
  // so only its pixel buffer is sized here. Changing its on-screen box would count as a layout shift.
  function sizeCanvas() {
    cv.width = Math.round(box[2] * dpr); cv.height = Math.round(box[3] * dpr);
    origin = [box[0], box[1]];
  }
  var origin = [0, 0];

  /* ---------- pulses: one per real event ---------- */
  var pulses = [];
  function pick(p) { var u = rand(), s = 0; for (var i = 0; i < p.length; i++) { s += p[i]; if (u <= s) return i; } return p.length - 1; }
  function addPulse(delay, strength, start) {
    var path = [];
    for (var l = 0; l < L; l++) path.push(l === 0 && start !== undefined ? start : l === L - 1 ? pick(B.probs) : Math.floor(rand() * COUNTS[l]));
    pulses.push({ t0: performance.now() + delay, dur: 850 + rand() * 250, path: path, s: strength, reach: -1 });
  }

  /* ---------- intent bars settle like a softmax ---------- */
  var intentT0 = 0;
  var shownProbs = [0.25, 0.25, 0.25, 0.25];
  var shown = 0; // how many input features have been read
  function updateIntent(now) {
    if (!intentT0) return;
    var u = clamp((now - intentT0) / 800, 0, 1);
    var noise = 2.2 * (1 - u);
    shownProbs = softmax(B.probs.map(function (p) { return Math.log(p) + (rand() - 0.5) * 2 * noise; }));
    if (u >= 1) shownProbs = B.probs.slice();
  }

  /* ---------- attention matrix (visual, seeded by the context features) ---------- */
  var mat = (function () {
    var labels = B.feat.map(function (f) { return f[0] + f[1]; }).concat([tag, 'portfolio']);
    var vecs = labels.map(function (s) { var r = rng(hash(s)); return [0, 1, 2, 3, 4, 5].map(function () { return r() * 2 - 1; }); });
    return vecs.map(function (q) { var row = vecs.map(function (k) { return q.reduce(function (a, v, i) { return a + v * k[i]; }, 0) * 1.4; }); var p = softmax(row); var m = Math.max.apply(null, p); return p.map(function (v) { return v / m; }); });
  })();
  var lastUpto = -1;
  function drawMatrix(p) {
    if (!matCv) return;
    var m = matCv.getContext('2d'), n = 8, s = matCv.width, c = s / n;
    var upto = Math.floor(clamp(p, 0, 1) * n * n + 0.5);
    if (upto === lastUpto) return; // nothing new to show
    lastUpto = upto;
    m.clearRect(0, 0, s, s);
    for (var k = 0; k < n * n; k++) {
      var i = Math.floor(k / n), j = k % n;
      if (k < upto) m.fillStyle = rgba(C.ac, 0.1 + 0.9 * Math.pow(mat[i][j], 1.3));
      else m.fillStyle = rgba(C.rule, 0.55);
      m.fillRect(j * c + 1, i * c + 1, c - 2, c - 2);
    }
  }

  /* ---------- drawing ---------- */
  var fly = null; // set by handoff()
  function lit(l, p) { return clamp(p * (L - 1) - l + 1, 0, 1); }

  function draw(now, p, still) {
    g.setTransform(dpr, 0, 0, dpr, -origin[0] * dpr, -origin[1] * dpr);
    if (fly || !box) g.clearRect(0, 0, VW, VH); else g.clearRect(box[0], box[1], box[2], box[3]);
    if (!nodes.length) return;
    var fade = fly ? clamp(1 - (now - fly.t0) / 350, 0, 1) : 1;

    if (fade > 0) {
      // connections: thickness and opacity follow the weight, opacity also the forward-pass front
      var BA = [0.074, 0.144, 0.21], BW = [0.66, 1.2, 1.7]; // opacity and width per weight bucket
      for (var l = 0; l < L - 1; l++) {
        var lv = lit(l + 1, p) * fade;
        if (lv <= 0.01) continue;
        for (var kb = 0; kb < 3; kb++) { g.strokeStyle = rgba(C.fg, BA[kb] * lv); g.lineWidth = BW[kb]; g.stroke(lines[l][kb]); }
      }
      // pulses
      for (var k = pulses.length - 1; k >= 0; k--) {
        var pu = pulses[k];
        var u = (now - pu.t0) / pu.dur;
        if (u < 0) continue;
        if (u >= 1) { pulses.splice(k, 1); continue; }
        var s = u * (L - 1), seg = Math.min(L - 2, Math.floor(s)), f = s - seg;
        var a = nodes[seg][pu.path[seg]], b = nodes[seg + 1][pu.path[seg + 1]];
        for (var q = pu.reach + 1; q <= Math.floor(s) && q < L; q++) { act[q][pu.path[q]] = Math.min(1, act[q][pu.path[q]] + pu.s); pu.reach = q; }
        var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        var tx = a.x + (b.x - a.x) * Math.max(0, f - 0.25), ty = a.y + (b.y - a.y) * Math.max(0, f - 0.25);
        var mx = a.x + (b.x - a.x) * Math.max(0, f - 0.1), my = a.y + (b.y - a.y) * Math.max(0, f - 0.1);
        g.lineCap = 'round';
        g.lineWidth = 1.2 + 1.6 * pu.s;
        g.strokeStyle = rgba(C.ac, 0.3 * fade); g.beginPath(); g.moveTo(tx, ty); g.lineTo(mx, my); g.stroke();
        g.strokeStyle = rgba(C.ac, 0.95 * fade); g.beginPath(); g.moveTo(mx, my); g.lineTo(x, y); g.stroke();
      }
    }

    // neurons
    var out = L - 1;
    for (var l2 = 0; l2 < L; l2++) {
      var lv2 = lit(l2, p);
      for (var i2 = 0; i2 < COUNTS[l2]; i2++) {
        var n = nodes[l2][i2];
        if (l2 === out && intentT0) act[l2][i2] = Math.max(act[l2][i2] * 0.9, shownProbs[i2]);
        else act[l2][i2] *= still ? 1 : 0.972;
        var A = Math.max(act[l2][i2], l2 === 0 ? (i2 < shown ? 0.55 : 0.12) : 0.06 * lv2) * (fly ? 0 : 1);
        var r = 3 + 4.2 * A;
        var nx = n.x, ny = n.y, rr = r;
        if (fly) {
          var m = fly.moves[l2 + ':' + i2];
          var uu = clamp((now - fly.t0 - m.delay) / fly.dur, 0, 1), e = ease(uu);
          nx = n.x + (m.tx - n.x) * e; ny = n.y + (m.ty - n.y) * e;
          rr = 3 + (1.6 - 3) * e;
          g.fillStyle = rgba(C.fg, 0.95 * (1 - clamp((now - fly.t0 - fly.dur - m.delay) / 250, 0, 1)));
          g.beginPath(); g.arc(nx, ny, rr, 0, 6.2832); g.fill();
          continue;
        }
        if (A > 0.3 && C.dark) { g.fillStyle = rgba(l2 === out ? C.ac : C.fg, 0.16 * A); g.beginPath(); g.arc(nx, ny, rr * 2.3, 0, 6.2832); g.fill(); } // soft glow without shadowBlur (slow)
        g.fillStyle = A > 0.12 ? rgba(l2 === out ? C.ac : C.fg, 0.25 + 0.75 * A) : rgba(C.bg, 1);
        g.strokeStyle = rgba(C.fg, (0.2 + 0.6 * lv2) * (A > 0.12 ? 0.5 : 1));
        g.lineWidth = 1;
        g.beginPath(); g.arc(nx, ny, rr, 0, 6.2832); g.fill(); g.stroke();
      }
    }

    if (fly) return;
    // input feature labels (desktop; phones show them as text above the canvas)
    g.font = '11px "JetBrains Mono", ui-monospace, monospace';
    g.textBaseline = 'middle';
    if (!phone) for (var f2 = 0; f2 < B.feat.length && f2 < COUNTS[0]; f2++) {
      var nd = nodes[0][f2];
      var on = f2 < shown;
      g.textAlign = 'right';
      var val = B.feat[f2][1];
      g.fillStyle = rgba(on ? C.fg : C.dim, on ? 1 : 0.5);
      g.fillText(on ? val : '···', nd.x - 14, nd.y);
      var vw = g.measureText(on ? val : '···').width;
      g.fillStyle = rgba(C.dim, 1);
      g.fillText(B.feat[f2][0] + ' ·', nd.x - 14 - vw - 5, nd.y);
    }
    // output layer: intent probabilities as labelled bars
    if (intentT0) {
      var best = shownProbs.indexOf(Math.max.apply(null, shownProbs));
      for (var o = 0; o < COUNTS[out]; o++) {
        var no = nodes[out][o], pr = shownProbs[o], isBest = o === best && now - intentT0 > 800;
        g.textAlign = 'left';
        g.fillStyle = rgba(isBest ? C.ac : C.fg, 1);
        g.font = (isBest ? '600 ' : '') + (phone ? '10px' : '11px') + ' "JetBrains Mono", ui-monospace, monospace';
        g.fillText(NAMES[o] + ' ' + Math.round(pr * 100) + '%', no.x + 14, no.y - 5);
        var bw = phone ? 66 : 110;
        g.fillStyle = rgba(C.rule, 1); g.fillRect(no.x + 14, no.y + 5, bw, 3);
        g.fillStyle = rgba(isBest ? C.ac : C.fg, isBest ? 1 : 0.55); g.fillRect(no.x + 14, no.y + 5, bw * pr, 3);
      }
    }
  }

  /* ---------- loop ---------- */
  var raf = 0;
  function frame(now) {
    if (!el.isConnected) return;
    raf = requestAnimationFrame(frame);
    updateIntent(now);
    var p = calm ? 1 : B.p;
    draw(now, p, false);
    drawMatrix(p);
    if (fly && now - fly.t0 > fly.dur + 700) { cv.style.opacity = '0'; cancelAnimationFrame(raf); }
  }

  /* ---------- events from the inline engine ---------- */
  function on(type, data) {
    var now = performance.now();
    if (type === 'task') {
      if (data.id === 'done') { for (var i = 0; i < 4; i++) addPulse(i * 70, 0.7); return; }
      var n = Math.max(1, Math.round(data.w * 12));
      for (var k = 0; k < n; k++) addPulse(k * 90, clamp(0.45 + data.w * 2.2, 0, 1));
    } else if (type === 'feat') {
      shown = Math.max(shown, data + 1);
      addPulse(0, 0.55, data % COUNTS[0]);
    } else if (type === 'intent') {
      intentT0 = now;
    }
  }

  /* ---------- greeting decoded token by token ---------- */
  var POOLS = [
    ['good', 'hello', 'hi', 'hey', 'welcome'], ['morning', 'afternoon', 'evening', 'night'],
    ['recruiter', 'developer', 'researcher', 'visitor'], ['linkedin', 'github', 'x', 'google', 'search'],
    ['loading', 'fetching', 'reading', 'opening'], ['experience', 'work', 'projects', 'code', 'research'],
    ['code', 'models', 'metrics', 'research'], ['commit', 'commits', 'push', 'pushes'], ['new', 'recent', 'fresh', 'latest'],
    ['back', 'again', 'home', 'in'], ['you', 'me', 'us', 'them'], ['for', 'to', 'with', 'from'], ['owl', 'fox', 'bird', 'cat'],
  ];
  var GENERIC = ['the', 'and', 'of', 'to', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'at'];
  var ROLE_IDX = { recruiter: 0, developer: 1, researcher: 2, visitor: 3 };
  var skipFlag = false, decoding = false;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function rivals(word) {
    var lw = word.toLowerCase();
    var pool = (lw in ROLE_IDX ? POOLS[2] : POOLS.filter(function (p) { return p.indexOf(lw) > -1; })[0]) || GENERIC;
    var alts = pool.filter(function (w) { return w !== lw; });
    var r = rng(hash(word + tag));
    alts = alts.slice().sort(function () { return r() - 0.5; }).slice(0, 3);
    if (lw in ROLE_IDX) {
      // the role token shows the REAL classifier probabilities
      var all = POOLS[2].map(function (w) { return { t: w, p: B.probs[ROLE_IDX[w]] }; });
      var chosen = all.filter(function (x) { return x.t === lw; })[0];
      return [chosen].concat(all.filter(function (x) { return x.t !== lw; }).sort(function (a, b) { return b.p - a.p; })).slice(0, 3);
    }
    var pc = 0.55 + r() * 0.38, rest = 1 - pc, shares = alts.map(function () { return 0.3 + r(); }), ss = shares.reduce(function (a, b) { return a + b; }, 0);
    return [{ t: lw, p: pc }].concat(alts.map(function (a, i) { return { t: a, p: rest * shares[i] / ss }; }));
  }

  function tokenize(text) {
    var out = [], pend = '';
    (text.match(/[A-Za-z0-9'’+]+|[.,!]|\s+/g) || []).forEach(function (m) { if (/^\s+$/.test(m)) pend = ' '; else { out.push(pend + m); pend = ''; } });
    return out;
  }

  function decode(text, done) {
    decoding = true;
    var toks = tokenize(text);
    greetEl.textContent = '';
    var last = null;
    (async function () {
      for (var i = 0; i < toks.length && !skipFlag; i++) {
        var word = toks[i].trim(), isWord = /[A-Za-z0-9]/.test(word);
        var span = document.createElement('span');
        span.className = 'tk is-new';
        span.textContent = toks[i];
        greetEl.appendChild(span);
        if (isWord) {
          if (last) last.remove();
          var rv = rivals(word);
          var dist = document.createElement('div');
          dist.className = 'dist';
          dist.innerHTML = rv.map(function (x) { return '<div class="dist-row"><span class="dist-tok">' + x.t + '</span><span class="dist-bar"><i style="--p:' + (x.p * 100).toFixed(0) + '%"></i></span><span class="dist-p">' + x.p.toFixed(2) + '</span></div>'; }).join('');
          dist.firstChild.classList.add('is-pick');
          span.appendChild(dist);
          // keep the whole chart on screen (measure it, then nudge it sideways)
          var dr = dist.getBoundingClientRect();
          if (dr.right > innerWidth - 6) dist.style.left = (innerWidth - 6 - dr.right) + 'px';
          else if (dr.left < 6) dist.style.left = (6 - dr.left) + 'px';
          last = dist;
          await sleep(62);
        } else await sleep(26);
      }
      if (last) { last.classList.add('is-out'); setTimeout(function () { last && last.remove(); }, 320); }
      if (skipFlag) greetEl.textContent = text;
      decoding = false;
      done();
    })();
  }
  function skipDecode() { skipFlag = true; }

  /* ---------- the network collapses into the hero's first tokens ---------- */
  function handoff() {
    var gen = document.querySelector('.hero-name .gen');
    if (!gen || calm) return 0;
    var r = gen.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.width < 40) return 0;
    var cs = getComputedStyle(gen.parentElement);
    var fs = parseFloat(cs.fontSize);
    var off = document.createElement('canvas');
    var oc = off.getContext('2d', { willReadFrequently: true });
    var font = 'italic 400 ' + fs + 'px "Instrument Serif", Georgia, serif';
    oc.font = font;
    if ('letterSpacing' in oc) oc.letterSpacing = (-0.035 * fs) + 'px';
    var asc = oc.measureText('Sahaj Saliya').fontBoundingBoxAscent || fs * 0.9;
    var tw = Math.ceil(oc.measureText('Sahaj Saliya').width) + 6;
    off.width = tw; off.height = Math.ceil(fs * 1.4);
    oc.font = font;
    if ('letterSpacing' in oc) oc.letterSpacing = (-0.035 * fs) + 'px';
    oc.textBaseline = 'alphabetic';
    oc.fillText('Sahaj Saliya', 2, asc);
    var data = oc.getImageData(0, 0, off.width, off.height).data;
    var pts = [], step = Math.max(3, Math.round(fs / 40));
    for (var y = 0; y < off.height; y += step) for (var x = 0; x < off.width; x += step) if (data[(y * off.width + x) * 4 + 3] > 140) pts.push([x, y]);
    if (pts.length < 20) return 0;
    var all = [];
    nodes.forEach(function (layer, l) { layer.forEach(function (n, i) { all.push({ l: l, i: i, x: n.x, y: n.y }); }); });
    var rr = rng(hash(tag + 'fly'));
    var targets = [];
    for (var k = 0; k < all.length; k++) targets.push(pts[Math.floor(rr() * pts.length)]);
    all.sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    targets.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    // Canvas text starts at x = 2 with its baseline at y = asc, the same offsets the inline box has on the page.
    var moves = {};
    all.forEach(function (n, k) { moves[n.l + ':' + n.i] = { tx: r.left + targets[k][0] - 2, ty: r.top + targets[k][1], delay: rr() * 160 }; });
    // Fresh full-viewport canvas for the flight; the loading canvas is hidden. New elements are not layout shifts.
    var big = document.createElement('canvas');
    big.style.cssText = 'position:absolute;left:0;top:0;width:' + VW + 'px;height:' + VH + 'px;z-index:0;transition:opacity .25s';
    big.width = Math.round(VW * dpr); big.height = Math.round(VH * dpr);
    cv.style.visibility = 'hidden';
    el.insertBefore(big, el.firstChild);
    cv = big; g = big.getContext('2d'); origin = [0, 0];
    fly = { t0: performance.now(), dur: 780, moves: moves };
    return 780 + 160 + 700;
  }

  var api = { on: on, decode: decode, skipDecode: skipDecode, handoff: handoff, greeting: greeting };

  readColors();
  document.addEventListener('themechange', function () { readColors(); if (calm) staticDraw(); });
  layout();
  var rzt;
  addEventListener('resize', function () { clearTimeout(rzt); rzt = setTimeout(function () { layout(); if (calm) staticDraw(); }, 120); });

  function staticDraw() {
    // reduced motion: one still frame of the finished forward pass
    lastUpto = -1;
    for (var l = 0; l < L; l++) for (var i = 0; i < COUNTS[l]; i++) act[l][i] = l === L - 1 ? B.probs[i] : 0.2 + 0.5 * rand();
    shown = B.feat.length; intentT0 = 1; shownProbs = B.probs.slice();
    draw(performance.now() + 5000, 1, true);
    drawMatrix(1);
  }

  setTimeout(layout, 350); // fonts and scrollbars can shift the stage a little after first paint
  B.attach(api);
  if (calm) staticDraw(); else raf = requestAnimationFrame(frame);
})();
