// Renders assets/img/og.png (1200x630) from HTML using the site's own fonts and Sahaj's logo.
// Run: node scripts/brand.mjs first (it writes .cache/logo-dark-512.png), then node scripts/og.mjs
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { path } from './lib.mjs';
const u = (f) => pathToFileURL(path(f)).href;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:IS;src:url(${u('assets/fonts/instrument-serif-latin-400-italic.woff2')});font-style:italic}
@font-face{font-family:IT;src:url(${u('assets/fonts/pagio/pagio.ttf')});font-weight:100 900}
@font-face{font-family:JB;src:url(${u('assets/fonts/botera/botera-regular-stencil.otf')});font-weight:100 800}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#171715;color:#ECE8DE;padding:0 80px 0 70px;display:flex;align-items:center;gap:64px;position:relative;overflow:hidden}
.logo{flex:none;width:400px;height:400px}
h1{font:italic 400 132px/.9 IS;letter-spacing:-.03em}
.t{font:450 44px/1.15 IT;letter-spacing:-.025em;margin-top:26px;color:#ECE8DE}.t i{font:italic 400 1.08em IS;color:#E8743B}
.foot{position:absolute;left:534px;bottom:58px;font:500 22px JB;color:#8F8C84}</style>
<img class="logo" src="${u('.cache/logo-dark-512.png')}" alt="">
<div><h1>Sahaj Saliya</h1><div class="t">I build AI that <i>reads</i>, <i>sees</i><br>and <i>acts</i>.</div></div>
<div class="foot">info.sahaj.si</div>`;
const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630 });
// Loaded from a file (not setContent) so file:// fonts are allowed.
mkdirSync(path('.cache'), { recursive: true });
writeFileSync(path('.cache/og.html'), html);
await p.goto(pathToFileURL(path('.cache/og.html')).href, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: path('assets/img/og.png') });
await b.close();
