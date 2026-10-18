// Dev helper: viewport screenshots of named sections. Usage: node scripts/sections.mjs <outDir> <width> <theme> id1,id2,...
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [out, w = '1440', theme = 'light', ids = 'about,map,p-crohnsight,skills,experience,certs,contact'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const p = await b.newPage();
await p.setViewport({ width: Number(w), height: Number(w) < 700 ? 800 : 900 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 5000));
for (const id of ids.split(',')) {
  await p.evaluate((id) => { document.documentElement.style.scrollBehavior = 'auto'; document.getElementById(id)?.scrollIntoView(); }, id);
  await new Promise((r) => setTimeout(r, 1800));
  await p.screenshot({ path: `${out}/${id}-${w}-${theme}.png` });
  console.log(id);
}
await b.close();
