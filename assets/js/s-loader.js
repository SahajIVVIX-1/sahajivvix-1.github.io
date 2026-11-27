// Sahaj's leaf-S logo as a loading animation (from his s-loader kit). Imported on demand by assets/js/loading.js,
// the chat and the console; only the looping variants are used on this site, never the "fill" progress one.
/*!
 * <s-loader> — animated loading indicator for the leaf "S" logo
 * --------------------------------------------------------------
 * One dependency-free Web Component, 10 animation variants, and
 * light/dark themes that cross-fade smoothly. Switching the theme
 * never restarts an animation: only colours change.
 *
 *   <script src="s-loader.js"></script>
 *   <s-loader variant="draw"></s-loader>
 *
 * Attributes
 *   variant   draw | sprout | orbit | pulse | sway | fill | flip | assemble | shimmer | trace   (default: draw)
 *   theme     auto | light | dark   (auto = nearest [data-theme] ancestor, else OS setting)
 *   size      number in px          (default: 96)
 *   speed     multiplier, 2 = twice as fast  (default: 1)
 *   badge     "false" hides the round background disc (logo on transparent)
 *   progress  0–100, only for variant="fill": turns it into a determinate progress loader
 *   label     accessible label      (default: "Loading")
 *
 * JS API
 *   el.progress = 42;        // same as the attribute
 *   SLoader.variants         // list of variant names
 */
