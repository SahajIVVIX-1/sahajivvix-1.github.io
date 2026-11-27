/* Boot screen brains and visuals ("forward pass"). Loaded by the inline boot script; plain script, no modules.
   Holds the visitor context, the heuristic intent classifier, the greeting, the data loading and the canvas.
   What is real: the progress (B.p) that drives the build, every pulse (one per finished asset), the log numbers.
   What is illustrative: the architecture (an MLP, a CNN or a transformer, picked per load; ?arch= forces one), its
   weights (seeded per load) and the attention matrix (seeded from the visitor's context). None is a trained model.
   The network is built as a forward pass: inputs light up, then every connection draws from its start to its end
   neuron one after another, layer by layer; a neuron activates when its last incoming connection lands, and the
   last connection lands exactly when loading reaches 100%. */
(function () {
  var B = window.__boot;
  var el = document.getElementById('boot');
  if (!B || !el) return;
  var cv = document.getElementById('boot-cv');
  var stage = el.querySelector('.boot-stage');
  var matCv = document.getElementById('boot-mat');
  var greetEl = document.getElementById('boot-greet');
  var clockEl = document.getElementById('boot-clock');
  if (!cv || !stage) return;
  var g = cv.getContext('2d');
  if (!g) return;

  var calm = B.mode === 'calm';
  var phone = innerWidth < 700;
  var vertical = innerWidth < 600; // phones: the network flows top to bottom
  var dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
  var NAMES = ['Recruiter', 'Developer', 'Researcher', 'Curious'];

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
  // The visitor's own clock and timezone.
  var today = new Date();
  var H = today.getHours();
  var part = H >= 5 && H < 12 ? 'morning' : H >= 12 && H < 17 ? 'afternoon' : H >= 17 && H < 21 ? 'evening' : 'night';
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { }
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

  /* ---------- greeting: the visitor's local time of day, a different line on every load ---------- */
  var BANK = {
    morning: [
      'Good morning. Calibrating attention weights to what you care about.',
      'Good morning. Warming up the embeddings while your coffee cools.',
      'Morning. Compiling a portfolio from the overnight commits.',
      'Good morning. Synthesising three years of work into one page.',
      'Bright and early. Tokenising projects, metrics and a little ambition.',
      'Good morning. Orchestrating agents before the first meeting of your day.',
      'Morning, early riser. Distilling the work down to what matters.',
      'Good morning. Initialising the model cards and their honest limits.',
      'Fresh morning, fresh weights. Assembling the forward pass for you.',
      'Good morning. Re-ranking the projects by what you are likely to open.',
      'Morning. Quantising a long resume into a short, sharp page.',
      'Good morning. Bootstrapping the map of everything Sahaj has built.',
      'Good morning. Streaming in the latest commits, one token at a time.',
      'Morning has arrived. Aligning retrieval, vision and agents for you.',
      'Good morning. Decoding the work, sampling at temperature zero point seven.',
      'Morning. Normalising the noise so the signal reads first.',
      'Good morning. Precomputing the answers to the questions you might ask.',
      'Early start. Indexing the projects so the chatbot can cite them.',
      'Good morning. Rehydrating the embedding map from last night\'s build.',
      'Good morning. Finetuning the first impression, gently.',
      'Morning, curious mind. Unfolding the projects like attention heads.',
      'Good morning. Composing the page from real data, nothing invented.',
      'Rise and shine. Propagating context through every layer of the site.',
      'Good morning. Benchmarking the work against honest baselines.',
      'Morning. Weaving README text, metrics and code into one story.',
      'Good morning. Untangling the agents, one tool call at a time.',
      'Morning light. Converging the training curve before you scroll.',
      'Good morning. Annotating every result with its source.',
      'A clear morning. Tracing the shortest path to the work you want.',
      'Good morning. Serialising a mind full of models into something readable.',
      'Morning. Cross-validating the claims before they reach the page.',
      'Good morning. Lighting the neurons one connection at a time.',
    ],
    afternoon: [
      'Good afternoon. Orchestrating agents, embeddings and a little curiosity.',
      'Afternoon. Synthesising a portfolio for you, one token at a time.',
      'Good afternoon. Retrieving the projects that answer your questions best.',
      'Afternoon break? Distilling the work into a quick, honest read.',
      'Good afternoon. Re-weighting the attention towards what you came for.',
      'Afternoon. Compiling model cards, metrics and their limits.',
      'Good afternoon. Running a forward pass through everything Sahaj built.',
      'Midday. Calibrating the confidence of every claim on this page.',
      'Good afternoon. Batch-processing three years of experiments for you.',
      'Afternoon. Projecting a high-dimensional career onto one readable page.',
      'Good afternoon. Sampling the projects at a warm temperature.',
      'Afternoon. Indexing READMEs so every answer can cite its source.',
      'Good afternoon. Assembling the map, the agents and the chat.',
      'Afternoon light. Reducing dimensions until the story is clear.',
      'Good afternoon. Grading the work against the benchmarks that matter.',
      'Afternoon. Untangling multi-agent graphs into plain sentences.',
      'Good afternoon. Streaming the context window into your browser.',
      'Afternoon. Converging embeddings, code and results into one view.',
      'Good afternoon. Shortlisting the parts worth your next five minutes.',
      'Afternoon. Decoding the commits and the reasons behind them.',
      'Good afternoon. Rendering the work exactly as it was measured.',
      'Afternoon, hello. Tokenising experience into something you can skim.',
      'Good afternoon. Propagating your intent through every layer.',
      'Afternoon. Optimising the page for one reader: you.',
      'Good afternoon. Rehearsing the answers the chatbot will give.',
      'Afternoon. Fusing vision, retrieval and agents into one portfolio.',
      'Good afternoon. Lighting up the attention heads that fit your visit.',
      'Afternoon. Benchmarking curiosity against the time you have.',
      'Good afternoon. Stitching together models, metrics and honest limits.',
      'Afternoon. Precomputing the shortest route to the right project.',
      'Good afternoon. Normalising three years of work into one forward pass.',
      'Afternoon. Annotating results so you can check every number.',
    ],
    evening: [
      'Good evening. Synthesising a portfolio for you, one token at a time.',
      'Evening. Distilling the day\'s commits into a calm, clear page.',
      'Good evening. Orchestrating agents while the day winds down.',
      'Evening light. Calibrating attention to the work you will want to see.',
      'Good evening. Compiling model cards with their honest limits.',
      'Evening. Retrieving the projects worth an unhurried read.',
      'Good evening. Running one last forward pass for today.',
      'Evening. Re-ranking the work by what you came here for.',
      'Good evening. Tokenising three years of experiments into one page.',
      'Evening. Folding embeddings, code and results into a single story.',
      'Good evening. Decoding the work at a thoughtful temperature.',
      'Evening, welcome. Indexing every README so the answers have sources.',
      'Good evening. Assembling the map of everything Sahaj has built.',
      'Evening. Projecting a long resume onto one readable screen.',
      'Good evening. Grading every claim against its benchmark.',
      'Evening. Untangling multi-agent graphs into plain language.',
      'Good evening. Streaming the context window, softly.',
      'Evening. Converging the training curve before you scroll.',
      'Good evening. Shortlisting what deserves your evening attention.',
      'Evening. Reconstructing the reasons behind each project.',
      'Good evening. Rendering results exactly as they were measured.',
      'Evening. Propagating your intent through every layer of the site.',
      'Good evening. Weaving vision, retrieval and agents together.',
      'Evening. Lighting the neurons one connection at a time.',
      'Good evening. Normalising the noise so the signal arrives first.',
      'Evening. Rehydrating the embedding map from today\'s build.',
      'Good evening. Benchmarking the work against honest baselines.',
      'Evening. Serialising a busy mind into a quiet page.',
      'Good evening. Annotating each result with where it came from.',
      'Evening. Precomputing answers to the questions you might ask.',
      'Good evening. Composing the page from real data, nothing invented.',
      'Evening, curious mind. Unfolding the projects like attention heads.',
    ],
    night: [
      'Late night, sharp mind. Distilling three years of work into one page.',
      'Hello, night owl. Synthesising a portfolio while the world sleeps.',
      'Good night, or good morning? Calibrating attention either way.',
      'Late night. Orchestrating agents in the quiet hours.',
      'Hello, night owl. Compiling model cards under the moonlight.',
      'Night shift. Retrieving the projects worth staying up for.',
      'Late night. Running a forward pass through everything Sahaj built.',
      'Hello, night owl. Re-weighting attention towards what keeps you curious.',
      'Midnight hours. Tokenising experiments into something you can skim.',
      'Late night. Folding embeddings and code into one quiet story.',
      'Hello, night owl. Decoding the commits pushed while others slept.',
      'Night. Indexing READMEs so every answer can cite its source.',
      'Late night, bright screen. Assembling the map of the work.',
      'Hello, night owl. Projecting a long resume onto one dark page.',
      'Late night. Grading every claim against an honest baseline.',
      'Night. Untangling multi-agent graphs into plain sentences.',
      'Hello, night owl. Streaming the context window, quietly.',
      'Late night. Converging the training curve before you scroll.',
      'Night. Shortlisting the projects worth a late read.',
      'Hello, night owl. Reconstructing the reasons behind each model.',
      'Late night. Rendering results exactly as they were measured.',
      'Night. Propagating your intent through every layer, softly.',
      'Hello, night owl. Weaving vision, retrieval and agents together.',
      'Late night. Lighting the neurons one connection at a time.',
      'Night. Normalising the noise so the signal arrives first.',
      'Hello, night owl. Rehydrating the embedding map from the latest build.',
      'Late night. Benchmarking curiosity against sleep.',
      'Night. Serialising a busy mind into a quiet page.',
      'Hello, night owl. Annotating each result with where it came from.',
      'Late night. Precomputing answers to the questions you might ask.',
      'Night. Composing the page from real data, nothing invented.',
      'Late night, sharp mind. Unfolding the projects like attention heads.',
    ],
  };
  // Sometimes the guessed intent joins the line, where it reads naturally.
  var INTENT = {
    recruiter: ['Shortlisting the projects a recruiter would open first.', 'Putting experience and results at the top for you.', 'The resume is one click away under "not you? switch".'],
    developer: ['Code, stacks and repos first, as a developer would want.', 'Putting the code and the architecture diagrams up front.', 'Every project links straight to its repository.'],
    researcher: ['Metrics, baselines and limits first, as a researcher would want.', 'Putting the evaluations and the honest limits up front.', 'Every number has its benchmark next to it.'],
    curious: ['Take the map for a spin once it has trained.', 'Ask the chatbot anything about the work.', 'Drop an image on the map and see what it matches.'],
  };
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
    if (returning && n && n.count > 0) {
      text = 'Welcome back. ' + n.count + (n.more ? '+' : '') + ' new commit' + (n.count === 1 && !n.more ? '' : 's') + ' since your last visit.';
    } else {
      // never the same line twice in a row: the last pick is kept for the session (fresh.js keeps this one key)
      var bank = BANK[part], last = SS('greetLast') || '';
      var r = rng((Date.now() ^ hash(tag + last)) >>> 0);
      var k = Math.floor(r() * bank.length), key = part + ':' + k;
      if (key === last) { k = (k + 1 + Math.floor(r() * (bank.length - 1))) % bank.length; key = part + ':' + k; }
      SS('greetLast', key);
      text = bank[k];
      if (r() < 0.45) { var add = INTENT[persona]; text += ' ' + add[Math.floor(r() * add.length)]; }
    }
    SS('greeting', text); // the 400 ms version on later pages of this session shows the same greeting
    if (clockEl) {
      var pad = function (v) { return String(v).padStart(2, '0'); };
      clockEl.textContent = pad(today.getHours()) + ':' + pad(today.getMinutes()) + (tz ? ' · ' + tz : '');
    }
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

  /* ---------- the architecture of this load ---------- */
  var ARCHS = ['mlp', 'cnn', 'transformer'];
  var forced = (qs.get('arch') || '').toLowerCase();
  var loadSeed = (Date.now() ^ hash(tag + 'arch')) >>> 0;
  var R = rng(loadSeed);
  var kind = ARCHS.indexOf(forced) > -1 ? forced : ARCHS[Math.floor(R() * ARCHS.length)];
  B.arch = kind;
  // The transformer reads these tokens and predicts the next one: the site's address, which then flies to the logo.
  var TAG = vertical ? ['Sahaj', 'Saliya', 'AI', 'engineer', 'email'] : ['Sahaj', 'Saliya', ',', 'AI', 'engineer', ',', 'email'];
  var NEXT = [['info@sahaj.si', 0.52], ['sahaj.si', 0.24], ['info.sahaj.si', 0.16], ['blog.sahaj.si', 0.08]];

  if (B.mode !== 'mini') {
    window.__data = {
      attention: loadJSON('attention', 'att', function (v) { return 'attention index loaded · ' + num(Object.keys(v).length) + ' words'; }),
      map: loadJSON('map', 'map', function (v) { return 'embedding map loaded · ' + num(v.points.length) + ' points'; }),
    };
    loadJSON('github', 'gh', function (v) { ghData = v; return 'GitHub data · synced ' + ago(v.fetched_at); }).then(function (v) { ghData = v; });
    var im = new Image();
    im.onload = im.onerror = function () { B.done('img', 'portrait decoded · ' + B.kb(B.sizeOf('profile-260'))); };
    im.src = '/assets/img/profile-260.avif';

    B.log(kind === 'mlp' ? 'model config · MLP · 4 layers' : kind === 'cnn' ? 'model config · CNN · 2 conv blocks + dense' : 'model config · transformer · 1 block · 4 heads');
    setTimeout(function () { B.log('theme: ' + theme); }, 120);
    // the IP is looked up by the head script (api.ipify.org); show it, or say honestly that the lookup failed
    (window.__ipPromise || Promise.resolve(null)).then(function (ip) { B.log('visitor ip · ' + (ip || 'lookup unavailable')); });
    // Input features are "read" one by one; each one lights an input.
    var featEl = document.getElementById('boot-feat');
    B.feat.forEach(function (f, i) {
      setTimeout(function () {
        on('feat', i);
        featEl.textContent = B.feat.slice(0, i + 1).map(function (x) { return x[0] + ': ' + x[1]; }).join(' · ');
      }, 160 + i * 85);
    });
    setTimeout(function () { on('intent'); }, 760);
  }

  /* ---------- graph: stages of nodes and an ordered list of connections ----------
     node: { st, i, s (position across the flow, 0..1), type: n | sq | grid | tok | box | out, text, size }
     edge: { a, b, w (weight -1..1), arc (attention arc inside one stage) } */
  var S = [], E = [], ARCS = [];
  function stageOf(label, items) { var st = S.length; S.push({ label: label, nodes: items.map(function (it, i) { it.st = st; it.i = i; it.s = it.s != null ? it.s : (i + 0.5) / items.length; it.act = 0; it.inN = 0; it.inDone = 0; return it; }) }); return S[st].nodes; }
  function link(a, b) { E.push({ a: a, b: b, w: R() * 2 - 1, arc: false }); b.inN++; }
  function full(A, Bn) { A.forEach(function (a) { Bn.forEach(function (b) { link(a, b); }); }); }
  function neurons(n) { var a = []; for (var i = 0; i < n; i++) a.push({ type: 'n' }); return a; }
  (function build() {
    if (kind === 'mlp') {
      var c = vertical ? [4, 5, 5, 4] : [6, 8, 8, 4];
      var lay = [stageOf('input · context', neurons(c[0])), stageOf('hidden · 8', neurons(c[1])), stageOf('hidden · 8', neurons(c[2])), stageOf('softmax · intent', neurons(c[3]))];
      if (vertical) { S[1].label = 'hidden · 5'; S[2].label = 'hidden · 5'; }
      for (var l = 0; l < lay.length - 1; l++) full(lay[l], lay[l + 1]);
    } else if (kind === 'cnn') {
      var inp = stageOf('input · 32×32', [{ type: 'grid', s: 0.5, size: 0.7 }]);
      var m1 = stageOf('conv 3×3 · ' + (vertical ? 3 : 4) + ' maps', Array.apply(null, Array(vertical ? 3 : 4)).map(function () { return { type: 'sq', size: 0.5 }; }));
      var m2 = stageOf('conv 3×3 · pool', Array.apply(null, Array(vertical ? 4 : 6)).map(function () { return { type: 'sq', size: 0.3 }; }));
      var dn = stageOf('dense', neurons(5));
      var out = stageOf('softmax · intent', neurons(4));
      full(inp, m1);
      m2.forEach(function (b, j) { m1.forEach(function (a, i) { if (Math.abs(i - j * (m1.length - 1) / (m2.length - 1)) <= 1.01) link(a, b); }); });
      full(m2, dn); full(dn, out);
    } else {
      var toks = stageOf('tokens', TAG.map(function (t) { return { type: 'tok', text: t }; }));
      var emb = stageOf('embed', TAG.map(function () { return { type: 'sq', size: 0.22 }; }));
      var att = stageOf('multi-head attention · 4 heads', neurons(TAG.length));
      var norm = stageOf('add & norm', [{ type: 'box', s: 0.5 }]);
      var ffn = stageOf('ffn', neurons(vertical ? 4 : 5));
      var nx = stageOf('softmax', [{ type: 'out', s: 0.5, text: NEXT[0][0] }]);
      toks.forEach(function (t, i) { link(t, emb[i]); });
      emb.forEach(function (e, i) { link(e, att[i]); });
      att.forEach(function (a) { link(a, norm[0]); });
      full(norm, ffn); full(ffn, nx);
      // attention: each token's strongest links to the others, as arcs (thicker = more attention)
      var vec = TAG.map(function (t) { var r = rng(hash(t + loadSeed)); return [0, 1, 2, 3].map(function () { return r() * 2 - 1; }); });
      att.forEach(function (a, i) {
        var row = softmax(vec.map(function (v, j) { return j === i ? -9 : v.reduce(function (s, x, k) { return s + x * vec[i][k]; }, 0) * 2.2; }));
        row.map(function (p, j) { return [p, j]; }).sort(function (x, y) { return y[0] - x[0]; }).slice(0, vertical ? 1 : 2).forEach(function (pj) {
          if (pj[1] > i || !ARCS.some(function (e) { return e.a === att[pj[1]] && e.b === a; })) ARCS.push({ a: a, b: att[pj[1]], w: pj[0], arc: true });
        });
      });
    }
  })();
  var OUT = S[S.length - 1].nodes;
  // Build order: stage by stage (connections into stage 1, then 2, ...); the attention arcs follow their stage.
  var ORDER = [];
  for (var st = 1; st < S.length; st++) {
    E.filter(function (e) { return e.b.st === st; }).sort(function (x, y) { return x.a.i - y.a.i || x.b.i - y.b.i; }).forEach(function (e) { ORDER.push(e); });
    ARCS.filter(function (e) { return e.a.st === st; }).sort(function (x, y) { return x.a.i - y.a.i; }).forEach(function (e) { ORDER.push(e); });
  }
  ORDER.forEach(function (e, k) { e.k = k; e.f = 0; });
  var OVER = 3; // how many connections draw at the same time (the front of the build)
  var outs = new Map();
  E.forEach(function (e) { if (!outs.has(e.a)) outs.set(e.a, []); outs.get(e.a).push(e); });

  /* ---------- finished connections are drawn once into this layer; a frame only strokes the ones still drawing ---------- */
  var cache = document.createElement('canvas'), cg = cache.getContext('2d'), cached = 0;
  function strokeEdge(ctx, e, from, to) {
    var w = Math.abs(e.w);
    ctx.strokeStyle = e.arc ? rgba(C.ac, 0.18 + 0.6 * w) : rgba(C.fg, 0.07 + 0.2 * w);
    ctx.lineWidth = e.arc ? 0.8 + 3.2 * w : 0.55 + 1.3 * w;
    ctx.beginPath(); segOn(ctx, e, from, to); ctx.stroke();
  }

  /* ---------- layout ---------- */
  var VW = 0, VH = 0, box = null, origin = [0, 0];
  var frame0 = { x0: 0, x1: 0, y0: 0, y1: 0 };
  function layout() {
    VW = innerWidth; VH = innerHeight;
    var r = stage.getBoundingClientRect();
    var padA = kind === 'mlp' && !vertical ? 150 : kind === 'transformer' && !vertical ? 46 : 20;
    var padB = vertical ? 0 : 196;
    if (vertical) frame0 = { x0: r.left + 22, x1: r.right - 22, y0: r.top + (kind === 'cnn' ? 52 : 26), y1: r.bottom - (kind === 'transformer' ? 64 : 82) };
    else frame0 = { x0: r.left + padA, x1: r.right - padB, y0: r.top + 30, y1: r.bottom - (S.length > 5 ? 30 : 10) };
    var N = S.length;
    S.forEach(function (sg, st) {
      var f = st / (N - 1);
      sg.nodes.forEach(function (n) {
        if (vertical) { n.x = frame0.x0 + (frame0.x1 - frame0.x0) * n.s; n.y = frame0.y0 + (frame0.y1 - frame0.y0) * f; }
        else { n.x = frame0.x0 + (frame0.x1 - frame0.x0) * f; n.y = frame0.y0 + (frame0.y1 - frame0.y0) * n.s; }
      });
    });
    box = [r.left - 40, r.top - 30, r.width + 80, r.height + 60]; // same box the CSS gives the canvas
    cv.width = Math.round(box[2] * dpr); cv.height = Math.round(box[3] * dpr);
    origin = [box[0], box[1]];
    cache.width = cv.width; cache.height = cv.height; cached = 0;
    lastUpto = -1;
    if (matCv) { var s = Math.round(matCv.clientWidth * dpr) || 88; matCv.width = s; matCv.height = s; }
  }
  // the span across the flow that one node may take (squares, the input grid, the add & norm bar)
  var across = function () { return vertical ? frame0.x1 - frame0.x0 : frame0.y1 - frame0.y0; };
  // side of a square node (feature map) or of the input grid; smaller on phones so stages never touch
  function sideOf(n) {
    var count = S[n.st].nodes.length;
    if (n.type === 'grid') return Math.min(vertical ? 54 : 92, across() * n.size);
    return Math.min(vertical ? 34 : 54, across() * n.size / (count * 0.9));
  }

  /* ---------- pulses: one per real event, along connections that are already built ---------- */
  var pulses = [];
  function pick(p) { var u = rand(), s = 0; for (var i = 0; i < p.length; i++) { s += p[i]; if (u <= s) return i; } return p.length - 1; }
  function addPulse(delay, strength, startI) {
    var from = S[0].nodes[startI != null ? startI % S[0].nodes.length : Math.floor(rand() * S[0].nodes.length)];
    var path = [], n = from;
    while (outs.has(n)) {
      var cand = outs.get(n);
      var e = n.st === S.length - 2 && kind !== 'transformer' ? cand[Math.min(cand.length - 1, pick(B.probs))] : cand[Math.floor(rand() * cand.length)];
      path.push(e); n = e.b;
    }
    pulses.push({ t0: performance.now() + delay, step: 260 + rand() * 80, path: path, s: strength });
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

  /* ---------- the build: progress -> which connections are drawn, which neurons are active ---------- */
  function build(u) {
    var pos = clamp(u, 0, 1) * (ORDER.length + OVER);
    S.forEach(function (sg) { sg.nodes.forEach(function (n) { n.inDone = 0; }); });
    ORDER.forEach(function (e) { e.f = clamp((pos - e.k) / OVER, 0, 1); if (!e.arc && e.f >= 1) e.b.inDone++; });
  }
  // a node is "on" once every incoming connection has landed (inputs: once read)
  var isOn = function (n) { return n.st === 0 ? (kind === 'mlp' ? n.i < shown : shown > 0) : n.inN > 0 && n.inDone >= n.inN; };

  /* ---------- drawing ---------- */
  var fly = null; // set by handoff()
  var mono = function (px, w) { return (w || '') + px + 'px "JetBrains Mono", ui-monospace, monospace'; };
  var FS = vertical ? 12 : 11;
  function seg(e, from, to) { segOn(g, e, from, to); }
  function segOn(g, e, from, to) {
    // a straight connection, or an attention arc bulging along the flow
    var a = e.a, b = e.b;
    if (!e.arc) { g.moveTo(a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from); g.lineTo(a.x + (b.x - a.x) * to, a.y + (b.y - a.y) * to); return; }
    var d = Math.hypot(b.x - a.x, b.y - a.y), bulge = 14 + d * 0.32;
    var cx = (a.x + b.x) / 2 + (vertical ? 0 : bulge), cy = (a.y + b.y) / 2 + (vertical ? bulge : 0);
    var q = function (t) { var m = 1 - t; return [m * m * a.x + 2 * m * t * cx + t * t * b.x, m * m * a.y + 2 * m * t * cy + t * t * b.y]; };
    var p0 = q(from); g.moveTo(p0[0], p0[1]);
    for (var k = 1; k <= 16; k++) { var p = q(from + (to - from) * k / 16); g.lineTo(p[0], p[1]); }
  }
  function draw(now, p) {
    g.setTransform(dpr, 0, 0, dpr, -origin[0] * dpr, -origin[1] * dpr);
    if (fly || !box) g.clearRect(0, 0, VW, VH); else g.clearRect(box[0], box[1], box[2], box[3]);
    if (!fly) build(p);
    var ft = fly ? now - fly.t0 : 0;
    var nodeFade = fly ? clamp(1 - ft / 420, 0, 1) : 1;
    g.lineCap = 'round';

    // connections: thickness and opacity follow the weight; the drawing front has an accent tip
    if (!fly) {
      // finished connections go into the cache once (they never change), in build order
      if (cached === 0) { cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, cache.width, cache.height); }
      cg.setTransform(dpr, 0, 0, dpr, -origin[0] * dpr, -origin[1] * dpr); cg.lineCap = 'round';
      while (cached < ORDER.length && ORDER[cached].f >= 1) { strokeEdge(cg, ORDER[cached], 0, 1); cached++; }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(cache, 0, 0); g.restore();
      for (var k = cached; k < ORDER.length && ORDER[k].f > 0; k++) {
        var e = ORDER[k];
        strokeEdge(g, e, 0, e.f);
        if (e.f < 1) { g.strokeStyle = rgba(C.ac, 0.9); g.lineWidth = 1.6; g.beginPath(); seg(e, Math.max(0, e.f - 0.12), e.f); g.stroke(); }
      }
    } else {
      // the handoff: connections retract toward the output, last built first
      for (var k2 = 0; k2 < ORDER.length; k2++) {
        var rk = ORDER.length - 1 - k2, rt = clamp((ft - rk * fly.stagger) / 160, 0, 1);
        if (rt < 1) strokeEdge(g, ORDER[k2], rt, 1);
      }
    }
    // pulses travel along finished connections only
    if (!fly) for (var pi = pulses.length - 1; pi >= 0; pi--) {
      var pu = pulses[pi];
      var t = (now - pu.t0) / pu.step;
      if (t < 0) continue;
      var si = Math.floor(t);
      if (si >= pu.path.length || pu.path[si].f < 1) { pulses.splice(pi, 1); continue; }
      var pe = pu.path[si], fr = t - si;
      if (fr > 0.92) pe.b.act = Math.min(1, pe.b.act + pu.s * 0.5);
      g.strokeStyle = rgba(C.ac, 0.95); g.lineWidth = 1.2 + 1.6 * pu.s;
      g.beginPath(); seg(pe, Math.max(0, fr - 0.14), fr); g.stroke();
    }

    // stage labels (small, monospace)
    if (!fly) {
      g.font = mono(FS); g.fillStyle = rgba(C.dim, 1); g.textBaseline = 'alphabetic';
      S.forEach(function (sg) {
        var n0 = sg.nodes[0], built = isOn(n0) || sg.nodes.some(isOn);
        g.globalAlpha = built ? 1 : 0.45;
        if (vertical) { g.textAlign = 'left'; g.fillText(sg.label, frame0.x0 - 12, n0.y - (n0.type === 'grid' || n0.type === 'sq' ? sideOf(n0) / 2 + 8 : n0.type === 'tok' || n0.type === 'out' ? 18 : n0.type === 'box' ? 16 : 14)); }
        // with many stages (the transformer) every other label goes under the network so neighbours never touch
        else { g.textAlign = 'center'; var below = S.length > 5 && sg.nodes[0].st % 2 === 1; g.fillText(sg.label, n0.x, below ? frame0.y1 + 22 : frame0.y0 - 14); }
      });
      g.globalAlpha = 1;
    }

    // nodes
    var best = shownProbs.indexOf(Math.max.apply(null, shownProbs));
    var flyNode = fly && fly.node;
    S.forEach(function (sg) {
      sg.nodes.forEach(function (n) {
        if (n === flyNode) return;
        var on = isOn(n), isOut = n.st === S.length - 1;
        if (isOut && on && intentT0 && kind !== 'transformer') n.act = Math.max(n.act * 0.9, shownProbs[n.i]);
        else n.act *= 0.972;
        var A = Math.max(n.act, on ? 0.32 : 0.05) * nodeFade;
        if (nodeFade <= 0) return;
        var col = isOut ? C.ac : C.fg;
        if (n.type === 'n') {
          var r0 = 3 + 4 * A;
          if (A > 0.3 && C.dark) { g.fillStyle = rgba(col, 0.16 * A); g.beginPath(); g.arc(n.x, n.y, r0 * 2.3, 0, 6.2832); g.fill(); }
          g.fillStyle = on ? rgba(col, 0.25 + 0.75 * A) : rgba(C.bg, 1);
          g.strokeStyle = rgba(C.fg, (on ? 0.45 : 0.3) * nodeFade); g.lineWidth = 1;
          g.beginPath(); g.arc(n.x, n.y, r0, 0, 6.2832); g.fill(); g.stroke();
        } else if (n.type === 'sq' || n.type === 'grid') {
          var side = sideOf(n);
          var x = n.x - side / 2, y = n.y - side / 2;
          g.fillStyle = rgba(C.bg, 1); g.fillRect(x, y, side, side);
          var cells = n.type === 'grid' ? 8 : 4, cs = side / cells, rr = rng(hash('cell' + n.st + ':' + n.i + loadSeed));
          for (var ci = 0; ci < cells * cells; ci++) {
            var v = rr();
            g.fillStyle = rgba(n.type === 'grid' ? C.fg : C.ac, (on ? 0.08 + 0.55 * v * (0.4 + A) : 0.04) * nodeFade);
            g.fillRect(x + (ci % cells) * cs + 0.5, y + Math.floor(ci / cells) * cs + 0.5, cs - 1, cs - 1);
          }
          g.strokeStyle = rgba(C.fg, (on ? 0.55 : 0.25) * nodeFade); g.lineWidth = 1; g.strokeRect(x, y, side, side);
        } else if (n.type === 'tok' || n.type === 'out') {
          g.font = mono(vertical ? 12 : 12, n.type === 'out' ? '600 ' : ''); g.textAlign = 'center'; g.textBaseline = 'middle';
          var tw = g.measureText(n.text).width + 12, th = 20;
          g.fillStyle = rgba(n.type === 'out' && on ? C.ac : C.bg, n.type === 'out' && on ? 0.14 * nodeFade + 0.001 : 1);
          g.strokeStyle = rgba(n.type === 'out' && on ? C.ac : C.fg, (on ? 0.6 : 0.25) * nodeFade); g.lineWidth = 1;
          g.beginPath(); g.rect(n.x - tw / 2, n.y - th / 2, tw, th); g.fill(); g.stroke();
          g.fillStyle = rgba(n.type === 'out' && on ? C.ac : C.fg, (on ? 1 : 0.4) * nodeFade);
          g.fillText(n.type === 'out' && !on ? '···' : n.text, n.x, n.y + 0.5);
        } else if (n.type === 'box') {
          var bw = vertical ? (frame0.x1 - frame0.x0) * 0.86 : 24, bh = vertical ? 18 : across() * 0.86;
          g.fillStyle = rgba(on ? C.fg : C.bg, on ? 0.08 * nodeFade : 1); g.strokeStyle = rgba(C.fg, (on ? 0.55 : 0.25) * nodeFade); g.lineWidth = 1;
          g.beginPath(); g.rect(n.x - bw / 2, n.y - bh / 2, bw, bh); g.fill(); g.stroke();
        }
      });
    });

    if (fly) { drawFlight(now); return; }
    g.textBaseline = 'middle';
    // input labels: the visitor context next to the MLP inputs (desktop), the input image size for the CNN
    if (kind === 'mlp' && !vertical) for (var f2 = 0; f2 < B.feat.length && f2 < S[0].nodes.length; f2++) {
      var nd = S[0].nodes[f2], onf = f2 < shown, val = B.feat[f2][1];
      g.font = mono(11); g.textAlign = 'right';
      g.fillStyle = rgba(onf ? C.fg : C.dim, onf ? 1 : 0.5); g.fillText(onf ? val : '···', nd.x - 14, nd.y);
      var vw = g.measureText(onf ? val : '···').width;
      g.fillStyle = rgba(C.dim, 1); g.fillText(B.feat[f2][0] + ' ·', nd.x - 14 - vw - 5, nd.y);
    }
    // output: intent bars (MLP, CNN) or the next-token distribution (transformer), once the output is active
    var outOn = OUT.every(isOn);
    if (kind !== 'transformer' && intentT0) {
      OUT.forEach(function (no, o) {
        var prb = shownProbs[o], isBest = o === best && now - intentT0 > 800 && outOn;
        g.font = mono(FS, isBest ? '600 ' : ''); g.fillStyle = rgba(isBest ? C.ac : C.fg, isOn(no) ? 1 : 0.4);
        var label = NAMES[o] + ' ' + (isOn(no) ? Math.round(prb * 100) + '%' : '··');
        if (vertical) { var dy = o % 2 ? 50 : 20; g.textAlign = 'center'; g.fillText(NAMES[o], no.x, no.y + dy); g.fillText(isOn(no) ? Math.round(prb * 100) + '%' : '··', no.x, no.y + dy + 15); }
        else {
          g.textAlign = 'left'; g.fillText(label, no.x + 14, no.y - 5);
          var bw2 = 110;
          g.fillStyle = rgba(C.rule, 1); g.fillRect(no.x + 14, no.y + 5, bw2, 3);
          if (isOn(no)) { g.fillStyle = rgba(isBest ? C.ac : C.fg, isBest ? 1 : 0.55); g.fillRect(no.x + 14, no.y + 5, bw2 * prb, 3); }
        }
      });
    } else if (kind === 'transformer' && outOn) {
      var on0 = OUT[0];
      NEXT.forEach(function (c, i) {
        g.font = mono(FS, i === 0 ? '600 ' : ''); g.fillStyle = rgba(i === 0 ? C.ac : C.dim, 1);
        if (vertical) { if (i < 3) { var cx = frame0.x0 + (frame0.x1 - frame0.x0) * (i + 0.5) / 3; g.textAlign = 'center'; g.fillText(c[0], cx, on0.y + 30); g.fillText(c[1].toFixed(2), cx, on0.y + 44); } }
        else { g.textAlign = 'left'; g.fillText(c[0].padEnd(14) + ' ' + c[1].toFixed(2), on0.x + 42, on0.y - 24 + i * 16); }
      });
    }
  }

  /* ---------- the handoff: the network collapses into the hero ----------
     Connections retract toward the output in reverse order while the other neurons fade. Then the output neuron
     glides into the orange cursor dot of the header logo, where the hero name starts generating (MLP, CNN); for the
     transformer the predicted token flies to its place at the end of the tagline. Nothing is left on screen. */
  function handoff() {
    if (calm) return 0;
    var root = document.documentElement;
    build(1);
    S.forEach(function (sg) { sg.nodes.forEach(function (n) { n.inDone = n.inN; }); });
    var big = document.createElement('canvas');
    big.style.cssText = 'position:fixed;left:0;top:0;width:' + VW + 'px;height:' + VH + 'px;z-index:0;pointer-events:none';
    big.width = Math.round(VW * dpr); big.height = Math.round(VH * dpr);
    cv.style.visibility = 'hidden';
    el.insertBefore(big, el.firstChild);
    cv = big; g = big.getContext('2d'); origin = [0, 0];
    var RETRACT = 520;
    fly = { t0: performance.now(), stagger: (RETRACT - 160) / Math.max(1, ORDER.length), retract: RETRACT, move: 640 };
    var bestI = B.probs.indexOf(Math.max.apply(null, B.probs));
    fly.node = kind === 'transformer' ? OUT[0] : OUT[bestI];
    // the output neuron flies into the centre of the header logo and is absorbed by it; for the transformer the
    // predicted token "info@sahaj.si" flies to the same words in the header's top-left corner and settles on them
    var logo = document.querySelector(kind === 'transformer' ? '.brand-text .bt-cur' : '.brand-logo');
    var dr = logo && logo.getBoundingClientRect();
    if (!dr || !dr.width) { fly.node = null; return RETRACT; }
    fly.target = { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2, r: 3 };
    fly.from = { x: fly.node.x, y: fly.node.y };
    root.classList.add('boot-fly');
    // The hero starts as the neuron sets off, not when it lands: its first token (after the hero's own short delay
    // and sampling) arrives about when the neuron reaches the logo, so the screen is never empty in between.
    return RETRACT * 0.6;
  }
  function drawFlight(now) {
    var n = fly.node;
    if (!n || !fly.target) return;
    var u = clamp((now - fly.t0 - fly.retract * 0.6) / fly.move, 0, 1), e = ease(u);
    var x = fly.from.x + (fly.target.x - fly.from.x) * e, y = fly.from.y + (fly.target.y - fly.from.y) * e;
    var r0 = 7 + (fly.target.r - 7) * e;
    if (kind === 'transformer') {
      g.save(); g.translate(x, y); g.scale(1 - 0.35 * e, 1 - 0.35 * e); g.globalAlpha = 1 - clamp((u - 0.7) / 0.3, 0, 1);
      g.font = mono(12, '600 '); g.textAlign = 'center'; g.textBaseline = 'middle';
      var tw2 = g.measureText(NEXT[0][0]).width + 12;
      g.fillStyle = rgba(C.bg, 1); g.fillRect(-tw2 / 2, -10, tw2, 20);
      g.strokeStyle = rgba(C.ac, 0.6); g.lineWidth = 1; g.strokeRect(-tw2 / 2, -10, tw2, 20);
      g.fillStyle = rgba(C.ac, 1); g.fillText(NEXT[0][0], 0, 0.5);
      g.restore();
    } else { g.fillStyle = rgba(C.ac, 1); g.beginPath(); g.arc(x, y, Math.max(1, r0), 0, 6.2832); g.fill(); }
    if (u >= 1 && !fly.landed) {
      fly.landed = true;
      document.documentElement.classList.remove('boot-fly');
      g.clearRect(0, 0, VW, VH);
      cv.style.opacity = '0';
      var lg = document.querySelector('.brand-logo');
      if (lg && kind !== 'transformer') { lg.classList.add('is-landed'); setTimeout(function () { lg.classList.remove('is-landed'); }, 600); }
    }
  }
  /* ---------- loop ---------- */
  var raf = 0;
  function frame(now) {
    if (!el.isConnected) { if (fly && !fly.landed) { cancelAnimationFrame(raf); } return; }
    raf = requestAnimationFrame(frame);
    updateIntent(now);
    draw(now, calm ? 1 : B.p);
    drawMatrix(calm ? 1 : B.p);
    if (fly && now - fly.t0 > fly.retract + fly.move + 200) { cv.style.opacity = '0'; document.documentElement.classList.remove('boot-fly'); cancelAnimationFrame(raf); }
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
      addPulse(0, 0.55, data);
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

  // whole words (with their leading space) and punctuation: a word is never split, so it never shows a gap
  function tokenize(text) {
    var out = [], pend = '';
    (text.match(/[A-Za-z0-9'’+-]+|[.,!?":]|\s+/g) || []).forEach(function (m) { if (/^\s+$/.test(m)) pend = ' '; else { out.push(pend + m); pend = ''; } });
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

  var api = { on: on, decode: decode, skipDecode: skipDecode, handoff: handoff, greeting: greeting };

  // reduced motion: one still frame of the finished forward pass, redrawn only when the layout or theme changes
  function still() { shown = B.feat.length; intentT0 = 1; shownProbs = B.probs.slice(); pulses = []; draw(performance.now(), 1); lastUpto = -1; drawMatrix(1); }
  readColors();
  document.addEventListener('themechange', function () { readColors(); cached = 0; if (calm) still(); });
  layout();
  var rzt;
  addEventListener('resize', function () { clearTimeout(rzt); rzt = setTimeout(function () { layout(); if (calm) still(); }, 120); });

  setTimeout(function () { layout(); if (calm) still(); }, 350); // fonts and scrollbars can shift the stage a little after first paint
  B.attach(api);
  if (calm) still(); else raf = requestAnimationFrame(frame);
})();
