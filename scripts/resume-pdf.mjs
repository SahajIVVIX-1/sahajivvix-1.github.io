// Prints /resume/ (rendered by build.mjs from content/) to assets/resume/Sahaj-Saliya-Resume.pdf with headless
// Chrome. Usage: node scripts/resume-pdf.mjs [--force]   (CHROME=<path> picks the browser)
// A PDF embeds its creation time, so it is only printed again when the resume page itself changed (hash kept in
// assets/resume/resume.json); otherwise the hourly job would commit a new PDF every hour.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { readJSON, readText, write, path } from './lib.mjs';

const OUT = 'assets/resume/Sahaj-Saliya-Resume.pdf';
const html = readText('resume/index.html');
if (!html) throw new Error('resume/index.html is missing: run node scripts/build.mjs first');
const hash = createHash('sha256').update(html).digest('hex').slice(0, 16);
if (!process.argv.includes('--force') && readJSON('assets/resume/resume.json', {}).hash === hash && existsSync(path(OUT))) {
  console.log('resume-pdf: resume unchanged, skipping');
  process.exit(0);
}

const executablePath = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'].find((p) => existsSync(p));
if (!executablePath) throw new Error('no Chrome found: set CHROME=<path>');
const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(path('resume/index.html')).href, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, outline: false });
await browser.close();
mkdirSync(path('assets/resume'), { recursive: true });
writeFileSync(path(OUT), pdf);
write('assets/resume/resume.json', { hash, bytes: pdf.length });
console.log(`resume-pdf: wrote ${OUT} (${Math.round(pdf.length / 1024)} KB)`);
