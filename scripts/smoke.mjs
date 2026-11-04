// Smoke test run before every deploy (and by hand): serves the built site, opens it in headless Chrome on a desktop
// and a phone, and fails on any script error, horizontal overflow, broken page, broken data file or a key feature
// that does not start. Chrome: $CHROME, else the usual install path.
// Usage: node scripts/smoke.mjs
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { path } from './lib.mjs';

const PORT = 5199;
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The Harvard ManageMentor badges are short programs: no page or data file may call them anything more.
const BANNED = /harvard (university|degree|graduate|alumni)|studied at harvard/i;
for (const f of ['index.html', '404.html', 'resume/index.html', ...readdirSync(path('data')).filter((x) => x.endsWith('.json')).map((x) => `data/${x}`), 'content/harvard.json']) {
  const hit = readFileSync(path(f), 'utf8').match(BANNED);
  check(!hit, `${f} makes no Harvard degree claim${hit ? ` (found "${hit[0]}")` : ''}`);
}

// Every data file parses.
for (const f of readdirSync(path('data')).filter((f) => f.endsWith('.json'))) {
  let ok = true;
  try { JSON.parse(readFileSync(path(`data/${f}`), 'utf8')); } catch { ok = false; }
  check(ok, `data/${f} is valid JSON`);
}

const server = spawn(process.execPath, [path('scripts/serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
try {
  for (let i = 0; i < 40; i++) { try { await fetch(BASE); break; } catch { await wait(150); } }

  for (const [label, url] of [['resume', '/resume/'], ['resume PDF', '/assets/resume/Sahaj-Saliya-Resume.pdf'], ['404 page', '/404.html']]) {
    const res = await fetch(BASE + url);
    check(res.ok, `${label} ${url} answers ${res.status}`);
  }

  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    // Third-party lookups (IP, CDN models) may be blocked on a CI runner; only first-party requests must work.
    const broken = [];
    page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) broken.push(`${r.status()} ${r.url().slice(BASE.length)}`); });
    await page.setViewport(vp);
    await page.goto(`${BASE}/?noreplay`, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2500);
    const s = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      sections: ['top', 'about', 'map', 'work', 'skills', 'experience', 'certs', 'fit', 'contact'].filter((id) => !document.getElementById(id)),
      bio: document.querySelector('#about')?.textContent.includes('B.Tech') || document.querySelector('#about')?.textContent.includes('PDEU'),
      trainlog: !!document.querySelector('.trainlog'),
      lens: !!document.querySelector('[data-lens]'),
      booting: document.documentElement.classList.contains('booting'),
    }));
    check(s.overflow <= 1, `${name}: no horizontal overflow (${s.overflow}px)`);
    check(!s.sections.length, `${name}: all sections present${s.sections.length ? ` (missing ${s.sections})` : ''}`);
    check(s.bio && s.trainlog && s.lens, `${name}: bio, training log and lens toggle rendered`);
    check(!s.booting, `${name}: loading screen finished`);

    // The lens turns on, draws for a word and turns off with Escape.
    await page.click('[data-lens]');
    await wait(800);
    const lensOn = await page.evaluate(() => document.documentElement.classList.contains('lens-on'));
    await page.keyboard.press('Escape');
    await wait(200);
    const lensOff = await page.evaluate(() => !document.documentElement.classList.contains('lens-on'));
    check(lensOn && lensOff, `${name}: lens toggles on and off`);

    // Harvard ManageMentor adapters: all badges, certificate images and PDFs load, and the block ends merged.
    const ad = await page.evaluate(async () => {
      const root = document.querySelector('[data-adapters]');
      if (!root) return { n: 0, slots: 0, bad: ['no #adapters block'] };
      const d = JSON.parse(root.querySelector('[data-ad-data]').textContent);
      const urls = [...new Set([...root.querySelectorAll('.ad-slot img')].map((i) => i.getAttribute('src')).concat(d.flatMap((x) => [x.cert, x.pdf])))];
      const bad = [];
      for (const u of urls) {
        const r = await fetch(u);
        const b = r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
        if (!b || b.length < 1000 || (u.endsWith('.pdf') && String.fromCharCode(...b.slice(0, 5)) !== '%PDF-')) bad.push(u);
      }
      return { n: d.length, slots: root.querySelectorAll('.ad-slot').length, pdfs: d.filter((x) => x.pdf).length, bad };
    });
    check(ad.n === 9 && ad.slots === 9 && ad.pdfs === 9 && !ad.bad.length, `${name}: 9 Harvard ManageMentor badges, certificates and PDFs load${ad.bad.length ? ` (broken: ${ad.bad.slice(0, 3).join(', ')})` : ''}`);
    if (name === 'desktop') {
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById('adapters').scrollIntoView(); });
      await wait(2500);
      const seen = await page.evaluate(() => ({
        decoded: [...document.querySelectorAll('#adapters .ad-front')].filter((i) => i.complete && i.naturalWidth > 0).length,
        n: document.querySelector('[data-ad-n]')?.textContent,
      }));
      check(seen.decoded === 9 && seen.n === '9', `${name}: the adapter rack shows 9 badges, merged ${seen.n} / 9`);
      await page.evaluate(() => scrollTo(0, 0));
    }

    // The chat panel opens.
    await page.evaluate(() => window.__ask?.());
    await wait(1200);
    check(await page.evaluate(() => !!document.querySelector('#ask-root [role="dialog"]:not([hidden])')), `${name}: chat panel opens`);

    check(!errors.length, `${name}: no script errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    check(!broken.length, `${name}: no broken first-party requests${broken.length ? `: ${broken.slice(0, 5).join(', ')}` : ''}`);
    await ctx.close();
  }

  // /blog, /blogs and anything under them go to the blog's own site; the request there is answered locally, so this
  // works offline and before that site exists.
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  p.on('request', (r) => (r.url().startsWith('https://blog.sahaj.si') ? r.respond({ status: 200, contentType: 'text/html', body: 'blog' }) : r.continue()));
  for (const [from, to] of [['/blog', 'https://blog.sahaj.si/'], ['/blogs/', 'https://blog.sahaj.si/'], ['/BLOG/', 'https://blog.sahaj.si/'], ['/blogs/some-post/?x=1', 'https://blog.sahaj.si/some-post/?x=1']]) {
    await p.goto(BASE + from, { waitUntil: 'networkidle0' }).catch(() => {});
    await wait(300);
    check(p.url() === to, `${from} goes to ${to} (got ${p.url()})`);
  }
  const home = await (await fetch(BASE + '/')).text();
  check(home.includes('href="https://blog.sahaj.si/"') && !/href="\/blogs?\//.test(home), 'the Blog link points to blog.sahaj.si');
} finally {
  await browser.close();
  server.kill();
}

if (fails.length) { console.error(`\nsmoke: ${fails.length} check(s) failed`); process.exit(1); }
console.log('\nsmoke: all checks passed');
