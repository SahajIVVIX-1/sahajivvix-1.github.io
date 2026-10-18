// Exact t-SNE (van der Maaten & Hinton, 2008) for a few hundred points, written out in full so the training the
// visitor scrolls through is a real run: real perplexity calibration, real gradient descent with momentum and
// gains, real KL divergence per epoch. Seeded, so the same content always produces the same animation.

export function mulberry32(seed) {
  return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// vecs: array of unit-length Float arrays. Returns { snapshots: [{ epoch, Y }], loss: Float64Array(epochs + 1), perplexity }.
export function tsne(vecs, { perplexity = 30, epochs = 300, seed = 7, initSpread = 4, exaggeration = 12, exaggerateFor = 80, eta = 60, snapshotEpochs = [] } = {}) {
  const N = vecs.length;
  const rand = mulberry32(seed);
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  // 1. Squared distances in the embedding space (unit vectors: |a-b|^2 = 2 - 2 a.b).
  const d2 = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    let dot = 0; const a = vecs[i], b = vecs[j];
    for (let k = 0; k < a.length; k++) dot += a[k] * b[k];
    const d = Math.max(0, 2 - 2 * dot);
    d2[i * N + j] = d2[j * N + i] = d;
  }

  // 2. Conditional probabilities p(j|i): a Gaussian per point whose width is tuned so its entropy matches the perplexity.
  const P = new Float64Array(N * N);
  const target = Math.log(perplexity);
  for (let i = 0; i < N; i++) {
    let beta = 1, lo = -Infinity, hi = Infinity;
    const row = new Float64Array(N);
    for (let it = 0; it < 60; it++) {
      let sum = 0, dp = 0;
      for (let j = 0; j < N; j++) { if (j === i) { row[j] = 0; continue; } const e = Math.exp(-d2[i * N + j] * beta); row[j] = e; sum += e; dp += d2[i * N + j] * e; }
      if (sum === 0) sum = 1e-300;
      const H = Math.log(sum) + (beta * dp) / sum;
      const diff = H - target;
      if (Math.abs(diff) < 1e-5) break;
      if (diff > 0) { lo = beta; beta = hi === Infinity ? beta * 2 : (beta + hi) / 2; } else { hi = beta; beta = lo === -Infinity ? beta / 2 : (beta + lo) / 2; }
    }
    let sum = 0; for (let j = 0; j < N; j++) sum += row[j];
    for (let j = 0; j < N; j++) P[i * N + j] = row[j] / sum;
  }
  // symmetrise: p_ij = (p(j|i) + p(i|j)) / 2N
  const Ps = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) Ps[i * N + j] = Math.max((P[i * N + j] + P[j * N + i]) / (2 * N), 1e-12);

  // 3. The map: an untrained, uniform random scatter. Training pulls similar points together.
  const Y = new Float64Array(N * 2);
  for (let i = 0; i < N * 2; i++) Y[i] = (rand() * 2 - 1) * initSpread;
  const update = new Float64Array(N * 2), gains = new Float64Array(N * 2).fill(1), grad = new Float64Array(N * 2), num = new Float64Array(N * N);
  const loss = new Float64Array(epochs + 1);
  const snaps = [];
  const want = new Set(snapshotEpochs);

  const step = (epoch, exag, mom) => {
    let Z = 0;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = Y[i * 2] - Y[j * 2], dy = Y[i * 2 + 1] - Y[j * 2 + 1];
      const n = 1 / (1 + dx * dx + dy * dy);
      num[i * N + j] = num[j * N + i] = n;
      Z += 2 * n;
    }
    grad.fill(0);
    let kl = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const n = num[i * N + j], q = Math.max(n / Z, 1e-12), p = Ps[i * N + j];
      kl += p * Math.log(p / q); // the true KL (without exaggeration), recorded as the training loss
      const m = 4 * (exag * p - q) * n;
      grad[i * 2] += m * (Y[i * 2] - Y[j * 2]);
      grad[i * 2 + 1] += m * (Y[i * 2 + 1] - Y[j * 2 + 1]);
    }
    loss[epoch] = kl;
    return grad;
  };

  // epoch 0 = the untrained scatter
  step(0, exaggeration, 0.5);
  if (want.has(0)) snaps.push({ epoch: 0, Y: Float64Array.from(Y) });
  for (let e = 1; e <= epochs; e++) {
    const exag = e <= exaggerateFor ? exaggeration : 1;
    const mom = e <= exaggerateFor ? 0.5 : 0.8;
    const g = step(e - 1 === 0 ? 0 : e - 1, exag, mom);
    for (let k = 0; k < N * 2; k++) {
      gains[k] = (Math.sign(g[k]) !== Math.sign(update[k])) ? gains[k] + 0.2 : gains[k] * 0.8;
      if (gains[k] < 0.01) gains[k] = 0.01;
      update[k] = mom * update[k] - eta * gains[k] * g[k];
      Y[k] += update[k];
    }
    // keep the map centred
    let mx = 0, my = 0; for (let i = 0; i < N; i++) { mx += Y[i * 2]; my += Y[i * 2 + 1]; }
    mx /= N; my /= N; for (let i = 0; i < N; i++) { Y[i * 2] -= mx; Y[i * 2 + 1] -= my; }
    if (want.has(e)) snaps.push({ epoch: e, Y: Float64Array.from(Y) });
    if (e === epochs) { step(epochs, 1, 0.8); }
  }
  return { snapshots: snaps, loss, perplexity, finalY: Y };
}
