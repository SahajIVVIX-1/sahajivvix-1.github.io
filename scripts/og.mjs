// Renders assets/img/og.png (1200x630) from HTML using the site's own fonts. Run: node scripts/og.mjs
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { path } from './lib.mjs';
const u = (f) => pathToFileURL(path(f)).href;
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:IS;src:url(${u('assets/fonts/instrument-serif-latin-400-italic.woff2')});font-style:italic}
@font-face{font-family:IT;src:url(${u('assets/fonts/inter-tight-latin-wght-normal.woff2')});font-weight:100 900}
@font-face{font-family:JB;src:url(${u('assets/fonts/jetbrains-mono-latin-wght-normal.woff2')});font-weight:100 800}
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0B1020;color:#ECE8DE;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.top{font:500 22px JB;color:#B9B5AA;display:flex;align-items:center;gap:14px}.dot{width:12px;height:12px;border-radius:50%;background:#FF8A5B;box-shadow:0 0 18px #FF8A5B}
h1{font:italic 400 190px/.9 IS;letter-spacing:-.035em}
.t{font:450 50px/1.1 IT;letter-spacing:-.03em;margin-top:22px}.t i{font:italic 400 1.06em IS;color:#FF8A5B}
.bars{position:absolute;right:72px;top:96px;width:250px;font:500 17px JB;color:#B9B5AA}
.r{display:grid;grid-template-columns:90px 1fr 46px;gap:10px;align-items:center;margin:9px 0}.b{height:8px;border-radius:4px;background:#1E2742;position:relative}.b u{position:absolute;inset:0 auto 0 0;border-radius:4px;background:#8F8C84}
.r.p{color:#FF8A5B}.r.p u{background:#FF8A5B}
.foot{font:500 22px JB;color:#8F8C84}</style>
<div class="top"><span class="dot"></span>sampling · temperature 0.7 · top-k 4</div>
<div class="bars"><div class="r p"><span>·reads</span><span class="b"><u style="width:47%"></u></span><span>0.47</span></div><div class="r"><span>·writes</span><span class="b"><u style="width:21%"></u></span><span>0.21</span></div><div class="r"><span>·learns</span><span class="b"><u style="width:19%"></u></span><span>0.19</span></div><div class="r"><span>·thinks</span><span class="b"><u style="width:13%"></u></span><span>0.13</span></div></div>
<div><h1>Sahaj Saliya</h1><div class="t">I build AI that <i>reads</i>, <i>sees</i> and <i>acts</i>.</div></div>
<div class="foot">info.sahaj.si · LLM · NLP · CV · GenAI · Agents</div>`;
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
