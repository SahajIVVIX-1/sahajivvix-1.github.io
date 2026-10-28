// Origin check. The site only runs as itself on info.sahaj.si, its GitHub Pages address and localhost.
// Anywhere else it shows a calm banner pointing to the original. Several modules call checkOrigin() (main,
// footer, chat, map), so it is not one line to delete; it runs once and every later call returns the cached result.
export const ORIGIN = 'https://info.sahaj.si';
const HOSTS = ['info.sahaj.si', 'www.info.sahaj.si', 'sahajivvix-1.github.io', 'localhost', '127.0.0.1', '[::1]'];

let result = null;

export function isOriginal(host = location.hostname) {
  return HOSTS.includes(host) || /^\d+\.\d+\.\d+\.\d+$/.test(host) && /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host);
}

// Same path on the original, without the visitor's /ip=<address> segment.
export function originalUrl(loc = location) {
  const p = loc.pathname.replace(/\/?ip=[0-9a-fA-F:.]{2,45}\/?$/, '/').replace(/\/index\.html$/, '/');
  return ORIGIN + p + loc.hash;
}

export function checkOrigin() {
  if (result !== null) return result;
  result = isOriginal();
  canonical();
  if (!result) banner();
  return result;
}

// Every page ships an absolute canonical tag; put it back if a copy removed or rewrote it.
function canonical() {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
  if (!link.href.startsWith(ORIGIN)) link.href = originalUrl();
}

function banner() {
  if (document.querySelector('[data-copy-banner]')) return;
  const url = originalUrl();
  const bar = document.createElement('div');
  bar.className = 'copy-banner';
  bar.dataset.copyBanner = '';
  bar.setAttribute('role', 'note');
  bar.innerHTML = `<p><span class="copy-dot" aria-hidden="true"></span>You're viewing a copy. The original is at <a href="${url}" rel="noopener">info.sahaj.si</a></p>`;
  document.body.prepend(bar);
  const root = document.documentElement;
  root.classList.add('is-copy');
  const fit = () => root.style.setProperty('--copy-h', `${bar.offsetHeight}px`);
  fit();
  new ResizeObserver(fit).observe(bar);
}
