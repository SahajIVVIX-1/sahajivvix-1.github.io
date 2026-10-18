// Activity indicator: random verbs (shuffled bag, no repeats per cycle) + drift-free elapsed timer.
// The label sits in muted lavender-grey; a soft violet-white highlight sweeps across it from left
// to right, holds, then recedes the same way before the next verb takes its place.
// Markup expected inside `root`: .act-label holding .act-verb, .act-ell and .act-time.
(function () {
  const YEAR = 31536000, DAY = 86400, HOUR = 3600, MIN = 60;

  function formatElapsed(total) {
    let s = total;
    const y = Math.floor(s / YEAR); s -= y * YEAR;
    const d = Math.floor(s / DAY); s -= d * DAY;
    const h = Math.floor(s / HOUR); s -= h * HOUR;
    const m = Math.floor(s / MIN); s -= m * MIN;
    return (y ? y + "y" : "") + (d ? d + "d" : "") + (h ? h + "h" : "") + (m ? m + "m" : "") + s + "s";
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Each cycle draws every word exactly once; a new cycle never opens with the word that closed the last one.
  function createBag(words) {
    let pool = [], last = null;
    return function next() {
      if (!pool.length) {
        pool = shuffle(words.slice());
        if (pool.length > 1 && pool[pool.length - 1] === last) {
          [pool[0], pool[pool.length - 1]] = [pool[pool.length - 1], pool[0]];
        }
      }
      last = pool.pop();
      return last;
    };
  }

  const EASE = "cubic-bezier(.45,0,.25,1)";
  // background-position stops for the 400%-wide gradient in the stylesheet
  const MUTED_START = "100% 0", REVEALED = "53% 0", HOLD_END = "40% 0", MUTED_END = "0% 0";

  // longer words get a slower sweep so their letters do not race past
  function sweepMs(text) {
    return Math.min(2600, Math.max(1300, 900 + 62 * text.length));
  }

  function mount(root, words) {
    const label = root.querySelector(".act-label");
    const verb = root.querySelector(".act-verb");
    const ell = root.querySelector(".act-ell");
    const time = root.querySelector(".act-time");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = createBag(words);
    const timers = new Set();
    let sweep = null;
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    // off-screen twin with the label's font, used to measure text at fit = 1
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none";
    document.body.appendChild(probe);

    let fit = 1, verbText = "", timeText = "", verbEm = 0, timeEm = 0;

    function baseFont() { return parseFloat(getComputedStyle(root).fontSize) / fit; }
    // width of `text` in em of the label font, so sizes follow --fit without re-measuring
    function measureEm(text, src) {
      const cs = getComputedStyle(src);
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.fontVariantNumeric = cs.fontVariantNumeric;
      probe.style.fontVariationSettings = cs.fontVariationSettings;
      probe.style.fontSize = baseFont() + "px";
      probe.textContent = text;
      return probe.getBoundingClientRect().width / baseFont();
    }

    // shrink the type a little when a long verb + timer would not fit the column (mobile)
    function layout() {
      const font = baseFont();
      const chrome = root.offsetWidth - label.offsetWidth;
      const avail = (root.parentElement.clientWidth || innerWidth) - 2;
      const need = (verbEm + measureEm("...", ell) + 0.55 + timeEm) * font;
      fit = Math.max(0.68, Math.min(1, (avail - chrome) / need));
      root.style.setProperty("--fit", fit.toFixed(3));
      verb.style.width = verbEm + "em";
      time.style.width = timeEm + "em";
    }

    // one cycle for a verb: sweep in, hold revealed, recede, then hand over to the next verb.
    // The text only ever changes while it is fully muted, so the swap never flashes.
    function showVerb(word) {
      verbText = word;
      verb.textContent = word;
      verbEm = measureEm(word, verb);
      layout();
      const total = 5000 + Math.random() * 10000;
      if (reduce) { later(() => showVerb(next()), total); return; }
      const reveal = sweepMs(word + "... " + timeText), recede = reveal * 0.8;
      sweep = label.animate([
        { backgroundPosition: MUTED_START, easing: EASE },
        { backgroundPosition: REVEALED, offset: reveal / total, easing: "linear" },
        { backgroundPosition: HOLD_END, offset: 1 - recede / total, easing: EASE },
        { backgroundPosition: MUTED_END }
      ], { duration: total, fill: "forwards" });
      sweep.onfinish = () => { sweep = null; showVerb(next()); };
    }

    const start = performance.now();
    function tick() {
      const elapsed = Math.floor((performance.now() - start) / 1000);
      const t = formatElapsed(elapsed);
      if (t !== timeText) {
        const grew = t.length !== timeText.length;
        timeText = t;
        time.textContent = t;
        if (grew) { timeEm = measureEm(t, time); layout(); }
      }
      // aim for the next whole second after `start`, so timeouts never accumulate drift
      later(tick, 1000 - ((performance.now() - start) % 1000) + 5);
    }

    root.classList.add("no-anim");
    if (reduce) root.classList.add("still");
    tick();
    showVerb(next());
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));

    const onResize = () => layout();
    addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        verbEm = measureEm(verbText, verb);
        timeEm = measureEm(timeText, time);
        layout();
      });
    }

    function destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
      if (sweep) { sweep.onfinish = null; sweep.cancel(); sweep = null; }
      removeEventListener("resize", onResize);
      probe.remove();
    }
    addEventListener("pagehide", destroy, { once: true });
    return { destroy, formatElapsed };
  }

  window.ActivityIndicator = { mount, formatElapsed, createBag };
  const el = document.getElementById("activity");
  if (el && window.ACTIVITY_VERBS) window.__activity = mount(el, window.ACTIVITY_VERBS);
})();
