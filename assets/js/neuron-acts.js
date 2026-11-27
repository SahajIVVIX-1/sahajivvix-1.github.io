// Neuron's repertoire: everything it can do besides walking and hopping. Loaded with neuron.js.
//
//   EMOTES  body animations (CSS classes .nr-e-<name> in main.css) with their length in ms
//   ACTS    things it does on its own; each has a weight, an optional `when(c)` (the context: section in view, card,
//           time, theme, …) and `run(b, c)` using the small API neuron.js passes in (say, emote, fx, hopTo, trick…)
//   REACT   what it does when the visitor does something (copies, selects, switches the theme, comes back, …)
//   TRICKS  the word tricks (lift a word and play with it; the page text never changes)
//
// Everything it says about Sahaj is either fixed fact from the site or read from the page at that moment (card
// titles, metrics), so nothing here can drift out of date or claim more than the page does.
export const EMOTES = {
  wave: 1300, spin: 800, backflip: 900, frontflip: 900, shake: 700, nod: 800, shrug: 1000, stretch: 1300, yawn: 1600,
  bounce: 1000, moonwalk: 1600, tiptoe: 1400, dizzy: 1500, jump: 800, salute: 1500, peek: 1500, wobble: 1000,
  glow: 1600, tilt: 1400, sneeze: 1100, hiccup: 1200, shiver: 900, twirl: 900, kick: 900, dance: 2200, cheer: 1200,
  flex: 1300, point: 1300, lookaround: 2000, wink: 900, surprise: 900, zoom: 900, pancake: 1100, grow: 1300,
  shrink: 1300, float: 1800, wiggle: 1000, think: 1800, shy: 1500, drum: 1400,
};

export const TRICKS = ['swap', 'juggle', 'shout', 'reverse', 'spell', 'tokens', 'count', 'underline', 'wave', 'shrinkword'];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const istTime = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date());
const short = (s, n = 46) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const greet = (h) => (h < 5 ? 'Up late?' : h < 12 ? 'Good morning!' : h < 17 ? 'Good afternoon!' : h < 22 ? 'Good evening!' : 'Burning the midnight oil?');

