// Activity indicator: random verbs (shuffled bag, no repeats per cycle) + drift-free elapsed timer.
// Markup expected inside `root`: .act-verbs (holds .act-verb) and .act-time.
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

  function mount(root, words) {
    const verbs = root.querySelector(".act-verbs");
    const time = root.querySelector(".act-time");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = createBag(words);
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    // off-screen twin with the capsule's font, used to measure text at fit = 1
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none";
    document.body.appendChild(probe);

    let shrinkDelay = 0, fit = 1, verbText = "", timeText = "", verbW = 0, timeW = 0;

    function baseFont() { return parseFloat(getComputedStyle(root).fontSize) / fit; }
    function measure(html, src) {
      const cs = getComputedStyle(src);
      probe.style.fontFamily = cs.fontFamily;
      probe.style.fontWeight = cs.fontWeight;
      probe.style.letterSpacing = cs.letterSpacing;
      probe.style.fontVariantNumeric = cs.fontVariantNumeric;
      probe.style.fontSize = baseFont() + "px";
      probe.innerHTML = html;
      return probe.getBoundingClientRect().width;
    }
    const esc = c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] || c);
    // one inline-block span per character so each letter can move on its own
    function verbHTML(w) {
      return Array.from(w).map(c => '<span class="ch">' + esc(c) + "</span>").join("") +
        '<span class="ell"><span class="ch">.</span><span class="ch">.</span><span class="ch">.</span></span>';
    }

    // shrink the type a little when a long verb + timer would not fit the column (mobile)
    function layout() {
      const chrome = (root.offsetWidth - verbs.offsetWidth - time.offsetWidth);
      const avail = (root.parentElement.clientWidth || innerWidth) - 2;
      const need = verbW + timeW;
      fit = Math.max(0.68, Math.min(1, (avail - chrome) / need));
      root.style.setProperty("--fit", fit.toFixed(3));
      // grow at once; when shrinking, wait for the outgoing word to leave so it is never cropped
      const w = Math.ceil(verbW * fit);
      verbs.style.transitionDelay = w < verbs.offsetWidth ? shrinkDelay + "s" : "0s";
      verbs.style.width = w + "px";
      time.style.width = Math.ceil(timeW * fit) + "px";
    }

    // Letter-by-letter transitions; a different one is picked at random on every change.
    // order: which letters move first; from/to: where entering letters come from and leaving letters go.
    const STYLES = [
      { order: "ltr", from: "translateY(110%)", to: "translateY(-110%)" },
      { order: "rtl", from: "translateY(110%)", to: "translateY(-110%)" },
      { order: "ltr", from: "translateY(-110%)", to: "translateY(110%)" },
      { order: "center", from: "translateY(110%)", to: "translateY(-110%)" },
      { order: "edges", from: "translateY(-110%)", to: "translateY(110%)" },
      { order: "ltr", from: "perspective(240px) rotateX(-90deg)", to: "perspective(240px) rotateX(90deg)" },
      { order: "ltr", from: "translateX(-0.7em)", to: "translateX(0.7em)", blur: true },
      { order: "center", from: "scale(0.2)", to: "scale(1.7)", blur: true }
    ];
    let lastStyle = -1;
    function pickStyle() {
      let i;
      do { i = Math.floor(Math.random() * STYLES.length); } while (i === lastStyle && STYLES.length > 1);
      lastStyle = i;
      return STYLES[i];
    }
    function rank(order, i, n) {
      const mid = (n - 1) / 2, far = mid || 1;
      if (order === "rtl") return n > 1 ? (n - 1 - i) / (n - 1) : 0;
      if (order === "center") return Math.abs(i - mid) / far;
      if (order === "edges") return 1 - Math.abs(i - mid) / far;
      return n > 1 ? i / (n - 1) : 0;
    }

    const OUT_MS = 230, IN_MS = 540, GAP_MS = 150;

    function animateOut(old, style) {
      old.classList.add("out");
      const chars = old.querySelectorAll(".ch"), n = chars.length;
      const spread = Math.min(220, n * 12);
      chars.forEach((c, i) => {
        c.animate(
          [{ transform: "none", opacity: 1, filter: "blur(0)" },
           { transform: style.to, opacity: 0, filter: style.blur ? "blur(3px)" : "blur(0)" }],
          { duration: OUT_MS, delay: rank(style.order, i, n) * spread * 0.6, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
        );
      });
      later(() => old.remove(), OUT_MS + spread * 0.6 + 40);
      return OUT_MS + spread * 0.6;
    }

    function animateIn(el, style) {
      const chars = el.querySelectorAll(".ch"), n = chars.length;
      const spread = Math.min(320, n * 18);
      chars.forEach((c, i) => {
        c.animate(
          [{ transform: style.from, opacity: 0, filter: style.blur ? "blur(3px)" : "blur(0)" },
           { transform: "none", opacity: 1, filter: "blur(0)" }],
          { duration: IN_MS, delay: GAP_MS + rank(style.order, i, n) * spread, easing: "cubic-bezier(.3,1.25,.6,1)", fill: "backwards" }
        );
      });
    }

    function showVerb(word, animate) {
      verbText = word;
      verbW = measure(verbHTML(word), verbs);
      const el = document.createElement("span");
      el.className = "act-verb";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = verbHTML(word);
      const style = animate ? pickStyle() : null;
      let outMs = 0;
      verbs.querySelectorAll(".act-verb:not(.out)").forEach(old => {
        if (!animate) { old.remove(); return; }
        outMs = Math.max(outMs, animateOut(old, style));
      });
      verbs.appendChild(el);
      if (animate) animateIn(el, style);
      shrinkDelay = animate ? outMs / 1000 : 0;
      layout();
    }

    function scheduleVerb() {
      later(() => { showVerb(next(), !reduce); scheduleVerb(); }, 2000 + Math.random() * 2000);
    }

    const start = performance.now();
    function tick() {
      const elapsed = Math.floor((performance.now() - start) / 1000);
      const t = formatElapsed(elapsed);
      if (t !== timeText) {
        const grew = t.length !== timeText.length;
        timeText = t;
        time.textContent = t;
        if (grew) { timeW = measure(t, time); layout(); }
      }
      // aim for the next whole second after `start`, so timeouts never accumulate drift
      later(tick, 1000 - ((performance.now() - start) % 1000) + 5);
    }

    root.classList.add("no-anim");
    showVerb(next(), false);
    tick();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("no-anim")));
    scheduleVerb();

    const onResize = () => layout();
    addEventListener("resize", onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        verbW = measure(verbHTML(verbText), verbs);
        timeW = measure(timeText, time);
        layout();
      });
    }

    function destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
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
