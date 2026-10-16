// Shared helpers for the scrape + build pipeline. No dependencies.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const path = (p) => ROOT + p;

export async function readJSON(p, fallback = null) {
  try { return JSON.parse(await readFile(p, 'utf8')); } catch { return fallback; }
}

export async function writeJSON(p, data) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2) + '\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch with timeout + exponential backoff. Throws on non-2xx after retries.
export async function http(url, { retries = 2, timeout = 20000, as = 'json', ...init } = {}) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
      if (r.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText} ${url}`);
      return as === 'json' ? await r.json() : as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (e) {
      last = e;
      if (e.fatal) break;
      if (i < retries) await sleep(600 * 2 ** i);
    }
  }
  throw last;
}

// Stable hash for change detection (FNV-1a, hex).
export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
