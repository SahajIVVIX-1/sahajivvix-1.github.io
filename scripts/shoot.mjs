// Dev helper: screenshots pages at phone and desktop widths in both themes and reports
// console errors and horizontal overflow.
// Usage: node scripts/shoot.mjs <outDir> [path] [--full] [--wait=ms] [--sizes=1920x1080,390x844] [--bottom]
//        [--host=copy.example]   (served from localhost, but the browser sees that hostname: tests the copy banner)
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const [outDir = '.cache/shots', route = '/', ...flags] = process.argv.slice(2);
const flag = (k, d) => (flags.find((f) => f.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=')[1];
const full = flags.includes('--full');
const bottom = flags.includes('--bottom');
const wait = Number(flag('wait', 4500));
const host = flag('host', 'localhost');
const sizes = flag('sizes', '320x640,390x844,1440x900').split(',').map((s) => s.split('x').map(Number));
mkdirSync(outDir, { recursive: true });
const executablePath = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'];
if (host !== 'localhost') args.push(`--host-resolver-rules=MAP ${host} 127.0.0.1`);
const browser = await puppeteer.launch({ executablePath, headless: 'new', args });

for (const [w, h] of sizes) {
  for (const theme of ['light', 'dark']) {
    if (w === 320 && theme === 'dark') continue;
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
    await page.goto(`http://${host}:5173${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, wait));
    if (bottom) {
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await new Promise((r) => setTimeout(r, 1500));
    }
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > docW + 1 && getComputedStyle(el).position !== 'fixed').slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
      return { scrollW: document.documentElement.scrollWidth, docW, wide };
    });
    const name = `${outDir}/${route.replace(/\W+/g, '_') || 'home'}${host !== 'localhost' ? `-${host}` : ''}${bottom ? '-bottom' : ''}-${w}-${theme}.png`;
    await page.screenshot({ path: name, fullPage: full });
    console.log(name, overflow.scrollW > overflow.docW ? `OVERFLOW ${overflow.scrollW}>${overflow.docW} ${overflow.wide.join(' ')}` : 'no-overflow', errors.length ? `ERRORS: ${errors.join(' | ')}` : '');
    await page.close();
  }
}
await browser.close();
