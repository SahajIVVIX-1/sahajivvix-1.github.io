// Geometry of the "S." logo, shared by scripts/logo.mjs (static files) and scripts/build.mjs (the live header logo).
// The S is ONE continuous Bezier stroke (4 cubic segments, C1-continuous) with a small node at each end, leaning 9
// degrees like the italic serif. The full stop is the "cursor" dot. Everything lives in a 512 x 512 box; the disc is
// centred at (256, 256) with r = 244.
export const COLORS = { navy: '#0B0F1E', ivory: '#F3EEE3', orange: '#E8571A' };

const SK = Math.tan((9 * Math.PI) / 180); // italic lean
const SC = 1.1; // size of the S inside the disc
const r1 = (n) => Math.round(n * 10) / 10;

// the stroke before the lean/scale, as cubic segments [P0, P1, P2, P3]
const SEGS = [
  [[316, 168], [300, 136], [262, 120], [222, 120]],
  [[222, 120], [176, 120], [148, 148], [148, 182]],
  [[148, 182], [148, 216], [178, 234], [228, 252]],
  [[228, 252], [278, 270], [312, 290], [312, 330]],
  [[312, 330], [312, 368], [276, 394], [230, 394]],
  [[230, 394], [192, 394], [160, 376], [144, 342]],
];

const affine = ([x, y]) => [256 + SC * (x - 256 - SK * (y - 256)), 256 + SC * (y - 256)];

// bounding box of the lean/scaled S (control polygons are a safe over-estimate) plus the dot, used to centre the mark
function centring(dot) {
  const pts = SEGS.flat().map(affine);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs, dot[0] - dot[2]), x1 = Math.max(...xs, dot[0] + dot[2]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys, dot[1] + dot[2]);
  return [256 - (x0 + x1) / 2, 256 - (y0 + y1) / 2];
}

// two variants: the full mark, and a bolder one without separate nodes for 16-32 px
export const VARIANTS = {
  full: { w: 30, nodes: [[316, 168, 21], [144, 342, 21]], dot: [372, 372, 27] },
  small: { w: 46, nodes: [], dot: [378, 378, 38] },
};

export function build(kind = 'full') {
  const v = VARIANTS[kind];
  // dot is given in final coordinates (before centring); nodes are given in stroke space
  const [dx, dy] = centring(v.dot);
  const shift = ([x, y]) => [x + dx, y + dy];
  const segs = SEGS.map((s) => s.map((p) => shift(affine(p))));
  return {
    kind,
    segs, // final coordinates, 512 box
    width: v.w * SC,
    nodes: v.nodes.map(([x, y, r]) => { const [X, Y] = shift(affine([x, y])); return [X, Y, r * SC]; }),
    dot: [v.dot[0] + dx, v.dot[1] + dy, v.dot[2]],
    shift: [dx, dy],
  };
}

// ---- stroke -> outline (Tiller-Hanson offset of each half-segment, so the static files need no stroke) ----
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const lerp = (a, b, t) => add(mul(a, 1 - t), mul(b, t));
const norm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const nrm = (t) => [-t[1], t[0]];

function split([p0, p1, p2, p3]) {
  const a = lerp(p0, p1, 0.5), b = lerp(p1, p2, 0.5), c = lerp(p2, p3, 0.5);
  const d = lerp(a, b, 0.5), e = lerp(b, c, 0.5), m = lerp(d, e, 0.5);
  return [[p0, a, d, m], [m, e, c, p3]];
}
function intersect(p, d1, q, d2, fallback) {
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-6) return fallback;
  const t = ((q[0] - p[0]) * d2[1] - (q[1] - p[1]) * d2[0]) / den;
  return add(p, mul(d1, t));
}
function offsetCubic([p0, p1, p2, p3], d) {
  const t0 = norm(sub(p1, p0)), t1 = norm(sub(p2, p1)), t2 = norm(sub(p3, p2));
  const o0 = add(p0, mul(nrm(t0), d)), o3 = add(p3, mul(nrm(t2), d));
  const a = add(p1, mul(nrm(t0), d)), b = add(p1, mul(nrm(t1), d)), c = add(p2, mul(nrm(t1), d)), e = add(p2, mul(nrm(t2), d));
  const q1 = intersect(a, t0, b, t1, add(p1, mul(nrm(t0), d)));
  const q2 = intersect(c, t1, e, t2, add(p2, mul(nrm(t2), d)));
  return [o0, q1, q2, o3];
}
const f = (p) => `${r1(p[0])} ${r1(p[1])}`;

// Outline of the stroke as one closed path. caps: 'round' | 'none' (the nodes cover the ends).
export function outlinePath(m, caps = 'none') {
  const half = [];
  for (const s of m.segs) { const [a, b] = split(s); half.push(a, b); }
  const dist = m.width / 2;
  const left = half.map((s) => offsetCubic(s, dist));
  const right = half.map((s) => offsetCubic(s, -dist)).reverse().map(([a, b, c, d]) => [d, c, b, a]);
  let d = `M${f(left[0][0])}`;
  for (const [, a, b, c] of left) d += `C${f(a)} ${f(b)} ${f(c)}`;
  const end = left[left.length - 1][3], endR = right[0][0];
  d += caps === 'round' ? `A${r1(dist)} ${r1(dist)} 0 0 0 ${f(endR)}` : `L${f(endR)}`;
  for (const [, a, b, c] of right) d += `C${f(a)} ${f(b)} ${f(c)}`;
  const start = left[0][0], startR = right[right.length - 1][3];
  d += caps === 'round' ? `A${r1(dist)} ${r1(dist)} 0 0 0 ${f(start)}` : '';
  void end; void startR;
  return d + 'Z';
}

// The same stroke as a plain Bezier chain (used by the live header logo, so it can be styled and animated).
export function strokePath(m) {
  let d = `M${f(m.segs[0][0])}`;
  for (const [, a, b, c] of m.segs) d += `C${f(a)} ${f(b)} ${f(c)}`;
  return d;
}
