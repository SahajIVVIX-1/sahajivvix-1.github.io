// Activity indicator: random verbs (shuffled bag, no repeats per cycle) + drift-free elapsed timer.
// Each letter is a 3D tile with a front and a back face; on a word change the tile turns over
// to reveal the next word's letter on its back, like a mechanical flip display.
// Markup expected inside `root`: .act-verbs and .act-time.
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

  // Flip patterns, used in turn so every transition is deliberate rather than random.
  // order: which tiles turn first; dir(i, n): how tile i turns.
  //   up = top tips away (rotateX), down = top tips toward you, right/left = turns about the vertical axis
  const PATTERNS = [
    { order: "ltr", dir: i => (i % 2 ? "down" : "up") },
    { order: "ltr", dir: i => ["up", "right", "down", "left"][i % 4] },
    { order: "center", dir: (i, n) => (i < (n - 1) / 2 ? "left" : "right") },
    { order: "ltr", dir: i => ["right", "up", "right", "down"][i % 4] },
    { order: "center", dir: i => (i % 2 ? "up" : "down") },
    { order: "ltr", dir: i => (i % 3 === 2 ? "down" : "left") }
  ];
  const TURN = {
    up: { axis: "X", deg: 180 }, down: { axis: "X", deg: -180 },
    right: { axis: "Y", deg: 180 }, left: { axis: "Y", deg: -180 }
  };
  const FLIP_MS = 640, STEP_MS = 42, EASE = "cubic-bezier(.45,0,.25,1)";
  // split into user-perceived characters so conjuncts like "क्व" stay on one tile
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  const chars = w => (seg ? Array.from(seg.segment(w), x => x.segment) : Array.from(w));

  function mount(root, words) {
    const verbs = root.querySelector(".act-verbs");
    const time = root.querySelector(".act-time");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = createBag(words);
    const timers = new Set();
    const running = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    verbs.innerHTML = '<span class="slots"></span><span class="ell">...</span>';
    const slotsEl = verbs.querySelector(".slots");
    const ellEl = verbs.querySelector(".ell");

    // off-screen twin with the line's font, used to measure glyphs at fit = 1
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none";
    document.body.appendChild(probe);

    let fit = 1, verbText = "", timeText = "", timeW = 0, pattern = 0;
    const glyphEm = new Map();

    function baseFont() { return parseFloat(getComputedStyle(root).fontSize) / fit; }
    function measurePx(text, src) {
      const cs = getComputedStyle(src);
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.fontVariantNumeric = cs.fontVariantNumeric;
      probe.style.fontVariationSettings = cs.fontVariationSettings;
      probe.style.fontSize = baseFont() + "px";
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    }
    // glyph widths in em, so tiles scale with the --fit font size without re-measuring
    function em(ch) {
      if (!ch) return 0;
      if (!glyphEm.has(ch)) glyphEm.set(ch, measurePx(ch, verbs) / baseFont());
      return glyphEm.get(ch);
    }
    function verbPx(word) {
      return chars(word).reduce((sum, c) => sum + em(c), 0) * baseFont() + measurePx("...", ellEl);
    }

    // shrink the type a little when the widest verb + timer would not fit the column (mobile).
    // Sizing for the widest verb, not the current one, keeps the type size fixed while words
    // change, so letters are never re-rendered at a new size mid-transition.
    let widestEm = 0;
    function measureWidest() {
      widestEm = words.reduce((m, w) => Math.max(m, chars(w).reduce((s, c) => s + em(c), 0)), 0);
    }
    function layout() {
      const chrome = root.offsetWidth - verbs.offsetWidth - time.offsetWidth;
      const avail = (root.parentElement.clientWidth || innerWidth) - 2;
      const font = baseFont();
      const room = widestEm * font + measurePx("...", ellEl) + Math.max(timeW, measurePx("59m59s", time));
      const nextFit = Math.max(0.68, Math.min(1, (avail - chrome) / room));
      if (Math.abs(nextFit - fit) > 0.004) { fit = nextFit; root.style.setProperty("--fit", fit.toFixed(3)); }
      time.style.width = Math.ceil(timeW * fit) + "px";
    }

    function makeSlot(ch) {
      const s = document.createElement("span");
      s.className = "slot";
      s.innerHTML = '<span class="card"><span class="face front"></span><span class="face back"></span></span>';
      s.querySelector(".front").textContent = ch;
      s.style.width = em(ch) + "em";
      return s;
    }

    function rank(order, i, n) {
      if (order === "center") return Math.round(Math.abs(i - (n - 1) / 2));
      return i;
    }

    // turn tile `slot` over so `to` shows; an empty `to` retires the tile.
    // Every tile in a change resizes along one shared curve (`span`), so the line glides
    // in one direction instead of nudging back and forth as staggered tiles resize.
    function flip(slot, to, from, dir, delay, span) {
      const card = slot.firstChild, front = card.firstChild, back = card.lastChild;
      const { axis, deg } = TURN[dir];
      const rot = a => "rotate" + axis + "(" + a + "deg)";
      back.textContent = to;
      back.style.transform = rot(180);
      slot.style.transition = "width " + span + "ms " + EASE;
      slot.style.width = em(to) + "em";
      // tiles that open up or close down turn across the whole change and scale with their
      // width, so the letter always fits the space it is given
      const edge = !from || !to;
      const frames = edge
        ? [{ transform: rot(0) + " scale(" + (from ? 1 : 0) + ")" }, { transform: rot(deg) + " scale(" + (to ? 1 : 0) + ")" }]
        : [{ transform: rot(0) }, { transform: rot(deg) }];
      const anim = card.animate(frames, edge
        ? { duration: span, easing: EASE, fill: "forwards" }
        : { duration: FLIP_MS, delay, easing: EASE, fill: "forwards" });
      running.add(anim);
      anim.onfinish = () => {
        running.delete(anim);
        if (!to) { slot.remove(); return; }
        front.textContent = to;
        back.textContent = "";
        anim.cancel(); // tile is back at 0deg, now showing the new letter on its front
      };
    }

    function showVerb(word, animate) {
      running.forEach(a => a.finish()); // settle any tiles still turning
      const prev = chars(verbText), nextChars = chars(word);
      verbText = word;
      const slots = Array.from(slotsEl.children);
      const n = Math.max(prev.length, nextChars.length);

      if (!animate) {
        slotsEl.textContent = "";
        nextChars.forEach(c => slotsEl.appendChild(makeSlot(c)));
        layout();
        return;
      }

      // new tiles start blank and zero-width, then open up as they turn
      for (let i = slots.length; i < nextChars.length; i++) {
        const s = makeSlot("");
        slotsEl.appendChild(s);
        slots.push(s);
      }
      void slotsEl.offsetWidth; // commit the zero widths so the growth transitions

      const p = PATTERNS[pattern++ % PATTERNS.length];
      let last = 0;
      for (let i = 0; i < n; i++) if ((prev[i] || "") !== (nextChars[i] || "")) last = Math.max(last, rank(p.order, i, n));
      const span = last * STEP_MS + FLIP_MS;
      for (let i = 0; i < n; i++) {
        const from = prev[i] || "", to = nextChars[i] || "";
        if (from === to) continue; // same letter in the same place stays put
        flip(slots[i], to, from, p.dir(i, n), rank(p.order, i, n) * STEP_MS, span);
      }
      // the timer slot follows the same curve as the tiles
      time.style.transition = "width " + span + "ms " + EASE;
      layout();
    }

    function scheduleVerb() {
      later(() => { showVerb(next(), !reduce); scheduleVerb(); }, 5000 + Math.random() * 10000);
    }

    const start = performance.now();
    function tick() {
      const elapsed = Math.floor((performance.now() - start) / 1000);
      const t = formatElapsed(elapsed);
      if (t !== timeText) {
        const grew = t.length !== timeText.length;
        timeText = t;
        time.textContent = t;
        if (grew) { timeW = measurePx(t, time); layout(); }
      }
      // aim for the next whole second after `start`, so timeouts never accumulate drift
      later(tick, 1000 - ((performance.now() - start) % 1000) + 5);
    }

    root.classList.add("no-anim");
    measureWidest();
    showVerb(next(), false);
    tick();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));
    scheduleVerb();

    const onResize = () => layout();
    addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        glyphEm.clear();
        measureWidest();
        Array.from(slotsEl.children).forEach(s => { s.style.width = em(s.querySelector(".front").textContent) + "em"; });
        timeW = measurePx(timeText, time);
        layout();
      });
    }

    function destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
      running.forEach(a => a.cancel());
      running.clear();
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
