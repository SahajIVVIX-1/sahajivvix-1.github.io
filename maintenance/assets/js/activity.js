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

    let fit = 1, verbText = "", timeText = "", verbW = 0, timeW = 0;

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
    function verbHTML(w) { return w.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])) + '<span class="ell">...</span>'; }

    // shrink the type a little when a long verb + timer would not fit the column (mobile)
    function layout() {
      const chrome = (root.offsetWidth - verbs.offsetWidth - time.offsetWidth);
      const avail = (root.parentElement.clientWidth || innerWidth) - 2;
      const need = verbW + timeW;
      fit = Math.max(0.68, Math.min(1, (avail - chrome) / need));
      root.style.setProperty("--fit", fit.toFixed(3));
      // grow at once; when shrinking, wait for the outgoing word to leave so it is never cropped
      const w = Math.ceil(verbW * fit);
      verbs.style.transitionDelay = w < verbs.offsetWidth ? "0.18s" : "0s";
      verbs.style.width = w + "px";
      time.style.width = Math.ceil(timeW * fit) + "px";
    }

    function showVerb(word, animate) {
      verbText = word;
      verbW = measure(verbHTML(word), verbs);
      const el = document.createElement("span");
      el.className = "act-verb";
      el.innerHTML = verbHTML(word);
      verbs.querySelectorAll(".act-verb").forEach(old => {
        if (!animate) { old.remove(); return; }
        old.classList.remove("in");
        old.classList.add("out");
        const done = () => old.remove();
        old.addEventListener("animationend", done, { once: true });
        later(done, 600);
      });
      if (animate) el.classList.add("in");
      verbs.appendChild(el);
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
