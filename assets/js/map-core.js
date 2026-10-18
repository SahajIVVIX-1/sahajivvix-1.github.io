// Pure helpers shared by the build script (Node) and the embedding map (browser): tokenising and stemming for
// the keyword fallback, int8 vector decoding, cosine similarity, and the label-placement pass.
// No DOM access here, so all of it can be tested in Node.

export const STOP = new Set('a an the and or of to in on at by for with from is are was were be been it its this that these those he his him she her they them their we our you your i me my not no so as can will just do does did have has had which who what when where how all any each more most other some such only also via per vs into out up use used using one two new make made get can may via'.split(' '));

// Very small stemmer: enough that "agents"/"agent" and "learning"/"learn" meet in the keyword fallback.
export function stem(w) {
  return w.replace(/(ations|ation|ings|ing|ies|ied|es|ed|s)$/, (m) => (m === 'ies' || m === 'ied' ? 'y' : '')).replace(/(.)\1$/, '$1');
}

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z][a-z0-9+#-]*[a-z0-9+#]|[a-z]/g) || [])
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map(stem)
    .filter((w) => w.length > 1);
}

// int8 vectors are stored base64 (scale 127) to keep the data file small.
export function decodeVec(b64) {
  const bin = atob(b64);
  const v = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) v[i] = (bin.charCodeAt(i) << 24) >> 24;
  return v;
}

export function cosineInt8(q, v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += q[i] * v[i];
  return s / 127;
}

/* ---------- label placement ----------
   Greedy, in priority order. For each label, try candidate spots around its cluster's edge and keep the one
   with the least overlap (other labels, project nodes, other clusters' points). If even the best spot overlaps
   too much the label is hidden, so labels can never pile up.
   clusters: [{ cx, cy, r, w, h, priority }]  (screen px; w/h = label box size)
   obstacles: [{ x, y, r } | { x, y, w, h }]  (project nodes, UI overlays; x, y = centre)   points: [{ x, y }]  (all points, for "don't sit on data")
   bounds: { w, h }
   Returns [{ x, y, hidden }] with x, y = centre of each label box. */
export function placeLabels(clusters, obstacles, points, bounds) {
  const placed = [];
  const out = new Array(clusters.length);
  const order = clusters.map((c, i) => i).sort((a, b) => clusters[b].priority - clusters[a].priority);
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2))
    * Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
  for (const i of order) {
    const c = clusters[i];
    let best = null;
    for (let k = 0; k < 24; k++) {
      const th = (k / 24) * Math.PI * 2 - Math.PI / 2;
      for (const extra of [10, 26, 46]) {
        const d = c.r + extra;
        // put the box so that its nearest edge, not its centre, touches the ring
        const x = c.cx + Math.cos(th) * (d + (Math.abs(Math.cos(th)) * c.w) / 2);
        const y = c.cy + Math.sin(th) * (d + (Math.abs(Math.sin(th)) * c.h) / 2);
        const box = { x, y, w: c.w, h: c.h };
        let score = 0;
        const oob = Math.max(0, c.w / 2 - x) + Math.max(0, x + c.w / 2 - bounds.w) + Math.max(0, c.h / 2 - y) + Math.max(0, y + c.h / 2 - bounds.h);
        score += oob * 400;
        for (const p of placed) score += overlap(box, p) * 6;
        // obstacles are circles ({ x, y, r }: project nodes) or boxes ({ x, y, w, h }: the HUD, zoom buttons, legend)
        for (const o of obstacles) score += overlap(box, { x: o.x, y: o.y, w: o.w ?? o.r * 2 + 8, h: o.h ?? o.r * 2 + 8 }) * 60;
        let on = 0;
        for (const p of points) if (Math.abs(p.x - x) < c.w / 2 && Math.abs(p.y - y) < c.h / 2) on++;
        score += on * 14;
        score += extra * 0.6; // prefer hugging the cluster
        if (!best || score < best.score) best = { x, y, w: c.w, h: c.h, score };
      }
    }
    const hidden = !best || best.score > 900;
    out[i] = { x: best ? best.x : c.cx, y: best ? best.y : c.cy, hidden };
    if (!hidden) placed.push(best);
  }
  return out;
}
