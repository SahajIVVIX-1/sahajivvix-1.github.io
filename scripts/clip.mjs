// Build-time CLIP text embeddings for "show it an image" on the map (assets/js/see.js).
// Prompts: content/projects.json ("visual") and content/clip-prompts.json (skills).
//   data/clip.json   one entry per project and skill on the map: its map point, label and int8 vectors of its
//                    visual descriptions.
// The browser embeds the dropped image with the matching CLIP vision tower, so both sit in the same space.
// Skips the work when the prompts did not change (hash in data/clip.json).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readJSON, write, path } from './lib.mjs';

export const CLIP_MODEL = 'Xenova/clip-vit-base-patch32';
const DIM = 512;

export async function clipAll({ force = process.argv.includes('--force') } = {}) {
  const projects = readJSON('content/projects.json');
  const map = readJSON('data/map.json');
  if (!map) { console.log('clip: no data/map.json yet, skipping'); return; }

  const items = [];
  for (const p of projects) {
    const at = map.projects.find((x) => x.id === p.id);
    if (at && p.visual?.length) items.push({ i: at.i, label: p.name, kind: 'project', u: `#p-${p.id}`, prompts: p.visual });
  }
  // Only skills with written visual descriptions: a generic "an image about X" prompt scores about the same for
  // every picture and drowns out the real matches.
  const cp = readJSON('content/clip-prompts.json', { skills: {}, other: [] });
  map.points.forEach((pt, i) => { if (pt.k === 'skill' && cp.skills[pt.t]) items.push({ i, label: pt.t, kind: 'skill', u: pt.u, prompts: cp.skills[pt.t] }); });
  // The Harvard ManageMentor badges and certificates: a dropped shield or certificate lands on the adapter rack.
  const ad = map.points.findIndex((pt) => pt.u === '#adapters');
  if (ad >= 0 && cp.adapters?.length) items.push({ i: ad, label: 'Harvard ManageMentor badges', kind: 'cert', u: '#adapters', prompts: cp.adapters });
  // Everyday classes with no map point: they absorb images unrelated to the work (zero-shot "none of the above").
  for (const t of cp.other || []) items.push({ i: -1, label: t, kind: 'other', prompts: [t] });

  const hash = createHash('sha256').update(JSON.stringify([CLIP_MODEL, items, 2])).digest('hex').slice(0, 16);
  if (!force && readJSON('data/clip.json', {}).hash === hash && existsSync(path('data/clip.json'))) { console.log('clip: prompts unchanged, skipping'); return; }

  const { AutoTokenizer, CLIPTextModelWithProjection, env } = await import('@huggingface/transformers');
  env.cacheDir = path('.cache/models');
  const tokenizer = await AutoTokenizer.from_pretrained(CLIP_MODEL);
  // Full-precision text tower: it only runs here, and it separates the classes clearly better than q8 (the
  // browser's vision tower stays q8 to keep the download small).
  const model = await CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL, { dtype: 'fp32' });
  const prompts = items.flatMap((x) => x.prompts);
  const { text_embeds } = await model(tokenizer(prompts, { padding: true, truncation: true }));
  const q8 = (row) => {
    let n = 0; for (const v of row) n += v * v; n = Math.sqrt(n) || 1;
    return Buffer.from(Int8Array.from(row, (v) => Math.max(-127, Math.min(127, Math.round((v / n) * 127)))).buffer).toString('base64');
  };
  let k = 0;
  const out = items.map(({ prompts: ps, ...x }) => ({ ...x, v: ps.map(() => q8(Array.from(text_embeds.data.slice(k * DIM, (k++ + 1) * DIM)))) }));
  write('data/clip.json', { model: CLIP_MODEL, dim: DIM, hash, items: out });
  console.log(`clip: ${out.length} items, ${prompts.length} prompts`);
}
