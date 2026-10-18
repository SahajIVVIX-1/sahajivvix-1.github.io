// Tiny shared "something is generating" signal. The header logo reads it: the cursor dot blinks while any
// source is busy, and the ring spins while the chatbot is thinking. Sources: hero, gen (scroll), chat.
const sources = new Set();

export function setBusy(key, on) {
  on ? sources.add(key) : sources.delete(key);
  const d = document.documentElement.dataset;
  if (sources.size) d.busy = '1'; else delete d.busy;
  if (sources.has('chat')) d.thinking = '1'; else delete d.thinking;
}
