// One-off importer for the Harvard ManageMentor completion badges (run again only when a program is added).
// Usage: node scripts/harvard-assets.mjs "<folder with one sub-folder per program>"
// Each sub-folder holds hmm_<slug>_badge.png and a one-page certificate PDF. Nothing is typed in by hand: the
// program name and month are read from the PDF's own text (pdf.js in headless Chrome), the order is month then the
// PDF file's modified time, and every image is made from the files themselves:
//   assets/achievements/harvard/<slug>/badge-256.webp, badge-512.webp   the shield
//   .../certificate.webp (1600 px), certificate-thumb.webp (480 px)       page 1 of the PDF
//   .../certificate-tile.webp                                             the thumbnail centred on a transparent
//                                                                         card the shape of the badge (flip side)
//   .../certificate.pdf                                                   the PDF itself
// content/harvard.json gets the facts; fields added there by hand (links, focus) are kept.
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { readJSON, write, path } from './lib.mjs';

const SRC = process.argv[2];
if (!SRC) throw new Error('usage: node scripts/harvard-assets.mjs "<source folder>"');
const OUT = 'assets/achievements/harvard';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setContent(`<script src="${PDFJS}/pdf.min.js"></script>`, { waitUntil: 'networkidle0' });

// page 1 as a PNG (about 1600 px wide) plus its text lines
async function readPdf(file) {
  const b64 = readFileSync(file).toString('base64');
  return page.evaluate(async (b64, worker) => {
    const lib = window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = worker;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const pdf = await lib.getDocument({ data: bytes }).promise;
    const p = await pdf.getPage(1);
    const base = p.getViewport({ scale: 1 });
    const vp = p.getViewport({ scale: 1600 / base.width });
    const cv = document.createElement('canvas');
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    await p.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    const text = (await p.getTextContent()).items.map((i) => i.str).join('\n');
    return { pages: pdf.numPages, png: cv.toDataURL('image/png').split(',')[1], text };
  }, b64, `${PDFJS}/pdf.worker.min.js`);
}

const prev = new Map((readJSON('content/harvard.json', { programs: [] }).programs || []).map((p) => [p.slug, p]));
const programs = [];
for (const dir of readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const files = readdirSync(join(SRC, dir.name));
  const png = files.find((f) => /^hmm_.+_badge\.png$/.test(f));
  const pdf = files.find((f) => f.toLowerCase().endsWith('.pdf'));
  if (!png || !pdf) throw new Error(`${dir.name}: needs one hmm_*_badge.png and one PDF`);
  const slug = png.replace(/^hmm_|_badge\.png$/g, '').replace(/_/g, '-');
  const r = await readPdf(join(SRC, dir.name, pdf));
  if (r.pages !== 1) throw new Error(`${pdf}: expected one page, found ${r.pages}`);
  const flat = r.text.replace(/\s+/g, ' ').trim();
  const m = flat.match(/best practices presented in (.+?) Presented by:/);
  const month = flat.match(new RegExp(`(${MONTHS.join('|')}) (20\\d\\d)`));
  if (!m || !month || !/Sahaj Saliya/.test(flat) || !/Harvard Business Impact/.test(flat)) throw new Error(`${pdf}: certificate text not recognised:\n${flat}`);
  const program = m[1].trim();
  if (program.toLowerCase().replace(/[^a-z]+/g, '-') !== slug) throw new Error(`${pdf}: program "${program}" does not match the badge ${png}`);

  const dest = `${OUT}/${slug}`;
  mkdirSync(path(dest), { recursive: true });
  const badge = sharp(join(SRC, dir.name, png));
  const meta = await badge.metadata();
  for (const w of [256, 512]) await sharp(join(SRC, dir.name, png)).resize({ width: w }).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(path(`${dest}/badge-${w}.webp`));
  const page1 = Buffer.from(r.png, 'base64');
  const pm = await sharp(page1).metadata();
  await sharp(page1).webp({ quality: 84, effort: 6 }).toFile(path(`${dest}/certificate.webp`));
  await sharp(page1).resize({ width: 480 }).webp({ quality: 84, effort: 6 }).toFile(path(`${dest}/certificate-thumb.webp`));
  // the back of the flip card: the thumbnail, centred with a small margin on a transparent card of the badge's shape
  const TW = 512, TH = Math.round(TW * meta.height / meta.width), inner = TW - 32;
  const thumb = await sharp(page1).resize({ width: inner }).png().toBuffer();
  const th = Math.round(inner * pm.height / pm.width);
  await sharp({ create: { width: TW, height: TH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: thumb, left: 16, top: Math.round((TH - th) / 2) }]).webp({ quality: 84, alphaQuality: 90, effort: 6 }).toFile(path(`${dest}/certificate-tile.webp`));
  copyFileSync(join(SRC, dir.name, pdf), path(`${dest}/certificate.pdf`));

  const mi = MONTHS.indexOf(month[1]) + 1;
  programs.push({
    ...prev.get(slug),
    program, slug,
    month: `${month[2]}-${String(mi).padStart(2, '0')}`,
    issuer: 'Harvard ManageMentor®, Harvard Business Impact (with HBI Education)',
    file: png.replace(/\.png$/, ''),
    // the PDF's modified time only orders programs within the same month
    mtime: statSync(join(SRC, dir.name, pdf)).mtime.toISOString(),
    badge: { src: `/${dest}/badge-512.webp`, small: `/${dest}/badge-256.webp`, width: meta.width, height: meta.height },
    certificate: { src: `/${dest}/certificate.webp`, thumb: `/${dest}/certificate-thumb.webp`, tile: `/${dest}/certificate-tile.webp`, width: pm.width, height: pm.height },
    pdf: `/${dest}/certificate.pdf`,
  });
  console.log(`${program} · ${month[1]} ${month[2]}`);
}
await browser.close();
programs.sort((a, b) => a.month.localeCompare(b.month) || a.mtime.localeCompare(b.mtime));
const prevDoc = readJSON('content/harvard.json', {});
write('content/harvard.json', JSON.stringify({
  _note: prevDoc._note || 'Harvard ManageMentor completion badges. Facts are read from each certificate PDF by scripts/harvard-assets.mjs; "links" and "focus" are added by hand.',
  ...prevDoc, programs,
}, null, 2) + '\n');
console.log(`harvard: ${programs.length} programs`);
