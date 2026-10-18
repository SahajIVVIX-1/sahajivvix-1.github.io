// Latent-space map: ~3000 points (words, README phrases and sentences, knowledge chunks and
// named items), embedded with MiniLM and reduced to 3D with UMAP at build time.
// Plain WebGL with one draw call; picking happens on the CPU from the same projection.
const KIND = { WORD: 0, CHUNK: 1, ITEM: 2, SENTENCE: 3 };
const KIND_NAME = ['word', 'passage', 'item', 'README sentence'];

export async function initMap(stage, { lowPower = false, reducedMotion = false } = {}) {
  let data;
  try { data = await (await fetch('/data/latent-map.json')).json(); } catch { return; }
  const canvas = stage.querySelector('canvas');
  const labelsEl = stage.querySelector('.map-labels');
  const tip = stage.querySelector('.map-tip');
  const legend = stage.querySelector('.map-legend');

  // Phones and weak devices keep every named item and passage but only a sample of the words.
  const keep = [];
  const n = data.kind.length;
  for (let i = 0; i < n; i++) {
    const k = data.kind[i];
    if (!lowPower || k === KIND.ITEM || k === KIND.CHUNK || i % 3 === 0) keep.push(i);
  }
  const P = new Float32Array(keep.length * 3);
  const A = new Float32Array(keep.length * 2); // kind, cluster
  keep.forEach((src, j) => {
    P.set(data.xyz.slice(src * 3, src * 3 + 3), j * 3);
    A[j * 2] = data.kind[src];
    A[j * 2 + 1] = data.cluster[src];
  });

  legend.innerHTML = '<span><i style="background:var(--ink-3)"></i>word / phrase</span><span><i style="background:var(--ink)"></i>passage</span><span><i style="background:var(--accent)"></i>project · skill · role</span>';

  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: lowPower ? 'low-power' : 'default' });
  if (!gl) return fallback();

  const prog = program(gl, VERT, FRAG);
  if (!prog) return fallback();
  gl.useProgram(prog);
  const buf = (arr, loc, size) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(prog, loc);
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0);
  };
  buf(P, 'a_pos', 3);
  buf(A, 'a_attr', 2);
  const U = Object.fromEntries(['u_rot', 'u_target', 'u_zoom', 'u_aspect', 'u_dpr', 'u_ink', 'u_ink3', 'u_accent', 'u_hot', 'u_fade'].map((u) => [u, gl.getUniformLocation(prog, u)]));
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Camera state.
  const cam = { yaw: 0.6, pitch: -0.25, zoom: 1, tx: 0, ty: 0, tz: 0 };
  let goal = null, hotCluster = -1, dpr = 1, W = 1, H = 1, visible = true, dragging = false, last = null, idleSpin = !reducedMotion;
  let colors = readColors();
  document.addEventListener('themechange', () => { colors = readColors(); });

  const items = data.items.map((it) => ({ ...it, j: keep.indexOf(it.i) })).filter((it) => it.j >= 0);
  const named = items.filter((it) => it.kind === 'project' || it.kind === 'experience');
  const labelEls = named.map((it) => {
    const a = document.createElement('a');
    a.className = `map-label kind-${it.kind}`;
    a.href = it.href;
    a.textContent = it.label;
    a.tabIndex = -1; // the map index below the canvas is the keyboard route
    a.addEventListener('click', (e) => { e.preventDefault(); fly(it); });
    labelsEl.append(a);
    return a;
  });

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2);
    W = stage.clientWidth; H = stage.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  // Portrait viewports need a wider field of view so edge labels stay inside the frame.
  const baseZoom = () => Math.max(0.58, Math.min(1, (W / H) * 0.95));
  cam.zoom = baseZoom();

  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) loop(); }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  // Projection shared by the shader and the CPU (for labels and picking).
  function rotation() {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    // R = Rx(pitch) · Ry(yaw), column-major for GLSL.
    return new Float32Array([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);
  }
  function project(j, R) {
    const x = P[j * 3] - cam.tx, y = P[j * 3 + 1] - cam.ty, z = P[j * 3 + 2] - cam.tz;
    const rx = R[0] * x + R[3] * y + R[6] * z;
    const ry = R[1] * x + R[4] * y + R[7] * z;
    const rz = R[2] * x + R[5] * y + R[8] * z;
    const persp = 1 / (2.6 - rz * 0.9);
    const s = cam.zoom * persp * 2.1;
    const aspect = W / H;
    const ndcX = (rx * s) / Math.max(aspect, 1);
    const ndcY = ry * s * Math.min(aspect, 1);
    return [(ndcX * 0.5 + 0.5) * W, (1 - (ndcY * 0.5 + 0.5)) * H, rz];
  }

  let raf = 0;
  function loop() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }
  function frame() {
    raf = 0;
    if (!visible || document.hidden) return;
    if (goal) {
      const k = 0.085;
      for (const key of ['yaw', 'pitch', 'zoom', 'tx', 'ty', 'tz']) cam[key] += (goal[key] - cam[key]) * k;
      if (Math.abs(goal.zoom - cam.zoom) < 0.002 && Math.abs(goal.tx - cam.tx) < 0.001) { goal.done?.(); goal = null; }
    } else if (idleSpin && !dragging) cam.yaw += 0.0011;
    const R = rotation();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(U.u_rot, false, R);
    gl.uniform3f(U.u_target, cam.tx, cam.ty, cam.tz);
    gl.uniform1f(U.u_zoom, cam.zoom);
    gl.uniform1f(U.u_aspect, W / H);
    gl.uniform1f(U.u_dpr, dpr);
    gl.uniform3fv(U.u_ink, colors.ink);
    gl.uniform3fv(U.u_ink3, colors.ink3);
    gl.uniform3fv(U.u_accent, colors.accent);
    gl.uniform1f(U.u_hot, hotCluster);
    gl.uniform1f(U.u_fade, colors.dark ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, keep.length);
    named.forEach((it, i) => {
      const [x, y, z] = project(it.j, R);
      const el = labelEls[i];
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = String(Math.max(0.25, Math.min(1, 0.6 + z * 0.6)));
      el.style.zIndex = String(Math.round((z + 2) * 10));
    });
    loop();
  }

  // ---------- interaction ----------
  function pick(mx, my) {
    const R = rotation();
    let best = -1, bd = lowPower ? 22 : 14;
    for (let j = 0; j < keep.length; j++) {
      const [x, y] = project(j, R);
      const d = Math.hypot(x - mx, y - my) - (A[j * 2] === KIND.ITEM ? 6 : A[j * 2] === KIND.CHUNK ? 3 : 0);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }
  function describe(j) {
    const src = keep[j];
    const kind = A[j * 2];
    const label = data.labels[src];
    const item = items.find((it) => it.j === j);
    const cluster = data.clusters[A[j * 2 + 1]];
    const head = item ? `<b>${esc(item.kind)}</b> · ${esc(label)}` : `<b>${KIND_NAME[kind]}</b> · ${esc(kind === KIND.SENTENCE || kind === KIND.CHUNK ? truncate(label, 120) : label)}`;
    return `${head}<br><span style="opacity:.7">nearest head: ${esc(cluster)}</span>`;
  }

  stage.addEventListener('pointerdown', (e) => {
    dragging = true; last = { x: e.clientX, y: e.clientY, moved: 0 };
    idleSpin = false;
  });
  addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (dragging && last) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last.moved += Math.abs(dx) + Math.abs(dy);
      cam.yaw += dx * 0.006;
      if (e.pointerType === 'mouse') cam.pitch = Math.max(-1.3, Math.min(1.3, cam.pitch + dy * 0.006));
      last.x = e.clientX; last.y = e.clientY;
      goal = null;
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const j = pick(mx, my);
    if (j < 0) { tip.classList.remove('is-on'); hotCluster = -1; stage.style.cursor = ''; return; }
    hotCluster = A[j * 2 + 1];
    tip.innerHTML = describe(j);
    tip.style.transform = `translate(${Math.min(mx + 14, W - 290)}px, ${my + 16}px)`;
    tip.classList.add('is-on');
    stage.style.cursor = A[j * 2] === KIND.ITEM || A[j * 2] === KIND.CHUNK ? 'pointer' : 'grab';
  });
  stage.addEventListener('pointerleave', () => { tip.classList.remove('is-on'); hotCluster = -1; });
  stage.addEventListener('click', (e) => {
    if (e.target.closest('.map-label') || (last && last.moved > 6)) return;
    const r = stage.getBoundingClientRect();
    const j = pick(e.clientX - r.left, e.clientY - r.top);
    if (j < 0) return;
    const item = items.find((it) => it.j === j);
    if (item) return fly(item);
    if (A[j * 2] === KIND.CHUNK) {
      const ci = keep[j] - (data.labels.length - data.items.length - data.chunkHref.length);
      const href = data.chunkHref[ci];
      if (href) fly({ j, href, label: data.labels[keep[j]] });
    } else if (e.pointerType !== 'mouse') {
      tip.innerHTML = describe(j);
      tip.style.transform = `translate(${Math.min(e.clientX - r.left + 10, W - 290)}px, ${e.clientY - r.top + 12}px)`;
      tip.classList.add('is-on');
      setTimeout(() => tip.classList.remove('is-on'), 2200);
    }
  });
  stage.addEventListener('dblclick', () => { goal = { ...cam, tx: 0, ty: 0, tz: 0, zoom: baseZoom() }; });

  // Fly the camera to an item, then open it (scroll to its section or follow the link).
  function fly(it) {
    idleSpin = false;
    tip.classList.remove('is-on');
    const open = () => {
      if (!it.href) return;
      if (it.href.startsWith('#') || it.href.startsWith('/#')) {
        const el = document.querySelector(it.href.replace(/^\//, ''));
        el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        history.pushState(null, '', it.href.replace(/^\//, ''));
      } else window.open(it.href, '_blank', 'noopener');
    };
    if (reducedMotion) return open();
    goal = { yaw: cam.yaw, pitch: cam.pitch, zoom: 3.2, tx: P[it.j * 3], ty: P[it.j * 3 + 1], tz: P[it.j * 3 + 2], done: () => setTimeout(open, 180) };
    loop();
  }

  loop();

  function fallback() {
    // Static 2D projection (x, y) as SVG with clickable project labels.
    const pts = keep.filter((_, j) => j % 2 === 0);
    const dots = pts.map((src) => `<circle cx="${(data.xyz[src * 3] * 46 + 50).toFixed(2)}" cy="${(-data.xyz[src * 3 + 1] * 46 + 50).toFixed(2)}" r="${data.kind[src] === KIND.ITEM ? 0.7 : 0.25}" fill="${data.kind[src] === KIND.ITEM ? 'var(--accent)' : 'var(--ink-3)'}"/>`).join('');
    const labels = data.items.filter((it) => it.kind === 'project').map((it) => `<a href="${it.href}"><text x="${(data.xyz[it.i * 3] * 46 + 50).toFixed(2)}" y="${(-data.xyz[it.i * 3 + 1] * 46 + 48).toFixed(2)}" font-size="2.4" text-anchor="middle" fill="var(--ink)" font-family="var(--serif)" font-style="italic">${esc(it.label)}</text></a>`).join('');
    canvas.remove();
    stage.insertAdjacentHTML('afterbegin', `<svg class="map-fallback" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Static projection of the embedding map">${dots}${labels}</svg>`);
  }
}

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = (v) => {
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = cs.getPropertyValue(v).trim();
    const hex = c.fillStyle; // normalised to #rrggbb
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  };
  return { ink: rgb('--ink'), ink3: rgb('--ink-3'), accent: rgb('--accent'), dark: document.documentElement.dataset.effectiveTheme === 'dark' };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function program(gl, vs, fs) {
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

const VERT = `
attribute vec3 a_pos;
attribute vec2 a_attr;
uniform mat3 u_rot;
uniform vec3 u_target;
uniform float u_zoom, u_aspect, u_dpr, u_hot, u_fade;
uniform vec3 u_ink, u_ink3, u_accent;
varying vec4 v_col;
void main() {
  vec3 p = u_rot * (a_pos - u_target);
  float persp = 1.0 / (2.6 - p.z * 0.9);
  float s = u_zoom * persp * 2.1;
  vec2 ndc = vec2(p.x * s / max(u_aspect, 1.0), p.y * s * min(u_aspect, 1.0));
  gl_Position = vec4(ndc, 0.0, 1.0);
  float kind = a_attr.x;
  float hot = step(abs(a_attr.y - u_hot), 0.1);
  float depth = clamp(0.55 + p.z * 0.45, 0.15, 1.0);
  vec3 col = u_ink3; float size = 2.2; float alpha = 0.55;
  if (kind > 2.5) { col = u_ink3; size = 2.6; alpha = 0.7; }        // README sentence
  else if (kind > 1.5) { col = u_accent; size = 7.0; alpha = 1.0; } // named item
  else if (kind > 0.5) { col = u_ink; size = 3.6; alpha = 0.85; }   // knowledge passage
  col = mix(col, u_accent, hot * 0.75 * step(kind, 1.9));
  alpha *= mix(1.0, 1.25, hot);
  gl_PointSize = size * u_dpr * (0.6 + depth * 0.7) * sqrt(u_zoom);
  v_col = vec4(col, alpha * depth * mix(0.9, 1.0, u_fade));
}`;

const FRAG = `
precision mediump float;
varying vec4 v_col;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.36, d) * v_col.a;
  if (a < 0.01) discard;
  gl_FragColor = vec4(v_col.rgb * a, a);
}`;
