// "Show it an image": CLIP ViT-B/32 embeds a dropped image on this device and compares it with the CLIP text
// embeddings of the visual descriptions of his projects and skills (data/clip.json, computed at build time).
// Loaded only when a visitor picks, drops or pastes an image. The image is never uploaded: Transformers.js runs the
// model here, and the only downloads are the model weights (once, then cached) and data/clip.json.
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0';
const DTYPE = 'q8';
const SIZE = '≈88 MB';
// CLIP's own logit scale: turns cosine similarities into a distribution over the candidates.
const SCALE = 100;

let ready = null;
function load(status) {
  return (ready ||= (async () => {
    status(`loading CLIP vision model (${SIZE}, once)…`);
    const [tf, clip] = await Promise.all([import(/* @vite-ignore */ TRANSFORMERS), fetch('/data/clip.json').then((r) => r.json())]);
    tf.env.allowLocalModels = false;
    const progress = (p) => { if (p.status === 'progress' && p.progress != null && /onnx/.test(p.file || '')) status(`loading CLIP vision model… ${Math.round(p.progress)}%`); };
    const [proc, model] = await Promise.all([
      tf.AutoProcessor.from_pretrained(clip.model),
      tf.CLIPVisionModelWithProjection.from_pretrained(clip.model, { dtype: DTYPE, progress_callback: progress }),
    ]);
    const dec = (b) => { const s = atob(b); const v = new Int8Array(s.length); for (let i = 0; i < s.length; i++) v[i] = (s.charCodeAt(i) << 24) >> 24; return v; };
    const items = clip.items.map((x) => ({ ...x, v: x.v.map(dec) }));
    return { tf, proc, model, items };
  })().catch((e) => { ready = null; throw e; }));
}

// Returns the closest projects and skills ({ i, label, kind, u, sim, p }) and, when an everyday class ("a photo
// of food") beats all of his work, its name in `other`.
export async function embedImage(file, status = () => {}) {
  const { tf, proc, model, items } = await load(status);
  status('embedding your image on this device…');
  const t0 = performance.now();
  // Shrink with a high-quality filter first (a plain canvas resize aliases and moves the embedding), then embed the
  // image and its mirror and average them: the result depends less on how this browser decodes and scales.
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 224 / Math.min(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const small = k < 1 ? await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' }) : bmp;
  const embed = async (mirror) => {
    const cv = new OffscreenCanvas(w, h);
    const x = cv.getContext('2d');
    if (mirror) { x.translate(w, 0); x.scale(-1, 1); }
    x.drawImage(small, 0, 0, w, h);
    return (await model(await proc(tf.RawImage.fromCanvas(cv)))).image_embeds.data;
  };
  const [a, b] = [await embed(false), await embed(true)];
  const e = { data: a.map((v, i) => v + b[i]) };
  let n = 0; for (const v of e.data) n += v * v; n = Math.sqrt(n) || 1;
  const scored = items.map((x) => {
    let best = -1;
    for (const v of x.v) { let s = 0; for (let k = 0; k < v.length; k++) s += e.data[k] * v[k]; best = Math.max(best, s / n / 127); }
    return { ...x, v: undefined, sim: best };
  }).sort((a, b) => b.sim - a.sim);
  const top = scored[0].sim;
  const z = scored.map((s) => Math.exp(SCALE * (s.sim - top)));
  const Z = z.reduce((a, b) => a + b, 0);
  scored.forEach((s, k) => { s.p = z[k] / Z; });
  const work = scored.filter((s) => s.kind !== 'other' && s.i >= 0).slice(0, 5);
  const pw = work.reduce((a, s) => a + s.p, 0) || 1;
  work.forEach((s) => { s.p /= pw; }); // share of the match among his work only
  return { work, other: scored[0].kind === 'other' ? scored[0].label : '', ms: Math.round(performance.now() - t0) };
}