// [id, weight, when(c) | null, run(b, c)]
const DEF = [
  // ---- pure body language (anywhere) ----
  ...Object.keys(EMOTES).filter((e) => !['think', 'point'].includes(e)).map((e) => [`emote-${e}`, 1, null, (b) => b.emote(e)]),

  // ---- about itself ----
  ['self-origin', 2, null, (b) => b.say("I'm the output neuron from the loading screen.")],
  ['self-lines', 2, null, (b) => b.say('I live on lines of text. Margins are scary.')],
  ['self-made', 1, null, (b) => b.say('One circle, two eyes, one axon. Minimalist.')],
  ['self-server', 2, null, (b) => b.say('No server behind me. Just your browser.')],
  ['self-temp', 2, null, (b, c) => b.say(`I sample at τ ${c.tau.toFixed(1)} right now.`)],
  ['self-tricks', 1, null, (b) => b.say(`I know ${b.count} tricks. Click me.`)],
  ['self-weights', 1, null, (b) => b.say('My weights fit in a tweet. Probably.')],
  ['self-attention', 1, null, async (b) => { await b.emote('lookaround'); await b.say('Paying attention. Literally.'); }],
  ['self-gradient', 1, null, async (b) => { await b.emote('wobble'); await b.say('Gradient check: still descending.'); }],
  ['self-overfit', 1, null, (b) => b.say("I've seen this page before. Don't tell my validator.")],
  ['self-dropout', 1, null, async (b) => { await b.emote('shrink'); await b.say('Dropout! …just kidding, still here.'); }],
  ['self-batch', 1, null, (b) => b.say('Batch size: one. Me.')],

  // ---- time, theme, visit ----
  ['time-greet', 3, (c) => c.mins < 3, (b, c) => b.say(greet(c.hour))],
  ['time-ist', 2, null, (b) => b.say(`It's ${istTime()} in Gandhinagar, where Sahaj is.`)],
  ['time-weekend', 2, (c) => c.day === 0 || c.day === 6, (b) => b.say('Weekend reading? Respect.')],
  ['time-late', 2, (c) => c.hour >= 23 || c.hour < 5, async (b) => { await b.emote('yawn'); await b.say('Late-night inference mode.'); }],
  ['time-long', 2, (c) => c.mins > 4, (b, c) => b.say(`${Math.round(c.mins)} minutes in. Thanks for staying.`)],
  ['theme-hot', 2, (c) => c.theme === 'dark', async (b) => { await b.emote('glow'); await b.say('τ 0.9: everything feels possible.'); }],
  ['theme-cold', 2, (c) => c.theme === 'light', (b) => b.say('τ 0.2: calm and deterministic.')],
  ['theme-auto', 1, (c) => c.theme === 'auto', (b) => b.say("Following your system's temperature.")],
  ['depth', 3, (c) => c.depth > 5 && c.depth < 95, (b, c) => b.say(`You're ${c.depth}% through the forward pass.`)],
  ['lens-tip', 2, (c) => !c.lens && !c.small, (b) => b.say('Try the Lens up top: hover any word.')],
  ['lens-on', 2, (c) => c.lens, async (b) => { await b.emote('lookaround'); await b.say('Lens on. I can see the attention lines.'); }],
  ['tip-search', 2, (c) => !c.small, (b) => b.say('Ctrl K searches the whole site.')],
  ['tip-slash', 1, (c) => !c.small, (b) => b.say('Press / to search, too.')],
  ['tip-ask', 2, null, (b) => b.say('The Ask button answers from his own data.')],
  ['tip-plain', 1, null, (b) => b.say('Prefer it calm? "plain view" turns us off.')],
  ['tip-menu', 2, (c) => c.mins < 4, (b) => b.say('Click me for a menu.')],
  ['tip-palette-neuron', 1, (c) => !c.small, (b) => b.say('If I nap, Ctrl K → "Neuron" wakes me.')],
  ['think-verb', 2, (c) => !!c.verb, async (b, c) => { await b.emote('think'); await b.say(`Also ${c.verb.toLowerCase()}…`); }],

  // ---- hero ----
  ['top-name', 3, (c) => c.section === 'top', (b) => b.say('That name was sampled token by token. I watched.')],
  ['top-console', 4, (c) => c.section === 'top' && !c.small && b0(c), async (b) => { if (await b.hopTo('.rsa-head')) { await b.emote('point'); await b.say('Try me: reads, sees, acts. All on your device.'); } }],
  ['top-badge', 3, (c) => c.section === 'top', async (b) => { if (await b.hopTo('.hb-name')) { await b.emote('salute'); await b.say('Guinness World Records participant, 2022.'); } }],
  ['top-tagline', 2, (c) => c.section === 'top', async (b) => { if (await b.hopTo('.hero-title')) { await b.emote('flex'); await b.say('Reads, sees and acts. Like me, but bigger.'); } }],
  ['top-chips', 1, (c) => c.section === 'top', (b) => b.say('LLM, NLP, CV, GenAI, Agents: his five focus tokens.')],
  ['top-scroll', 2, (c) => c.section === 'top' && c.depth < 3, async (b) => { await b.emote('point'); await b.say('Scroll down: 18 layers to go.'); }],

  // ---- about ----
  ['about-bio', 3, (c) => c.section === 'about', (b) => b.say('Layer 2: the bio. Short and real.')],
  ['about-pdeu', 2, (c) => c.section === 'about', (b) => b.say('B.Tech ICT at PDEU, Gandhinagar.')],
  ['about-photo', 2, (c) => c.section === 'about', async (b) => { await b.emote('shy'); await b.say("That's Sahaj. I'm the small one."); }],
  ['about-card', 3, (c) => c.section === 'about', async (b) => { if (await b.hopTo('.pc-links')) { await b.emote('point'); await b.say('CV downloads his resume. Watch the photo turn, cube by cube.'); } }],
  ['about-status', 2, (c) => c.section === 'about' && !!document.querySelector('.pc-status'), (b) => b.say(`Status: ${document.querySelector('.pc-status').textContent.trim()}.`)],

  // ---- map ----
  ['map-what', 3, (c) => c.section === 'map', (b) => b.say('Real chunks of his work, laid out by t-SNE.')],
  ['map-try', 3, (c) => c.section === 'map', (b) => b.say('Type a topic in the map; it lights up.')],
  ['map-image', 2, (c) => c.section === 'map' && !c.small, (b) => b.say('You can drop an image on the map too.')],
  ['map-kl', 1, (c) => c.section === 'map', async (b) => { await b.emote('dizzy'); await b.say('All that KL divergence makes me dizzy.'); }],

  // ---- work / products: read from the card in view ----
  ['card-metric', 6, (c) => !!c.card, async (b, c) => { await b.emote('cheer'); await b.say(`${short(c.card.title, 28)}: ${short(`${c.card.metric} ${c.card.label}`, 52)}`, { ms: 4200 }); }],
  ['card-kind', 3, (c) => !!c.card?.kind, (b, c) => b.say(`${short(c.card.title, 30)} is ${c.card.kind.toLowerCase()}.`)],
  ['card-limits', 3, (c) => !!c.card?.limits, (b) => b.say('Every card lists its limits. Honest models.')],
  ['card-stack', 2, (c) => !!c.card?.stack, (b, c) => b.say(`Built with ${c.card.stack}.`)],
  ['card-heat', 2, (c) => c.section === 'work', (b) => b.say('The heat-map is real attention over its README.')],
  ['card-flick', 2, (c) => c.section === 'work' && !c.small, (b) => b.say('One flick, one card. Try it.')],
  ['card-swipe', 2, (c) => (c.section === 'work' || c.section === 'products') && c.small, (b) => b.say('Swipe sideways for the next card.')],
  ['work-count', 2, (c) => c.section === 'work', (b, c) => b.say(`${c.cards} model cards in this layer.`)],
  ['products-what', 3, (c) => c.section === 'products', (b) => b.say('Products: things he shipped for real use.')],

  // ---- skills, experience, certs, fit, contact, footer ----
  ['skills', 3, (c) => c.section === 'skills', (b) => b.say('Skills, listed like model parameters.')],
  ['skills-flex', 2, (c) => c.section === 'skills', async (b) => { await b.emote('flex'); await b.say('Parameters: tuned.'); }],
  ['exp', 3, (c) => c.section === 'experience', (b) => b.say('Training: every role is a checkpoint.')],
  ['exp-loss', 2, (c) => c.section === 'experience', (b) => b.say('Watch the loss go down as he learns.')],
  ['certs', 3, (c) => c.section === 'certs', (b) => b.say('Evaluation: certificates and GitHub stats.')],
  ['adapters', 3, (c) => c.near.adapters, (b) => b.say('Harvard ManageMentor: short programs, merged in like adapters.')],
  ['guinness', 3, (c) => c.near.guinness, async (b) => { await b.emote('salute'); await b.say('Guinness World Records participant, 2022.'); }],
  ['fit', 4, (c) => c.section === 'fit', (b) => b.say('Paste a job post here: honest match, gaps included.')],
  ['contact', 4, (c) => c.section === 'contact', async (b) => { await b.emote('wave'); await b.say('Say hi. The email is right here.'); }],
  ['contact-ist', 2, (c) => c.section === 'contact', (b) => b.say(`It's ${istTime()} for him (IST).`)],
  ['footer', 3, (c) => c.section === 'footer' || c.depth >= 97, async (b) => { await b.emote('bounce'); await b.say("Last layer. Thanks for reading!"); }],

  // ---- words (tricks) ----
  ...TRICKS.map((t) => [`trick-${t}`, t === 'swap' ? 4 : 2, null, (b) => b.trick(t)]),

  // ---- little scenes ----
  ['scene-sneeze', 1, null, async (b) => { await b.emote('sneeze'); await b.say('Excuse me. Gradient dust.'); }],
  ['scene-hiccup', 1, null, async (b) => { await b.emote('hiccup'); await b.say('Hic! Too many tokens.'); }],
  ['scene-stretch', 1, null, async (b) => { await b.emote('stretch'); await b.say('Stretching my receptive field.'); }],
  ['scene-dance', 1, (c) => c.tau > 0.5, async (b) => { b.fx('♪ ♫'); await b.emote('dance'); }],
  ['scene-drum', 1, null, async (b) => { await b.emote('drum'); await b.say('Ba-dum tss.'); }],
  ['scene-heart', 1, null, async (b) => { b.fx('♥'); await b.emote('shy'); }],
  ['scene-sparkle', 1, null, async (b) => { b.fx('✦ ✧ ✦'); await b.emote('glow'); }],
  ['scene-idea', 1, null, async (b) => { await b.emote('think'); b.fx('💡'); await b.say('New idea: more neurons.'); }],
  ['scene-coffee', 1, (c) => c.hour < 11, async (b) => { b.fx('☕'); await b.say('Morning batch needs coffee.'); }],
  ['scene-tired', 1, (c) => c.hour >= 22, async (b) => { await b.emote('yawn'); await b.say('Five more epochs…'); }],
  ['scene-zoom', 1, null, async (b) => { await b.emote('zoom'); await b.say('Zoom! Fastest neuron on the page.'); }],
  ['scene-pancake', 1, null, async (b) => { await b.emote('pancake'); await b.say('Oof. Heavy heading.'); }],
  ['scene-peek', 1, null, (b) => b.emote('peek')],
  ['scene-wink', 1, null, async (b) => { await b.emote('wink'); await b.say("You're doing great."); }],
  ['scene-surprise', 1, null, async (b) => { await b.emote('surprise'); await b.say('Oh! A visitor!'); }],
  ['scene-moon', 1, (c) => !c.small, async (b) => { await b.emote('moonwalk'); await b.say('Smooth.'); }],
  ['scene-flips', 1, (c) => c.tau > 0.5, async (b) => { await b.emote('backflip'); await b.emote('frontflip'); }],
  ['scene-grow', 1, null, async (b) => { await b.emote('grow'); await b.say('Scaling laws!'); }],
  ['scene-float', 1, null, async (b) => { await b.emote('float'); await b.say('Weightless. Like a pruned model.'); }],
  ['scene-wiggle', 1, null, (b) => b.emote('wiggle')],
  ['scene-hop-around', 1, null, async (b) => { await b.hopNear(); }],
  ['scene-chameleon', 2, null, async (b) => { const keep = b.hueNow(); for (const h of b.hues.filter((x) => x !== keep).sort(() => Math.random() - 0.5).slice(0, 3)) { b.hue(h); await b.wait(420); } b.hue(keep); await b.say('Chameleon mode. Back to my colour.'); }],
  ['tip-colour', 1, (c) => c.mins > 1, (b) => b.say('Click me → "Change colour" to repaint me.')],
];
// the console nudge only when it is on the page
const b0 = () => !!document.querySelector('.rsa');

