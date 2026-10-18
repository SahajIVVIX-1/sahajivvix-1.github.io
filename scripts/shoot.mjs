// Dev helper: screenshots pages at phone and desktop widths in both themes and reports
// console errors and horizontal overflow. Usage: node scripts/shoot.mjs <outDir> [path] [--full]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [outDir = '.cache/shots', route = '/', ...flags] = process.argv.slice(2);
const full = flags.includes('--full');
const wait = Number((flags.find((f) => f.startsWith('--wait=')) || '--wait=4500').split('=')[1]);
mkdirSync(outDir, { recursive: true });
const executablePath = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });

for (const [w, h] of [[320, 640], [390, 844], [1440, 900]]) {
  for (const theme of ['light', 'dark']) {
    if (w === 320 && theme === 'dark') continue;
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, wait));
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > docW + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      return { scrollW: document.documentElement.scrollWidth, docW, wide };
    });
    const name = `${outDir}/${route.replace(/\W+/g, '_') || 'home'}-${w}-${theme}.png`;
    await page.screenshot({ path: name, fullPage: full });
    console.log(name, overflow.scrollW > overflow.docW ? `OVERFLOW ${overflow.scrollW}>${overflow.docW} ${overflow.wide.join(' ')}` : 'no-overflow', errors.length ? `ERRORS: ${errors.join(' | ')}` : '');
    await page.close();
  }
}
await browser.close();
