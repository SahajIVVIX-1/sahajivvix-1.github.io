// Minimal static server for local preview of dist/ (no dependencies).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';
import { path } from './lib.mjs';

const DIST = path('dist');
const PORT = Number(process.env.PORT) || 4321;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\/])+/, '');
  let file = join(DIST, p);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {}
  try {
    let body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Cache-Control': 'max-age=600' };
    // gzip text like GitHub Pages does, so local Lighthouse runs match production.
    if (/text|javascript|json|svg|xml/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
    res.writeHead(200, headers).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(await readFile(join(DIST, '404.html')).catch(() => 'Not found'));
  }
}).listen(PORT, () => console.log(`serving dist/ on http://localhost:${PORT}`));