export const ACTS = DEF.map(([id, w, when, run]) => ({ id, w, when, run }));

export const REACT = {
  copy: (b) => b.say(pick(['Copied! Good taste.', 'Ctrl C detected. Nice pick.', 'Saved to your clipboard.']), { force: true }),
  select: (b, c, d) => b.say(`${d.words} word${d.words === 1 ? '' : 's'} selected ≈ ${d.tokens} token${d.tokens === 1 ? '' : 's'}`, { force: true }),
  return: async (b) => { await b.emote('wave'); await b.say('Welcome back!', { force: true }); },
  fling: (b) => b.say(pick(['Wheee!', 'Fast scroller!', 'Hold on tight!']), { force: true, ms: 1400 }),
  themeHot: async (b) => { await b.emote('glow'); await b.say('τ 0.9! Feeling creative.', { force: true }); },
  themeCold: async (b) => { await b.emote('shiver'); await b.say('Brr. τ 0.2.', { force: true }); },
  themeAuto: (b) => b.say('Back to your system theme.', { force: true }),
  lensOn: async (b) => { await b.emote('surprise'); await b.say('Glasses on. Hover a word!', { force: true }); },
  lensOff: (b) => b.say('Glasses off.', { force: true, ms: 1400 }),
  palette: (b) => b.say('Searching? I can wait.', { force: true }),
  ask: (b) => b.say('Ask anything about Sahaj.', { force: true }),
  rsaResult: async (b, c, d) => { await b.emote('cheer'); await b.say(d?.top ? `${short(String(d.top), 34)} came first!` : 'Nice one!', { force: true }); },
  dbl: async (b) => { await b.emote('dizzy'); await b.say('Again!', { force: true }); },
  poked: async (b) => { await b.emote('shake'); await b.say('Ouch. Okay, okay.', { force: true }); },
  hover: (b) => b.say(pick(['Hi! Click me.', 'Psst. I have a menu.', 'Boop?']), { force: true, ms: 1800 }),
  secret: async (b) => { b.fx('✦ ✧ ✦'); await b.emote('dance'); await b.say('You typed my name. You found me.', { force: true }); },
  resize: (b) => b.say('Stretchy!', { force: true, ms: 1300 }),
  wake: (b) => b.say(pick(["I'm awake! I'm awake.", 'Did I miss anything?', 'Mm? Oh, hi.']), { force: true }),
  bottom: async (b) => { await b.emote('cheer'); await b.say('You reached the end. Respect.', { force: true }); },
  offline: (b) => b.say("You're offline. I still work: I'm all local.", { force: true }),
  online: (b) => b.say('Back online.', { force: true, ms: 1500 }),
};
