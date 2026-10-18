// Generates the logo files from scripts/logo-geometry.mjs: static SVGs (strokes converted to outlined paths), the
// favicon set, apple-touch-icon, PWA icons and a maskable icon. Run: node scripts/logo.mjs
// Outputs: assets/brand/*.svg, assets/brand/icon-*.png, assets/brand/apple-touch-icon.png, favicon.ico
import sharp from 'sharp';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { COLORS, build, outlinePath, strokePath } from './logo-geometry.mjs';

const { navy, ivory, orange } = COLORS;
const OUT = 'assets/brand';
mkdirSync(OUT, { recursive: true });
const wordmark = JSON.parse(readFileSync(new URL('./wordmark.json', import.meta.url), 'utf8')); // Anthropic Serif Text Medium Italic, outlined once

const full = build('full');
const small = build('small');
const r1 = (n) => Math.round(n * 10) / 10;

// the mark (S + nodes + cursor dot) as static outlined shapes
function mark(m, ink, { caps = 'none', dot = orange } = {}) {
  return `<path fill="${ink}" d="${outlinePath(m, caps)}"/>${m.nodes.map(([x, y, r]) => `<circle fill="${ink}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}"/>`).join('')}<circle fill="${dot}" cx="${r1(m.dot[0])}" cy="${r1(m.dot[1])}" r="${r1(m.dot[2])}"/>`;
}
const scaled = (k, inner) => (k === 1 ? inner : `<g transform="translate(256 256) scale(${k}) translate(-256 -256)">${inner}</g>`);
const svg = (inner, { w = 512, h = 512, title = 'Sahaj Saliya' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${title}</title>${inner}</svg>\n`;
const disc = (fill) => `<circle cx="256" cy="256" r="244" fill="${fill}"/>`;

const files = {
  'logo.svg': svg(disc(ivory) + mark(full, navy)),
  'logo-inverse.svg': svg(disc(navy) + mark(full, ivory)),
  'logo-mark.svg': svg(mark(full, navy)),
  'logo-mark-light.svg': svg(mark(full, ivory)),
  'logo-small.svg': svg(disc(ivory) + mark(small, navy, { caps: 'round' }), { title: 'Sahaj Saliya (small sizes)' }),
};
// horizontal lockup: the disc mark + "Sahaj Saliya" in Anthropic Serif italic (outlined)
const lockup = (ink) => svg(`${disc(ivory)}${mark(full, navy)}<path fill="${ink}" transform="translate(600 306) scale(1.3)" d="${wordmark.d}"/>`, { w: 1860, h: 512 });
files['logo-lockup.svg'] = lockup(navy);
files['logo-lockup-dark.svg'] = lockup(ivory);
for (const [name, body] of Object.entries(files)) writeFileSync(`${OUT}/${name}`, body);

// ---- raster icons ----
const png = (body, size, opts = {}) => sharp(Buffer.from(body), { density: 384 }).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9, ...opts }).toBuffer();
const fullDisc = files['logo.svg'];
const smallDisc = files['logo-small.svg'];
// square, full-bleed icons (apple touch and maskable): the mark sits inside the safe zone
const square = (k) => svg(`<rect width="512" height="512" fill="${ivory}"/>${scaled(k, mark(full, navy))}`);

const icons = {
  [`${OUT}/icon-32.png`]: await png(smallDisc, 32),
  [`${OUT}/icon-192.png`]: await png(fullDisc, 192),
  [`${OUT}/icon-512.png`]: await png(fullDisc, 512),
  [`${OUT}/apple-touch-icon.png`]: await png(square(1.18), 180),
  [`${OUT}/icon-maskable-512.png`]: await png(square(0.95), 512),
};
for (const [p, buf] of Object.entries(icons)) writeFileSync(p, buf);

// favicon.ico: 16 and 32 use the simplified mark, 48 the full one (PNG-compressed entries)
const sizes = [[16, smallDisc], [32, smallDisc], [48, fullDisc]];
const pngs = await Promise.all(sizes.map(([s, body]) => png(body, s)));
const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = sizes.map(([s], i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); e.writeUInt8(s, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync('favicon.ico', Buffer.concat([head, ...dir, ...pngs]));

// the live header uses the stroke form of the same geometry (see build.mjs); print its size for the record
console.log('wrote', Object.keys(files).join(', '));
console.log('stroke path chars', strokePath(full).length, '| outline chars', outlinePath(full).length);
