// Builds the site's logo files from Sahaj's own logo artwork (three 2048 px PNGs, kept outside the repo; the
// originals are only read, never changed). Run: node scripts/brand.mjs [inputDir]   (default D:/=Sahaj/inputs)
//   A  dark background, S inside two rings     -> header (dark theme), app icons, maskable icon, OG image
//   B  light background, the same design       -> header (light theme)
// The browser-tab favicon is NOT made from this artwork: it stays the original "S." mark (favicon.ico,
// assets/brand/logo-small.svg, assets/brand/icon-32.png), as Sahaj asked.
// Every crop is taken from the artwork's own bounds (found automatically), which also leaves out the generator's
// sparkle watermark in the bottom-right corner. Nothing is recoloured or redrawn.
import sharp from 'sharp';
import { existsSync, writeFileSync } from 'node:fs';
import { path } from './lib.mjs';

const DIR = process.argv[2] || 'D:/=Sahaj/inputs';
const SRC = {
  A: 'Gemini_Generated_Image_40vn5a40vn5a40vn.png',
  B: 'Gemini_Generated_Image_6230c26230c26230.png',
};
for (const f of Object.values(SRC)) if (!existsSync(`${DIR}/${f}`)) throw new Error(`missing ${DIR}/${f}`);
const OUT = 'assets/brand';
const BG = '#171715'; // the artwork's own dark background

// Bounds of everything that is not background, ignoring the bottom-right corner (watermark).
async function bounds(file) {
  const { data, info } = await sharp(`${DIR}/${file}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = [data[0], data[1], data[2]];
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (x > w * 0.86 && y > h * 0.86) continue;
    const i = (y * w + x) * 3;
    if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 60) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: Math.max(x1 - x0, y1 - y0) / 2, w, h };
}
// A square around the artwork's centre, `pad` times its half-size.
function square(b, pad) {
  const half = Math.round(b.half * pad);
  return { left: Math.max(0, Math.round(b.cx - half)), top: Math.max(0, Math.round(b.cy - half)), width: Math.min(b.w, half * 2), height: Math.min(b.h, half * 2) };
}
const circleMask = (n) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}"><circle cx="${n / 2}" cy="${n / 2}" r="${n / 2}" fill="#fff"/></svg>`);
// The ringed logo as a disc: a circle just outside the outer ring, transparent outside it.
async function disc(key, b, n) {
  return sharp(`${DIR}/${SRC[key]}`).extract(square(b, 1.03)).resize(n, n, { kernel: 'lanczos3' })
    .composite([{ input: circleMask(n), blend: 'dest-in' }]).png({ compressionLevel: 9 });
}
// The ringed logo on a full square of its own background (app icons); `scale` < 1 leaves a safe margin.
async function tile(key, b, n, scale) {
  const inner = Math.round(n * scale);
  const art = await sharp(`${DIR}/${SRC[key]}`).extract(square(b, 1.03)).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer();
  const off = Math.round((n - inner) / 2);
  return sharp({ create: { width: n, height: n, channels: 4, background: BG } }).composite([{ input: art, left: off, top: off }]).png({ compressionLevel: 9 });
}

const bA = await bounds(SRC.A), bB = await bounds(SRC.B);
const files = {};
// header: 128 px covers the 34 px mark at up to 3.7x pixel density
for (const [key, b, name] of [['A', bA, 'logo-dark'], ['B', bB, 'logo-light']]) {
  files[`${OUT}/${name}.webp`] = await (await disc(key, b, 128)).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  files[`.cache/${name}-512.png`] = await (await disc(key, b, 512)).toBuffer(); // for scripts/og.mjs only
}
// app icons: the ringed logo on its own background; iOS and Android round the corners themselves
files[`${OUT}/apple-touch-icon.png`] = await (await tile('A', bA, 180, 0.92)).toBuffer();
files[`${OUT}/icon-192.png`] = await (await tile('A', bA, 192, 0.92)).toBuffer();
files[`${OUT}/icon-512.png`] = await (await tile('A', bA, 512, 0.92)).toBuffer();
// maskable: the whole logo inside the 80% safe zone
files[`${OUT}/icon-maskable-512.png`] = await (await tile('A', bA, 512, 0.78)).toBuffer();


for (const [f, buf] of Object.entries(files)) { writeFileSync(path(f), buf); console.log(`${f}  ${(buf.length / 1024).toFixed(1)} KB`); }
