// Dev helper: records the boot sequence with CDP screencast and writes a filmstrip PNG and an animated WebP.
// Usage: node scripts/boot-film.mjs <outDir> <name> <width> <height> <light|dark> [query]   e.g. ... 1440 900 dark "?ref=linkedin"
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const [out, name = 'boot', w = '1440', h = '900', scheme = 'dark', query = ''] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const W = Number(w), H = Number(h);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const ctx = await browser.createBrowserContext();
const page = await ctx.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1, isMobile: W < 700, hasTouch: W < 700 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await page.createCDPSession();
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  frames.push({ t: f.metadata.timestamp * 1000, data: Buffer.from(f.data, 'base64') });
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await page.goto(`http://localhost:5173/${query}`, { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 5200));
await cdp.send('Page.stopScreencast');
await browser.close();

if (frames.length < 3) { console.log('too few frames', frames.length, errs); process.exit(1); }
const t0 = frames[0].t;
console.log(`${name}: ${frames.length} frames over ${Math.round(frames.at(-1).t - t0)} ms, errors:`, errs.length ? errs : 'none');

// Filmstrip: 8 evenly spaced frames (by time) in a 4x2 grid, labelled with their timestamp.
const span = frames.at(-1).t - t0;
const picks = [];
for (let i = 0; i < 8; i++) {
  const target = t0 + (span * 0.8 * i) / 7;
  picks.push(frames.reduce((b, f) => (Math.abs(f.t - target) < Math.abs(b.t - target) ? f : b), frames[0]));
}
const tw = W < 700 ? 240 : 480, th = Math.round((tw * H) / W);
const cells = await Promise.all(picks.map(async (f, i) => {
  const img = await sharp(f.data).resize(tw, th).png().toBuffer();
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="22"><rect width="100%" height="100%" fill="#000" opacity=".6"/><text x="8" y="15" font-family="monospace" font-size="12" fill="#fff">t = ${((f.t - t0) / 1000).toFixed(2)} s</text></svg>`);
  return sharp(img).composite([{ input: label, gravity: 'southwest' }]).png().toBuffer();
}));
const cols = W < 700 ? 4 : 4, rows = 2;
await sharp({ create: { width: cols * tw, height: rows * th, channels: 3, background: '#888' } })
  .composite(cells.map((input, i) => ({ input, left: (i % cols) * tw, top: Math.floor(i / cols) * th })))
  .png().toFile(`${out}/${name}-filmstrip.png`);

// Animated WebP of the sequence. WebP images are limited to 16383 px, so cap the number of stacked frames.
const aw = W < 700 ? 240 : 560, ah = Math.round((aw * H) / W);
const n = Math.min(40, Math.floor(16000 / ah));
const step = 3600 / n, ms = [], bufs = [];
for (let i = 0; i < n; i++) {
  const t = i * step;
  const f = frames.reduce((b, c) => (Math.abs(c.t - t0 - t) < Math.abs(b.t - t0 - t) ? c : b), frames[0]);
  bufs.push(await sharp(f.data).resize(aw, ah).ensureAlpha().raw().toBuffer());
  ms.push(Math.round(step));
}
await sharp(Buffer.concat(bufs), { raw: { width: aw, height: ah * bufs.length, channels: 4 } })
  .webp({ loop: 0, delay: ms, quality: 70 }).toFile(`${out}/${name}.webp`);
console.log('wrote', `${name}-filmstrip.png`, `${name}.webp`);