(function () {
  'use strict';

  var VARIANTS = ['draw', 'sprout', 'orbit', 'pulse', 'sway', 'fill', 'flip', 'assemble', 'shimmer', 'trace'];

  /* ---------- Logo geometry (viewBox 0 0 512 512) ---------- */
  var P = {
    top:   'M368 172C356 108 312 80 258 80C186 80 142 124 142 178C142 228 182 252 232 262',
    top2:  'M350 178C340 126 306 104 258 104C206 104 168 134 168 178C168 214 194 236 232 248',
    bot:   'M232 262C305 280 368 300 368 352C368 392 352 414 326 424',
    bot2:  'M250 272C310 292 350 314 350 354C350 384 336 400 316 408',
    curl:  'M326 424C292 442 250 434 238 406C228 380 250 358 276 360C300 362 310 382 298 396',
    stem:  'M232 262C216 248 214 228 226 210',
    // green leaf (base 226,210 → tip 382,66)
    lgA:   'M226 210C224 128 296 76 382 66Q300 136 226 210Z',
    lgB:   'M226 210Q300 136 382 66C378 150 316 206 226 210Z',
    lgV:   'M236 200Q300 136 372 76',
    // large gold leaf (base 262,432 → tip 112,316)
    goA:   'M262 432C160 436 108 390 112 316Q188 362 262 432Z',
    goB:   'M262 432Q188 362 112 316C200 312 258 360 262 432Z',
    goV:   'M254 424Q188 362 122 324',
    // small gold leaf (base 310,328 → tip 186,320)
    smA:   'M310 328C270 296 216 298 186 320Q248 326 310 328Z',
    smB:   'M310 328Q248 326 186 320C222 346 280 350 310 328Z'
  };
  // one continuous centre-line through the whole S (used by "trace")
  P.trace = P.top + P.bot.replace('M232 262', '') + P.curl.replace('M326 424', '');

  function logo(extraClass) {
    return '' +
      '<g class="sl-logo ' + (extraClass || '') + '">' +
        '<g class="sl-p sl-p-lgold"><path class="sl-f sl-go-a" d="' + P.goA + '"/><path class="sl-f sl-go-b" d="' + P.goB + '"/><path class="sl-v" d="' + P.goV + '"/></g>' +
        '<g class="sl-p sl-p-lsmall"><path class="sl-f sl-go-a" d="' + P.smA + '"/><path class="sl-f sl-go-b" d="' + P.smB + '"/></g>' +
        '<g class="sl-p sl-p-top"><path class="sl-s sl-s-top" pathLength="1" d="' + P.top + '"/><path class="sl-s sl-s-top2" pathLength="1" d="' + P.top2 + '"/></g>' +
        '<g class="sl-p sl-p-bot"><path class="sl-s sl-s-bot" pathLength="1" d="' + P.bot + '"/><path class="sl-s sl-s-bot2" pathLength="1" d="' + P.bot2 + '"/></g>' +
        '<g class="sl-p sl-p-curl"><path class="sl-s sl-s-curl" pathLength="1" d="' + P.curl + '"/></g>' +
        '<g class="sl-p sl-p-lg"><path class="sl-s sl-s-stem" pathLength="1" d="' + P.stem + '"/><path class="sl-f sl-lg-a" d="' + P.lgA + '"/><path class="sl-f sl-lg-b" d="' + P.lgB + '"/><path class="sl-v" d="' + P.lgV + '"/></g>' +
      '</g>';
  }

  function svg(variant, uid, badge) {
    var defs = '', before = '', after = '', body;

    if (variant === 'fill') {
      defs += '<clipPath id="' + uid + '-fill"><path class="sl-fillclip" d="M-512 40Q-448 0-384 40T-256 40-128 40 0 40 128 40 256 40 384 40 512 40 640 40 768 40 896 40V1400H-512Z"/></clipPath>';
      body = logo('sl-ghost') + '<g class="sl-filled" clip-path="url(#' + uid + '-fill)">' + logo() + '</g>';
    } else {
      body = logo();
    }
    if (variant === 'orbit') {
      after += '<circle class="sl-orb sl-orb-o" cx="256" cy="256" r="244" pathLength="1"/><circle class="sl-orb sl-orb-i" cx="256" cy="256" r="228" pathLength="1"/>';
    }
    if (variant === 'pulse') {
      before += '<circle class="sl-ripple sl-ripple-a" cx="256" cy="256" r="244"/><circle class="sl-ripple sl-ripple-b" cx="256" cy="256" r="244"/>';
    }
    if (variant === 'shimmer') {
      defs += '<clipPath id="' + uid + '-disc"><circle cx="256" cy="256" r="247"/></clipPath>' +
              '<linearGradient id="' + uid + '-shine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" class="sl-stop" stop-opacity="0"/><stop offset=".5" class="sl-stop" stop-opacity=".85"/><stop offset="1" class="sl-stop" stop-opacity="0"/></linearGradient>';
      after += '<g clip-path="url(#' + uid + '-disc)"><g transform="rotate(22 256 256)"><rect class="sl-shine" x="-260" y="-160" width="170" height="832" fill="url(#' + uid + '-shine)"/></g></g>';
    }
    if (variant === 'trace') {
      after += '<g class="sl-comets"><path class="sl-comet sl-comet-glow" pathLength="1" d="' + P.trace + '"/><path class="sl-comet sl-comet-core" pathLength="1" d="' + P.trace + '"/></g>';
    }

    return '' +
      '<svg class="sl-svg" viewBox="-40 -40 592 592" aria-hidden="true" focusable="false">' +
        '<defs>' + defs + '</defs>' +
        before +
        '<g class="sl-badge">' +
          (badge ? '<circle class="sl-bg" cx="256" cy="256" r="250"/>' : '') +
          '<circle class="sl-ring sl-ring-o" cx="256" cy="256" r="244" pathLength="1"/>' +
          '<circle class="sl-ring sl-ring-i" cx="256" cy="256" r="228" pathLength="1"/>' +
          body +
        '</g>' +
        after +
      '</svg>';
  }

  /* ---------- Styles (injected once) ---------- */
  var CSS = `
s-loader{display:inline-block;line-height:0;vertical-align:middle}
.sl{
  /* light palette */
  --sl-bg:#FFFDF6; --sl-ring-o:#D49A4E; --sl-ring-i:#87A47F;
  --sl-rust:#C36F47; --sl-rust-d:#B05A32; --sl-green:#8FAA82; --sl-stem:#87A47F;
  --sl-leaf-a:#A8C2A0; --sl-leaf-b:#87A383; --sl-gold-a:#E2B87A; --sl-gold-b:#D49A4E; --sl-curl:#D49A4E;
  --sl-vein:rgba(255,253,246,.75); --sl-shine:#FFFFFF; --sl-comet:#D49A4E;
  --sl-speed:1; --sl-dur:2.4s; --D:calc(var(--sl-dur) / var(--sl-speed));
  position:relative;display:inline-block;width:96px;height:96px;perspective:700px;
}
.sl[data-sl-theme=dark]{
  --sl-bg:#0E0E0C; --sl-ring-o:#E39B45; --sl-ring-i:#7FC24F;
  --sl-rust:#E0652E; --sl-rust-d:#B7491F; --sl-green:#79B44A; --sl-stem:#7FC24F;
  --sl-leaf-a:#9BD268; --sl-leaf-b:#78B84A; --sl-gold-a:#F6C677; --sl-gold-b:#EDA94E; --sl-curl:#EDA94E;
  --sl-vein:rgba(14,14,12,.55); --sl-shine:#FFF3D6; --sl-comet:#F6C677;
}
@media (prefers-color-scheme:dark){
  .sl[data-sl-theme=auto]{
    --sl-bg:#0E0E0C; --sl-ring-o:#E39B45; --sl-ring-i:#7FC24F;
    --sl-rust:#E0652E; --sl-rust-d:#B7491F; --sl-green:#79B44A; --sl-stem:#7FC24F;
    --sl-leaf-a:#9BD268; --sl-leaf-b:#78B84A; --sl-gold-a:#F6C677; --sl-gold-b:#EDA94E; --sl-curl:#EDA94E;
    --sl-vein:rgba(14,14,12,.55); --sl-shine:#FFF3D6; --sl-comet:#F6C677;
  }
}
[data-theme=dark] .sl[data-sl-theme=auto]{
  --sl-bg:#0E0E0C; --sl-ring-o:#E39B45; --sl-ring-i:#7FC24F;
  --sl-rust:#E0652E; --sl-rust-d:#B7491F; --sl-green:#79B44A; --sl-stem:#7FC24F;
  --sl-leaf-a:#9BD268; --sl-leaf-b:#78B84A; --sl-gold-a:#F6C677; --sl-gold-b:#EDA94E; --sl-curl:#EDA94E;
  --sl-vein:rgba(14,14,12,.55); --sl-shine:#FFF3D6; --sl-comet:#F6C677;
}
[data-theme=light] .sl[data-sl-theme=auto]{
  --sl-bg:#FFFDF6; --sl-ring-o:#D49A4E; --sl-ring-i:#87A47F;
  --sl-rust:#C36F47; --sl-rust-d:#B05A32; --sl-green:#8FAA82; --sl-stem:#87A47F;
  --sl-leaf-a:#A8C2A0; --sl-leaf-b:#87A383; --sl-gold-a:#E2B87A; --sl-gold-b:#D49A4E; --sl-curl:#D49A4E;
  --sl-vein:rgba(255,253,246,.75); --sl-shine:#FFFFFF; --sl-comet:#D49A4E;
}
.sl-svg{width:100%;height:100%;overflow:visible;display:block}
.sl-svg *{transform-box:view-box;transform-origin:256px 256px}

/* paint — colours cross-fade when the theme changes */
.sl-bg,.sl-ring,.sl-s,.sl-f,.sl-v,.sl-orb,.sl-ripple,.sl-comet,.sl-stop{transition:fill .6s ease,stroke .6s ease,stop-color .6s ease}
.sl-bg{fill:var(--sl-bg)}
.sl-ring{fill:none}
.sl-ring-o{stroke:var(--sl-ring-o);stroke-width:6}
.sl-ring-i{stroke:var(--sl-ring-i);stroke-width:5}
.sl-s{fill:none;stroke-linecap:round;stroke-linejoin:round}
.sl-s-top{stroke:var(--sl-rust);stroke-width:56}
.sl-s-top2{stroke:var(--sl-rust-d);stroke-width:14}
.sl-s-bot{stroke:var(--sl-green);stroke-width:50}
.sl-s-bot2{stroke:var(--sl-rust-d);stroke-width:12}
.sl-s-curl{stroke:var(--sl-curl);stroke-width:8}
.sl-s-stem{stroke:var(--sl-stem);stroke-width:9}
.sl-lg-a{fill:var(--sl-leaf-a)} .sl-lg-b{fill:var(--sl-leaf-b)}
.sl-go-a{fill:var(--sl-gold-a)} .sl-go-b{fill:var(--sl-gold-b)}
.sl-v{fill:none;stroke:var(--sl-vein);stroke-width:3;stroke-linecap:round}
.sl-p-lg{transform-origin:226px 210px}
.sl-p-lgold{transform-origin:262px 432px}
.sl-p-lsmall{transform-origin:310px 328px}
.sl-p-curl{transform-origin:326px 424px}

/* shared */
.sl-svg *,.sl-svg{animation-duration:var(--D);animation-iteration-count:infinite;animation-fill-mode:both}

/* 1 ─ DRAW: strokes write the S, leaves pop out, then it all un-writes */
.sl[data-v=draw]{--sl-dur:3.2s}
.sl[data-v=draw] .sl-s,.sl[data-v=draw] .sl-ring{stroke-dasharray:1 1;animation-name:sl-draw;animation-timing-function:cubic-bezier(.65,0,.35,1)}
.sl[data-v=draw] .sl-ring-i{animation-delay:calc(var(--D) * .03)}
.sl[data-v=draw] .sl-s-top2{animation-delay:calc(var(--D) * .05)}
.sl[data-v=draw] .sl-s-bot{animation-delay:calc(var(--D) * .10)}
.sl[data-v=draw] .sl-s-bot2{animation-delay:calc(var(--D) * .14)}
.sl[data-v=draw] .sl-s-curl{animation-delay:calc(var(--D) * .18)}
.sl[data-v=draw] .sl-s-stem{animation-delay:calc(var(--D) * .02)}
.sl[data-v=draw] .sl-p-lg{animation-name:sl-pop;animation-delay:calc(var(--D) * .04)}
.sl[data-v=draw] .sl-p-lsmall{animation-name:sl-pop;animation-delay:calc(var(--D) * .12)}
.sl[data-v=draw] .sl-p-lgold{animation-name:sl-pop;animation-delay:calc(var(--D) * .17)}
@keyframes sl-draw{0%{stroke-dashoffset:1}45%,78%{stroke-dashoffset:0}100%{stroke-dashoffset:-1}}
@keyframes sl-pop{0%,30%{transform:scale(0) rotate(-25deg);opacity:0}43%{transform:scale(1.12) rotate(5deg);opacity:1}50%,80%{transform:scale(1) rotate(0);opacity:1}94%,100%{transform:scale(0) rotate(15deg);opacity:0}}

/* 2 ─ SPROUT: leaves grow from their stems one by one, the S soaks up colour */
.sl[data-v=sprout]{--sl-dur:3.4s}
.sl[data-v=sprout] .sl-p-top,.sl[data-v=sprout] .sl-p-bot,.sl[data-v=sprout] .sl-p-curl{animation-name:sl-soak;animation-timing-function:ease-in-out}
.sl[data-v=sprout] .sl-p-lg,.sl[data-v=sprout] .sl-p-lsmall,.sl[data-v=sprout] .sl-p-lgold{animation-name:sl-grow;animation-timing-function:cubic-bezier(.34,1.3,.64,1)}
.sl[data-v=sprout] .sl-p-lsmall{animation-delay:calc(var(--D) * .08)}
.sl[data-v=sprout] .sl-p-lgold{animation-delay:calc(var(--D) * .16)}
@keyframes sl-soak{0%,100%{opacity:.3}35%,80%{opacity:1}}
@keyframes sl-grow{0%,6%{transform:scale(0) rotate(-40deg);opacity:0}32%{transform:scale(1) rotate(0);opacity:1}48%{transform:rotate(-5deg)}62%{transform:rotate(4deg)}76%{transform:scale(1) rotate(0);opacity:1}94%,100%{transform:scale(0) rotate(20deg);opacity:0}}

/* 3 ─ ORBIT: the two rings become spinners chasing in opposite directions */
.sl[data-v=orbit]{--sl-dur:1.8s}
.sl[data-v=orbit] .sl-ring{opacity:.22}
.sl[data-v=orbit] .sl-orb{fill:none;stroke-linecap:round}
.sl[data-v=orbit] .sl-orb-o{stroke:var(--sl-ring-o);stroke-width:12;animation:sl-spin var(--D) linear infinite,sl-arc calc(var(--D) * 1.5) ease-in-out infinite}
.sl[data-v=orbit] .sl-orb-i{stroke:var(--sl-ring-i);stroke-width:10;animation:sl-spin-r calc(var(--D) * 1.4) linear infinite,sl-arc calc(var(--D) * 1.5) ease-in-out infinite reverse}
.sl[data-v=orbit] .sl-logo{animation-name:sl-breathe;animation-timing-function:ease-in-out;animation-duration:calc(var(--D) * 1.5)}
@keyframes sl-spin{to{transform:rotate(360deg)}}
@keyframes sl-spin-r{from{transform:rotate(0)}to{transform:rotate(-360deg)}}
@keyframes sl-arc{0%,100%{stroke-dasharray:.04 .96}50%{stroke-dasharray:.38 .62}}
@keyframes sl-breathe{0%,100%{transform:scale(1)}50%{transform:scale(.94)}}

/* 4 ─ PULSE: the badge beats like a heart and sends rings outward */
.sl[data-v=pulse]{--sl-dur:2s}
.sl[data-v=pulse] .sl-badge{animation-name:sl-beat;animation-timing-function:ease-in-out}
.sl[data-v=pulse] .sl-ripple{fill:none;stroke-width:5;animation-name:sl-ripple;animation-timing-function:cubic-bezier(.2,.6,.35,1)}
.sl[data-v=pulse] .sl-ripple-a{stroke:var(--sl-ring-o)}
.sl[data-v=pulse] .sl-ripple-b{stroke:var(--sl-ring-i);animation-delay:calc(var(--D) * .5)}
@keyframes sl-beat{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(.99)}42%{transform:scale(1.04)}60%{transform:scale(1)}}
@keyframes sl-ripple{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.16);opacity:0}}

/* 5 ─ SWAY: the leaves move in a breeze, the S floats */
.sl[data-v=sway]{--sl-dur:2.8s}
.sl[data-v=sway] .sl-p-lg{animation-name:sl-sway-a;animation-timing-function:ease-in-out}
.sl[data-v=sway] .sl-p-lgold{animation-name:sl-sway-b;animation-timing-function:ease-in-out;animation-delay:calc(var(--D) * -.3)}
.sl[data-v=sway] .sl-p-lsmall{animation-name:sl-sway-a;animation-timing-function:ease-in-out;animation-delay:calc(var(--D) * -.55)}
.sl[data-v=sway] .sl-p-curl{animation-name:sl-sway-c;animation-timing-function:ease-in-out;animation-delay:calc(var(--D) * -.2)}
.sl[data-v=sway] .sl-logo{animation-name:sl-float;animation-timing-function:ease-in-out}
@keyframes sl-sway-a{0%,100%{transform:rotate(-9deg)}50%{transform:rotate(9deg)}}
@keyframes sl-sway-b{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-7deg)}}
@keyframes sl-sway-c{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes sl-float{0%,100%{transform:translateY(5px)}50%{transform:translateY(-5px)}}

/* 6 ─ FILL: colour rises like liquid through a faded logo (supports progress=) */
.sl[data-v=fill]{--sl-dur:2.8s}
.sl[data-v=fill] .sl-ghost{opacity:.16;filter:saturate(.3)}
.sl[data-v=fill] .sl-ring{opacity:.5}
/* clipPath children can't be <g>, so the wave uses translate while the rise uses transform */
.sl[data-v=fill] .sl-fillclip{animation:sl-rise var(--D) cubic-bezier(.45,.05,.4,1) infinite both,sl-wave calc(var(--D) * .45) linear infinite}
.sl[data-v=fill] .sl-filled{animation-name:sl-fade-out;animation-timing-function:linear}
.sl[data-v=fill][data-det] .sl-fillclip{animation:sl-wave calc(var(--D) * .45) linear infinite;transform:translateY(var(--sl-fy,520px));transition:transform .45s cubic-bezier(.3,.7,.3,1)}
.sl[data-v=fill][data-det] .sl-filled{animation:none;opacity:1}
.sl[data-v=fill][data-det] .sl-ring{opacity:1}
@keyframes sl-rise{0%{transform:translateY(520px)}72%,100%{transform:translateY(-80px)}}
@keyframes sl-fade-out{0%,86%{opacity:1}100%{opacity:0}}
@keyframes sl-wave{from{translate:0 0}to{translate:-256px 0}}

/* 7 ─ FLIP: coin-flip of the whole badge, the logo settles with a bounce */
.sl[data-v=flip]{--sl-dur:2.4s}
.sl[data-v=flip] .sl-svg{animation-name:sl-flip;transform-origin:50% 50%}
.sl[data-v=flip] .sl-logo{animation-name:sl-land}
@keyframes sl-flip{0%{transform:rotateY(0);animation-timing-function:cubic-bezier(.55,0,1,.45)}22%{transform:rotateY(90deg)}22.01%{transform:rotateY(-90deg);animation-timing-function:cubic-bezier(0,.55,.45,1)}44%,100%{transform:rotateY(0)}}
@keyframes sl-land{0%,40%{transform:scale(1)}50%{transform:scale(.88)}60%{transform:scale(1.05)}70%,100%{transform:scale(1)}}

/* 8 ─ ASSEMBLE: every piece flies in, locks together, then scatters */
.sl[data-v=assemble]{--sl-dur:3.4s}
.sl[data-v=assemble] .sl-p{animation-name:sl-asm;animation-timing-function:cubic-bezier(.5,0,.25,1)}
.sl[data-v=assemble] .sl-ring{stroke-dasharray:1 1;animation-name:sl-draw;animation-timing-function:cubic-bezier(.65,0,.35,1)}
.sl[data-v=assemble] .sl-p-top{--dx:-130px;--dy:-150px;--r:-45deg}
.sl[data-v=assemble] .sl-p-bot{--dx:150px;--dy:130px;--r:40deg;animation-delay:calc(var(--D) * .03)}
.sl[data-v=assemble] .sl-p-curl{--dx:60px;--dy:170px;--r:90deg;animation-delay:calc(var(--D) * .06)}
.sl[data-v=assemble] .sl-p-lg{--dx:170px;--dy:-170px;--r:70deg;animation-delay:calc(var(--D) * .09)}
.sl[data-v=assemble] .sl-p-lgold{--dx:-180px;--dy:130px;--r:-70deg;animation-delay:calc(var(--D) * .12)}
.sl[data-v=assemble] .sl-p-lsmall{--dx:-170px;--dy:-30px;--r:-100deg;animation-delay:calc(var(--D) * .15)}
@keyframes sl-asm{
  0%{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.5);opacity:0}
  36%,74%{transform:translate(0,0) rotate(0) scale(1);opacity:1}
  100%{transform:translate(calc(var(--dx) * -1),calc(var(--dy) * -1)) rotate(calc(var(--r) * -1)) scale(.5);opacity:0}}

/* 9 ─ SHIMMER: a polished glint sweeps across the badge */
.sl[data-v=shimmer]{--sl-dur:2.4s}
.sl[data-v=shimmer] .sl-stop{stop-color:var(--sl-shine)}
.sl[data-v=shimmer] .sl-shine{animation-name:sl-sweep;animation-timing-function:cubic-bezier(.5,0,.3,1);mix-blend-mode:soft-light}
.sl[data-v=shimmer] .sl-logo{animation-name:sl-glint;animation-timing-function:ease-in-out}
.sl[data-v=shimmer] .sl-ring-o{animation-name:sl-ring-glow;animation-timing-function:ease-in-out}
@keyframes sl-sweep{0%{transform:translateX(0)}55%,100%{transform:translateX(900px)}}
@keyframes sl-glint{0%,10%,60%,100%{transform:scale(1)}32%{transform:scale(1.035)}}
@keyframes sl-ring-glow{0%,100%{stroke-width:6}30%{stroke-width:10}}

/* 10 ─ TRACE: a glowing comet keeps tracing the S over a faded logo */
.sl[data-v=trace]{--sl-dur:2.2s}
.sl[data-v=trace] .sl-p-top,.sl[data-v=trace] .sl-p-bot,.sl[data-v=trace] .sl-p-curl{opacity:.28}
.sl[data-v=trace] .sl-p-lg,.sl[data-v=trace] .sl-p-lgold,.sl[data-v=trace] .sl-p-lsmall{animation-name:sl-glow-leaf;animation-timing-function:ease-in-out}
.sl[data-v=trace] .sl-p-lsmall{animation-delay:calc(var(--D) * .55)}
.sl[data-v=trace] .sl-p-lgold{animation-delay:calc(var(--D) * .7)}
.sl[data-v=trace] .sl-comet{fill:none;stroke:var(--sl-comet);stroke-linecap:round;stroke-linejoin:round;animation-name:sl-run;animation-timing-function:linear}
.sl[data-v=trace] .sl-comet-core{stroke-width:16;stroke-dasharray:.16 .84}
.sl[data-v=trace] .sl-comet-glow{stroke-width:36;opacity:.28;stroke-dasharray:.24 .76;animation-delay:calc(var(--D) * .02)}
@keyframes sl-run{from{stroke-dashoffset:.2}to{stroke-dashoffset:-.8}}
@keyframes sl-glow-leaf{0%,100%{opacity:.45;transform:scale(.94)}20%{opacity:1;transform:scale(1.04)}45%{opacity:.7;transform:scale(1)}}

/* accessibility: honour reduced-motion with a calm fade only */
@media (prefers-reduced-motion:reduce){
  .sl .sl-svg,.sl .sl-svg *{animation:none!important}
  .sl .sl-badge{animation:sl-calm 2s ease-in-out infinite!important}
  .sl[data-v=fill] .sl-fillclip{transform:translateY(-80px)}
  .sl[data-v=fill][data-det] .sl-fillclip{transform:translateY(var(--sl-fy,520px))}
}
@keyframes sl-calm{0%,100%{opacity:1}50%{opacity:.55}}
`;

  function injectStyles() {
    if (document.getElementById('s-loader-styles')) return;
    var s = document.createElement('style');
    s.id = 's-loader-styles';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var count = 0;

  class SLoader extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size', 'speed', 'theme', 'progress', 'badge', 'label']; }

    connectedCallback() { injectStyles(); this._render(); }

    attributeChangedCallback(name) {
      if (!this._root) return;
      if (name === 'variant' || name === 'badge') this._render();
      else this._update();
    }

    get variant() { var v = this.getAttribute('variant'); return VARIANTS.indexOf(v) > -1 ? v : 'draw'; }
    set variant(v) { this.setAttribute('variant', v); }
    get progress() { var p = this.getAttribute('progress'); return p === null || p === '' ? null : Math.max(0, Math.min(100, +p)); }
    set progress(v) { if (v === null || v === undefined) this.removeAttribute('progress'); else this.setAttribute('progress', v); }

    _render() {
      var uid = 'sl' + (++count);
      var badge = this.getAttribute('badge') !== 'false';
      this.innerHTML = '<div class="sl">' + svg(this.variant, uid, badge) + '</div>';
      this._root = this.firstElementChild;
      this._update();
    }

    _update() {
      var r = this._root;
      var size = parseFloat(this.getAttribute('size')) || 96;
      var speed = parseFloat(this.getAttribute('speed')) || 1;
      var theme = this.getAttribute('theme');
      r.dataset.v = this.variant;
      r.dataset.slTheme = theme === 'light' || theme === 'dark' ? theme : 'auto';
      r.style.width = r.style.height = size + 'px';
      r.style.setProperty('--sl-speed', speed);

      var p = this.progress;
      this.setAttribute('role', 'progressbar');
      this.setAttribute('aria-label', this.getAttribute('label') || 'Loading');
      this.setAttribute('aria-busy', 'true');
      if (p !== null && this.variant === 'fill') {
        r.dataset.det = '';
        // 0% → clip sits below the logo (520), 100% → fully above it (-80)
        r.style.setProperty('--sl-fy', (520 - p * 6) + 'px');
        this.setAttribute('aria-valuemin', '0');
        this.setAttribute('aria-valuemax', '100');
        this.setAttribute('aria-valuenow', String(Math.round(p)));
      } else {
        delete r.dataset.det;
        this.removeAttribute('aria-valuenow');
        this.removeAttribute('aria-valuemin');
        this.removeAttribute('aria-valuemax');
      }
    }
  }

  SLoader.variants = VARIANTS.slice();
  if (!customElements.get('s-loader')) customElements.define('s-loader', SLoader);
  window.SLoader = SLoader;
})();
