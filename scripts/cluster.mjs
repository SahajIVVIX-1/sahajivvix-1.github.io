// Spherical k-means (cosine) with a seeded k-means++ start, plus TF-IDF keywords per cluster for automatic names.
import { mulberry32 } from './tsne.mjs';

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

export function kmeans(vecs, k, { seed = 11, iterations = 60 } = {}) {
  const N = vecs.length, D = vecs[0].length, rand = mulberry32(seed);
  // k-means++: first centre random, then each next one far from the existing centres
  const centres = [Float64Array.from(vecs[Math.floor(rand() * N)])];
  while (centres.length < k) {
    const dist = vecs.map((v) => Math.min(...centres.map((c) => 1 - dot(v, c))) ** 2);
    const total = dist.reduce((a, b) => a + b, 0);
    let u = rand() * total, pick = N - 1;
    for (let i = 0; i < N; i++) { u -= dist[i]; if (u <= 0) { pick = i; break; } }
    centres.push(Float64Array.from(vecs[pick]));
  }
  let labels = new Int32Array(N).fill(-1);
  for (let it = 0; it < iterations; it++) {
    let moved = 0;
    for (let i = 0; i < N; i++) {
      let best = 0, bs = -Infinity;
      for (let c = 0; c < k; c++) { const s = dot(vecs[i], centres[c]); if (s > bs) { bs = s; best = c; } }
      if (labels[i] !== best) { labels[i] = best; moved++; }
    }
    const sums = Array.from({ length: k }, () => new Float64Array(D));
    for (let i = 0; i < N; i++) for (let d = 0; d < D; d++) sums[labels[i]][d] += vecs[i][d];
    for (let c = 0; c < k; c++) { const n = Math.sqrt(dot(sums[c], sums[c])) || 1; for (let d = 0; d < D; d++) centres[c][d] = sums[c][d] / n; }
    if (!moved) break;
  }
  return { labels, centres };
}

// tokensPerDoc: array of arrays of stems; originals: stem -> most common surface word.
export function keywords(tokensPerDoc, labels, k, originals, { top = 10, ignore = new Set() } = {}) {
  const N = tokensPerDoc.length;
  const df = new Map();
  for (const doc of tokensPerDoc) for (const t of new Set(doc)) df.set(t, (df.get(t) || 0) + 1);
  const out = [];
  for (let c = 0; c < k; c++) {
    const tf = new Map();
    let n = 0;
    tokensPerDoc.forEach((doc, i) => { if (labels[i] !== c) return; n++; for (const t of doc) tf.set(t, (tf.get(t) || 0) + 1); });
    const scored = [...tf].filter(([t]) => !ignore.has(t) && df.get(t) >= 2)
      .map(([t, f]) => [t, f * Math.log(1 + N / df.get(t)) * (f / df.get(t))]) // frequent here, and concentrated here
      .sort((a, b) => b[1] - a[1]).slice(0, top);
    out.push({ n, words: scored.map(([t]) => originals.get(t) || t), stems: scored.map(([t]) => t) });
  }
  return out;
}

// Plain k-means on the 2D layout (several seeded restarts, lowest inertia wins). The clusters are therefore exactly
// the blobs the visitor sees on the map. pts: [[x, y], ...]
export function kmeans2d(pts, k, { restarts = 8, seed = 11, iterations = 60 } = {}) {
  const N = pts.length;
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const rand = mulberry32(seed + r * 101);
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    let cen = [pts[Math.floor(rand() * N)]];
    while (cen.length < k) {
      const d = pts.map((p) => Math.min(...cen.map((c) => d2(p, c))));
      let u = rand() * d.reduce((a, b) => a + b, 0), pick = N - 1;
      for (let i = 0; i < N; i++) { u -= d[i]; if (u <= 0) { pick = i; break; } }
      cen.push(pts[pick]);
    }
    const lab = new Int32Array(N);
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < N; i++) { let b = 0, bd = Infinity; cen.forEach((c, ci) => { const d = d2(pts[i], c); if (d < bd) { bd = d; b = ci; } }); lab[i] = b; }
      cen = cen.map((c, ci) => { const m = pts.filter((_, i) => lab[i] === ci); return m.length ? [m.reduce((a, p) => a + p[0], 0) / m.length, m.reduce((a, p) => a + p[1], 0) / m.length] : c; });
    }
    const inertia = pts.reduce((a, p, i) => a + d2(p, cen[lab[i]]), 0);
    if (!best || inertia < best.inertia) best = { labels: Int32Array.from(lab), centres: cen, inertia };
  }
  return best;
}
