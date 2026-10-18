// Pure helpers for the hero "thinking" line: a tiny BPE-style splitter, stable token ids, a no-repeat verb bag
// and the elapsed-time format. No DOM here, so it can be tested in Node.
//
// The splitter is rule based, not a real tokenizer: it peels known suffixes off each word ("Pondering" ->
// Pond + ering), cuts long stems at consonant-to-vowel boundaries ("Synthes" -> Synth + es) and keeps spaces
// attached to the following word like GPT-style " word" tokens. Joining the pieces always gives the original text.

const SUFFIXES = [
  'ologizing', 'ographing', 'ifying', 'izing', 'ising', 'yzing', 'ating', 'ering', 'ening', 'ouring', 'uating',
  'ulating', 'ing', 'ize', 'ise', 'ify', 'ate', 'ed', 'es', 'ion', 'ment', 'ness', 'ity', 'ally', 'ly', 'ous', 'ive', 'al', 'er',
];
const isVowel = (c) => 'aeiouy'.includes(c);

// Cut a stem into pieces of at most 6 characters, preferring a consonant | vowel boundary like " synth | es ".
function chunk(stem) {
  const out = [];
  let rest = stem;
  while (rest.length > 6) {
    let cut = 4;
    for (let i = 5; i >= 3; i--) {
      if (!isVowel(rest[i - 1]) && isVowel(rest[i])) { cut = i; break; }
    }
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) out.push(rest);
  return out;
}

function splitWord(word) {
  const lower = word.toLowerCase();
  let stem = word;
  let suffix = '';
  for (const s of SUFFIXES) {
    if (lower.endsWith(s) && lower.length - s.length >= 3) { suffix = word.slice(word.length - s.length); stem = word.slice(0, word.length - s.length); break; }
  }
  const pieces = chunk(stem);
  if (suffix) pieces.push(suffix);
  return pieces;
}

// FNV-1a over the token text -> a stable 4-5 digit id, like the ids a real vocabulary shows.
export function tokenId(piece) {
  let h = 2166136261;
  for (let i = 0; i < piece.length; i++) { h ^= piece.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1000 + ((h >>> 0) % 98000);
}

// "Dialectically Synthesizing" -> [Dial][ectic][ally][ Synth][es][izing][…]; every piece is { t, id }.
export function tokenize(verb) {
  const out = [];
  const parts = verb.split(/(\s+|-)/).filter((p) => p !== '');
  let lead = '';
  for (const p of parts) {
    if (/^\s+$/.test(p)) { lead = ' '; continue; }
    if (p === '-') { out.push(p); continue; }
    splitWord(p).forEach((piece, i) => { out.push((i === 0 ? lead : '') + piece); });
    lead = '';
  }
  out.push('…');
  return out.map((t) => ({ t, id: tokenId(t) }));
}

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Every cycle draws each word exactly once; a new cycle never opens with the word that closed the last one.
// next() draws the next word; peek(k) shows the k words that are next in line without drawing them; take(word)
// draws a specific one of them (used when the next verb is sampled from a few candidates).
export function createBag(words, random = Math.random) {
  let pool = [];
  let last = null;
  const mix = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const refill = () => {
    if (pool.length) return;
    pool = mix(words.slice());
    if (pool.length > 1 && pool[pool.length - 1] === last) [pool[0], pool[pool.length - 1]] = [pool[pool.length - 1], pool[0]];
  };
  const next = () => { refill(); last = pool.pop(); return last; };
  next.peek = (k) => { refill(); return pool.slice(-k).reverse(); };
  next.take = (word) => { refill(); const i = pool.lastIndexOf(word); if (i < 0) return next(); pool.splice(i, 1); last = word; return word; };
  return next;
}

export function formatElapsed(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

export { shuffle };
