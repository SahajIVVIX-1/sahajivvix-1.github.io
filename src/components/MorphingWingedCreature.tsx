import React, { useEffect, useRef } from 'react';
import { ButterflyPalette } from '../config/butterflyPalettes';

export interface MorphingWingedCreatureProps {
  readonly palette: ButterflyPalette;
  readonly className?: string;
  readonly seed?: number;
  readonly instanceId?: string;
}

function parseHex(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * MorphingWingedCreature
 * Ethereal, living winged entity whose wings continuously morph and whose colors
 * slowly, smoothly, and organically transition over 2.4 seconds across palette shifts.
 * - Dynamic SVG path synthesis running on requestAnimationFrame.
 * - Frame-by-frame color interpolation of SVG gradient stops for ultra-smooth hue transitions.
 * - Multi-tiered wing anatomy:
 *   * Primary Morphing Wings (4 fanning, undulating feather plumes per side with randomized span & curvature)
 *   * Secondary Under-Wings (counter-phased fluttering lower wing vanes)
 *   * Inner Wing Core (radiant, breathing luminescent inner plumage with glowing veins)
 *   * Trailing Fluid Ribbons (three snaking silk streamers following harmonic fluid wave dynamics)
 *   * Sleek Aerodynamic Body with beating bioluminescent nucleus and trailing antenna wisps
 *   * Orbiting Stardust Spores
 */
export const MorphingWingedCreature: React.FC<MorphingWingedCreatureProps> = ({
  palette,
  className = '',
  seed = 0,
  instanceId = 'creature',
}) => {
  // SVG root ref for scoped color queries
  const svgRef = useRef<SVGSVGElement>(null);

  // Path refs for zero-overhead shape morphing
  const leftWingRef = useRef<SVGPathElement>(null);
  const rightWingRef = useRef<SVGPathElement>(null);
  const leftInnerWingRef = useRef<SVGPathElement>(null);
  const rightInnerWingRef = useRef<SVGPathElement>(null);
  const leftLowerWingRef = useRef<SVGPathElement>(null);
  const rightLowerWingRef = useRef<SVGPathElement>(null);
  const ribbonCenterRef = useRef<SVGPathElement>(null);
  const ribbonLeftRef = useRef<SVGPathElement>(null);
  const ribbonRightRef = useRef<SVGPathElement>(null);
  const veinLeft1Ref = useRef<SVGPathElement>(null);
  const veinLeft2Ref = useRef<SVGPathElement>(null);
  const veinRight1Ref = useRef<SVGPathElement>(null);
  const veinRight2Ref = useRef<SVGPathElement>(null);
  const wispLeftRef = useRef<SVGPathElement>(null);
  const wispRightRef = useRef<SVGPathElement>(null);

  // Smooth color interpolation state
  const prevPaletteRef = useRef<ButterflyPalette>(palette);
  const targetPaletteRef = useRef<ButterflyPalette>(palette);
  const currentPaletteRef = useRef<ButterflyPalette>(palette);
  const colorTransitionStartRef = useRef<number>(0);
  const isColorTransitioningRef = useRef<boolean>(false);

  // Respond to palette prop change: initiate slow, smooth 2.4s color morph
  useEffect(() => {
    if (palette.name !== targetPaletteRef.current.name) {
      prevPaletteRef.current = { ...currentPaletteRef.current };
      targetPaletteRef.current = palette;
      colorTransitionStartRef.current = performance.now();
      isColorTransitioningRef.current = true;
    }
  }, [palette]);

  useEffect(() => {
    let animId: number;
    const cx = 300;
    const cy = 220;

    const renderFrame = (now: number) => {
      const t = now * 0.001;
      const s = seed;

      // ================================================================
      // 1. Smooth Color Stop Metamorphosis (2.4s Gradual Transition)
      // ================================================================
      if (isColorTransitioningRef.current && svgRef.current) {
        const elapsed = now - colorTransitionStartRef.current;
        const duration = 2400; // 2.4 seconds slow, velvet transition
        const rawProgress = Math.min(elapsed / duration, 1.0);
        const ease = easeInOutCubic(rawProgress);

        const from = prevPaletteRef.current;
        const to = targetPaletteRef.current;

        const cur: ButterflyPalette = {
          name: to.name,
          primaryLight: lerpColor(from.primaryLight, to.primaryLight, ease),
          primaryMid: lerpColor(from.primaryMid, to.primaryMid, ease),
          primaryDeep: lerpColor(from.primaryDeep, to.primaryDeep, ease),
          primaryDark: lerpColor(from.primaryDark, to.primaryDark, ease),
          innerGradStart: lerpColor(from.innerGradStart, to.innerGradStart, ease),
          innerGradMid: lerpColor(from.innerGradMid, to.innerGradMid, ease),
          lowerWingMid: lerpColor(from.lowerWingMid, to.lowerWingMid, ease),
          ribbonLight: lerpColor(from.ribbonLight, to.ribbonLight, ease),
          ribbonMid: lerpColor(from.ribbonMid, to.ribbonMid, ease),
          ribbonDark: lerpColor(from.ribbonDark, to.ribbonDark, ease),
          bodyLight: lerpColor(from.bodyLight, to.bodyLight, ease),
          bodyMid: lerpColor(from.bodyMid, to.bodyMid, ease),
          bodyDark: lerpColor(from.bodyDark, to.bodyDark, ease),
          nucleusRing: lerpColor(from.nucleusRing, to.nucleusRing, ease),
          glowColor: lerpColor(from.glowColor, to.glowColor, ease),
          stardust: lerpColor(from.stardust, to.stardust, ease),
          nucleusGrad: [
            lerpColor(from.nucleusGrad[0], to.nucleusGrad[0], ease),
            lerpColor(from.nucleusGrad[1], to.nucleusGrad[1], ease),
            lerpColor(from.nucleusGrad[2], to.nucleusGrad[2], ease),
          ],
        };
        currentPaletteRef.current = cur;

        // Apply interpolated colors directly to SVG stop elements & accents
        const svg = svgRef.current;
        const setStop = (id: string, color: string) => {
          const el = svg.querySelector(`#${id}`);
          if (el) el.setAttribute('stop-color', color);
        };
        const setAttr = (sel: string, attr: string, val: string) => {
          const el = svg.querySelector(sel);
          if (el) el.setAttribute(attr, val);
        };

        // Ambient glow
        setStop(`${instanceId}-glow-0`, cur.glowColor);
        setStop(`${instanceId}-glow-60`, cur.glowColor);
        setStop(`${instanceId}-glow-100`, cur.glowColor);

        // Wing gradients
        setStop(`${instanceId}-lw-0`, cur.primaryLight);
        setStop(`${instanceId}-lw-35`, cur.primaryMid);
        setStop(`${instanceId}-lw-75`, cur.primaryDeep);
        setStop(`${instanceId}-lw-100`, cur.primaryDark);

        setStop(`${instanceId}-rw-0`, cur.primaryLight);
        setStop(`${instanceId}-rw-35`, cur.primaryMid);
        setStop(`${instanceId}-rw-75`, cur.primaryDeep);
        setStop(`${instanceId}-rw-100`, cur.primaryDark);

        // Inner wing gradients
        setStop(`${instanceId}-lin-0`, cur.innerGradStart);
        setStop(`${instanceId}-lin-45`, cur.innerGradMid);
        setStop(`${instanceId}-lin-85`, cur.primaryLight);
        setStop(`${instanceId}-lin-100`, cur.primaryMid);

        setStop(`${instanceId}-rin-0`, cur.innerGradStart);
        setStop(`${instanceId}-rin-45`, cur.innerGradMid);
        setStop(`${instanceId}-rin-85`, cur.primaryLight);
        setStop(`${instanceId}-rin-100`, cur.primaryMid);

        // Lower wing
        setStop(`${instanceId}-low-0`, cur.primaryLight);
        setStop(`${instanceId}-low-55`, cur.lowerWingMid);
        setStop(`${instanceId}-low-100`, cur.primaryDeep);

        // Ribbons
        setStop(`${instanceId}-rib-0`, cur.ribbonLight);
        setStop(`${instanceId}-rib-40`, cur.ribbonMid);
        setStop(`${instanceId}-rib-80`, cur.primaryDeep);
        setStop(`${instanceId}-rib-100`, cur.ribbonDark);

        // Body
        setStop(`${instanceId}-bod-0`, cur.bodyLight);
        setStop(`${instanceId}-bod-35`, cur.bodyMid);
        setStop(`${instanceId}-bod-70`, cur.primaryMid);
        setStop(`${instanceId}-bod-100`, cur.bodyDark);

        // Nucleus
        setStop(`${instanceId}-nuc-0`, cur.nucleusGrad[0]);
        setStop(`${instanceId}-nuc-40`, cur.nucleusGrad[1]);
        setStop(`${instanceId}-nuc-100`, cur.nucleusGrad[2]);

        // Stardust
        setStop(`${instanceId}-dust-50`, cur.stardust);
        setStop(`${instanceId}-dust-100`, cur.nucleusRing);

        // Accents
        setAttr(`.${instanceId}-wisp`, 'stroke', cur.primaryLight);
        setAttr(`.${instanceId}-vein-accent`, 'stroke', cur.innerGradMid);
        setAttr(`.${instanceId}-crest-outer`, 'fill', cur.bodyLight);
        setAttr(`.${instanceId}-crest-inner`, 'fill', cur.primaryMid);
        setAttr(`.${instanceId}-nuc-ring`, 'fill', cur.nucleusRing);

        if (rawProgress >= 1.0) {
          isColorTransitioningRef.current = false;
        }
      }

      // ================================================================
      // 2. Real-Time Chaotic Wing Morphing
      // ================================================================
      const flap = Math.sin(t * 2.2 + s);
      const flapHarmonic = Math.sin(t * 3.4 + s * 1.5) * 0.4;
      const combinedFlap = flap + flapHarmonic;

      const morphSpan = Math.sin(t * 0.72 + s * 2.3) * 38 + Math.cos(t * 0.35 + s) * 22;
      const morphSweep = Math.cos(t * 0.58 + s * 1.7) * 28 + Math.sin(t * 0.27) * 16;
      const morphArch = Math.sin(t * 0.88 + s * 3.1) * 20;
      const tipRipple = Math.sin(t * 4.2 + s * 2.0) * 10;
      const plumeFlutterA = Math.sin(t * 3.1 + s) * 14;
      const plumeFlutterB = Math.cos(t * 2.7 + s * 1.2) * 12;

      const lowerFlap = Math.sin(t * 2.8 + s + 2.0);
      const lowerMorph = Math.cos(t * 0.82 + s) * 20;

      // Primary Outer Wing
      const buildPrimaryWing = (sign: number) => {
        const rootX = cx + sign * 14;
        const rootY = cy - 14;

        const shoulderCpX = cx + sign * (75 + morphSpan * 0.3);
        const shoulderCpY = cy - 85 + combinedFlap * 26 + morphArch;

        const jointX = cx + sign * (148 + morphSpan * 0.6);
        const jointY = cy - 110 + combinedFlap * 42 + morphSweep * 0.5;

        const tipCpX = cx + sign * (205 + morphSpan * 0.85);
        const tipCpY = cy - 145 + combinedFlap * 58 + morphArch;

        const tipX = cx + sign * (255 + morphSpan + tipRipple);
        const tipY = cy - 115 + combinedFlap * 72 + morphSweep;

        const notch1X = cx + sign * (220 + morphSpan * 0.6);
        const notch1Y = cy - 65 + combinedFlap * 48 + tipRipple * 0.6;

        const plume2X = cx + sign * (232 + morphSpan * 0.7 + plumeFlutterA);
        const plume2Y = cy - 35 + combinedFlap * 38;

        const notch2X = cx + sign * 192;
        const notch2Y = cy - 8 + combinedFlap * 26;

        const plume3X = cx + sign * (198 + plumeFlutterB);
        const plume3Y = cy + 28 + combinedFlap * 18;

        const notch3X = cx + sign * 152;
        const notch3Y = cy + 46 + combinedFlap * 12;

        const plume4X = cx + sign * (135 + Math.sin(t * 2.5 + s) * 8);
        const plume4Y = cy + 62 + combinedFlap * 8;

        const trailingRootX = cx + sign * 18;
        const trailingRootY = cy + 30;

        return (
          `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} ` +
          `C ${shoulderCpX.toFixed(1)} ${shoulderCpY.toFixed(1)}, ${jointX.toFixed(1)} ${jointY.toFixed(1)}, ${tipCpX.toFixed(1)} ${tipCpY.toFixed(1)} ` +
          `Q ${tipX.toFixed(1)} ${tipY.toFixed(1)}, ${notch1X.toFixed(1)} ${notch1Y.toFixed(1)} ` +
          `Q ${plume2X.toFixed(1)} ${plume2Y.toFixed(1)}, ${notch2X.toFixed(1)} ${notch2Y.toFixed(1)} ` +
          `Q ${plume3X.toFixed(1)} ${plume3Y.toFixed(1)}, ${notch3X.toFixed(1)} ${notch3Y.toFixed(1)} ` +
          `Q ${plume4X.toFixed(1)} ${plume4Y.toFixed(1)}, ${(cx + sign * 80).toFixed(1)} ${(cy + 52).toFixed(1)} ` +
          `C ${(cx + sign * 50).toFixed(1)} ${(cy + 46).toFixed(1)}, ${(cx + sign * 30).toFixed(1)} ${(cy + 38).toFixed(1)}, ${trailingRootX.toFixed(1)} ${trailingRootY.toFixed(1)} Z`
        );
      };

      // Inner Wing Core
      const buildInnerWing = (sign: number) => {
        const rootX = cx + sign * 12;
        const rootY = cy - 8;
        const innerSpan = morphSpan * 0.65;
        const innerFlap = combinedFlap * 0.7;

        const shoulderX = cx + sign * 60;
        const shoulderY = cy - 58 + innerFlap * 20;

        const midX = cx + sign * (115 + innerSpan * 0.5);
        const midY = cy - 75 + innerFlap * 32;

        const tipX = cx + sign * (175 + innerSpan + tipRipple * 0.5);
        const tipY = cy - 65 + innerFlap * 48 + morphSweep * 0.6;

        const plumeX = cx + sign * (158 + innerSpan * 0.7 + plumeFlutterA * 0.6);
        const plumeY = cy - 15 + innerFlap * 28;

        const notchX = cx + sign * 125;
        const notchY = cy + 12 + innerFlap * 18;

        const lowerX = cx + sign * 88;
        const lowerY = cy + 34;

        const trailingX = cx + sign * 15;
        const trailingY = cy + 22;

        return (
          `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} ` +
          `C ${shoulderX.toFixed(1)} ${shoulderY.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}, ${tipX.toFixed(1)} ${tipY.toFixed(1)} ` +
          `Q ${plumeX.toFixed(1)} ${plumeY.toFixed(1)}, ${notchX.toFixed(1)} ${notchY.toFixed(1)} ` +
          `Q ${lowerX.toFixed(1)} ${lowerY.toFixed(1)}, ${trailingX.toFixed(1)} ${trailingY.toFixed(1)} Z`
        );
      };

      // Lower Wings
      const buildLowerWing = (sign: number) => {
        const rootX = cx + sign * 16;
        const rootY = cy + 26;

        const midCpX = cx + sign * (75 + lowerMorph * 0.6);
        const midCpY = cy + 65 + lowerFlap * 24;

        const tipX = cx + sign * (145 + lowerMorph + Math.sin(t * 3.5) * 8);
        const tipY = cy + 115 + lowerFlap * 38;

        const innerCpX = cx + sign * 95;
        const innerCpY = cy + 130 + lowerFlap * 20;

        const baseCpX = cx + sign * 40;
        const baseCpY = cy + 95;

        const endX = cx + sign * 12;
        const endY = cy + 56;

        return (
          `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} ` +
          `C ${midCpX.toFixed(1)} ${midCpY.toFixed(1)}, ${(cx + sign * 115).toFixed(1)} ${(cy + 85 + lowerFlap * 30).toFixed(1)}, ${tipX.toFixed(1)} ${tipY.toFixed(1)} ` +
          `C ${innerCpX.toFixed(1)} ${innerCpY.toFixed(1)}, ${baseCpX.toFixed(1)} ${baseCpY.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)} Z`
        );
      };

      // Ribbons
      const buildCenterRibbon = () => {
        const startX = cx;
        const startY = cy + 62;

        const wave1X = cx + Math.sin(t * 2.8 + s) * 22;
        const wave1Y = cy + 130;

        const wave2X = cx + Math.sin(t * 2.8 + s + 1.6) * 36;
        const wave2Y = cy + 195;

        const endX = cx + Math.sin(t * 2.8 + s + 3.2) * 44;
        const endY = cy + 265;

        return (
          `M ${startX.toFixed(1)} ${startY.toFixed(1)} ` +
          `C ${(cx + Math.sin(t * 2.8 + s) * 12).toFixed(1)} ${(cy + 95).toFixed(1)}, ${wave1X.toFixed(1)} ${wave1Y.toFixed(1)}, ${(cx + Math.sin(t * 2.8 + s + 0.8) * 28).toFixed(1)} ${(cy + 160).toFixed(1)} ` +
          `S ${wave2X.toFixed(1)} ${wave2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`
        );
      };

      const buildSideRibbon = (sign: number, phaseOffset: number) => {
        const startX = cx + sign * 10;
        const startY = cy + 58;

        const w1X = cx + sign * 28 + Math.sin(t * 2.4 + s + phaseOffset) * 24;
        const w1Y = cy + 125;

        const w2X = cx + sign * 48 + Math.sin(t * 2.4 + s + phaseOffset + 1.4) * 34;
        const w2Y = cy + 185;

        const endX = cx + sign * 62 + Math.sin(t * 2.4 + s + phaseOffset + 2.8) * 42;
        const endY = cy + 250;

        return (
          `M ${startX.toFixed(1)} ${startY.toFixed(1)} ` +
          `C ${(cx + sign * 18).toFixed(1)} ${(cy + 90).toFixed(1)}, ${w1X.toFixed(1)} ${w1Y.toFixed(1)}, ${(cx + sign * 38).toFixed(1)} ${(cy + 155).toFixed(1)} ` +
          `S ${w2X.toFixed(1)} ${w2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`
        );
      };

      // Wing veins
      const buildWingVein = (sign: number, idx: number) => {
        const rootX = cx + sign * 14;
        const rootY = cy - 4 + idx * 8;
        const targetX =
          idx === 1
            ? cx + sign * (240 + morphSpan * 0.9 + tipRipple * 0.8)
            : cx + sign * (215 + morphSpan * 0.65 + plumeFlutterA * 0.8);
        const targetY =
          idx === 1
            ? cy - 105 + combinedFlap * 66 + morphSweep * 0.9
            : cy - 30 + combinedFlap * 36;
        const cpX = cx + sign * (120 + morphSpan * 0.4);
        const cpY = cy - 70 + combinedFlap * 34;

        return `M ${rootX.toFixed(1)} ${rootY.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${targetX.toFixed(1)} ${targetY.toFixed(1)}`;
      };

      // Antenna Wisps
      const buildWisp = (sign: number) => {
        const startX = cx + sign * 4;
        const startY = cy - 35;
        const cpX = cx + sign * (16 + Math.sin(t * 3.2 + s) * 8);
        const cpY = cy - 65;
        const endX = cx + sign * (32 + Math.sin(t * 2.6 + s + 1.2) * 14);
        const endY = cy - 88;
        return `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${cpX.toFixed(1)} ${cpY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`;
      };

      // Direct GPU Path Updates
      if (leftWingRef.current) leftWingRef.current.setAttribute('d', buildPrimaryWing(-1));
      if (rightWingRef.current) rightWingRef.current.setAttribute('d', buildPrimaryWing(1));
      if (leftInnerWingRef.current) leftInnerWingRef.current.setAttribute('d', buildInnerWing(-1));
      if (rightInnerWingRef.current) rightInnerWingRef.current.setAttribute('d', buildInnerWing(1));
      if (leftLowerWingRef.current) leftLowerWingRef.current.setAttribute('d', buildLowerWing(-1));
      if (rightLowerWingRef.current) rightLowerWingRef.current.setAttribute('d', buildLowerWing(1));

      if (ribbonCenterRef.current) ribbonCenterRef.current.setAttribute('d', buildCenterRibbon());
      if (ribbonLeftRef.current) ribbonLeftRef.current.setAttribute('d', buildSideRibbon(-1, 0.7));
      if (ribbonRightRef.current) ribbonRightRef.current.setAttribute('d', buildSideRibbon(1, -0.7));

      if (veinLeft1Ref.current) veinLeft1Ref.current.setAttribute('d', buildWingVein(-1, 1));
      if (veinLeft2Ref.current) veinLeft2Ref.current.setAttribute('d', buildWingVein(-1, 2));
      if (veinRight1Ref.current) veinRight1Ref.current.setAttribute('d', buildWingVein(1, 1));
      if (veinRight2Ref.current) veinRight2Ref.current.setAttribute('d', buildWingVein(1, 2));

      if (wispLeftRef.current) wispLeftRef.current.setAttribute('d', buildWisp(-1));
      if (wispRightRef.current) wispRightRef.current.setAttribute('d', buildWisp(1));

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [seed, instanceId]);

  const p = palette;
  const prefix = instanceId;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 600 520"
      className={`w-full h-full select-none pointer-events-none morphing-creature ${className}`}
      fill="none"
      shapeRendering="geometricPrecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Ambient atmospheric aura */}
        <radialGradient id={`${prefix}-creature-glow`} cx="50%" cy="45%" r="55%">
          <stop id={`${prefix}-glow-0`} offset="0%" stopColor={p.glowColor} stopOpacity="0.32" />
          <stop id={`${prefix}-glow-60`} offset="60%" stopColor={p.glowColor} stopOpacity="0.08" />
          <stop id={`${prefix}-glow-100`} offset="100%" stopColor={p.glowColor} stopOpacity="0" />
        </radialGradient>

        {/* Primary Left Wing Gradient */}
        <linearGradient
          id={`${prefix}-left-wing-grad`}
          x1="300"
          y1="80"
          x2="100"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-lw-0`} offset="0%" stopColor={p.primaryLight} />
          <stop id={`${prefix}-lw-35`} offset="35%" stopColor={p.primaryMid} />
          <stop id={`${prefix}-lw-75`} offset="75%" stopColor={p.primaryDeep} />
          <stop id={`${prefix}-lw-100`} offset="100%" stopColor={p.primaryDark} />
        </linearGradient>

        {/* Primary Right Wing Gradient (Mirrored) */}
        <linearGradient
          id={`${prefix}-right-wing-grad`}
          x1="300"
          y1="80"
          x2="500"
          y2="300"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-rw-0`} offset="0%" stopColor={p.primaryLight} />
          <stop id={`${prefix}-rw-35`} offset="35%" stopColor={p.primaryMid} />
          <stop id={`${prefix}-rw-75`} offset="75%" stopColor={p.primaryDeep} />
          <stop id={`${prefix}-rw-100`} offset="100%" stopColor={p.primaryDark} />
        </linearGradient>

        {/* Inner Luminescent Wing Core Gradient (Left) */}
        <linearGradient
          id={`${prefix}-left-inner-grad`}
          x1="300"
          y1="140"
          x2="200"
          y2="280"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-lin-0`} offset="0%" stopColor={p.innerGradStart} stopOpacity="0.95" />
          <stop id={`${prefix}-lin-45`} offset="45%" stopColor={p.innerGradMid} stopOpacity="0.85" />
          <stop id={`${prefix}-lin-85`} offset="85%" stopColor={p.primaryLight} stopOpacity="0.65" />
          <stop id={`${prefix}-lin-100`} offset="100%" stopColor={p.primaryMid} stopOpacity="0.35" />
        </linearGradient>

        {/* Inner Luminescent Wing Core Gradient (Right) */}
        <linearGradient
          id={`${prefix}-right-inner-grad`}
          x1="300"
          y1="140"
          x2="400"
          y2="280"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-rin-0`} offset="0%" stopColor={p.innerGradStart} stopOpacity="0.95" />
          <stop id={`${prefix}-rin-45`} offset="45%" stopColor={p.innerGradMid} stopOpacity="0.85" />
          <stop id={`${prefix}-rin-85`} offset="85%" stopColor={p.primaryLight} stopOpacity="0.65" />
          <stop id={`${prefix}-rin-100`} offset="100%" stopColor={p.primaryMid} stopOpacity="0.35" />
        </linearGradient>

        {/* Lower Wing Gradient */}
        <linearGradient
          id={`${prefix}-lower-grad`}
          x1="300"
          y1="220"
          x2="200"
          y2="360"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-low-0`} offset="0%" stopColor={p.primaryLight} stopOpacity="0.8" />
          <stop id={`${prefix}-low-55`} offset="55%" stopColor={p.lowerWingMid} stopOpacity="0.75" />
          <stop id={`${prefix}-low-100`} offset="100%" stopColor={p.primaryDeep} stopOpacity="0.6" />
        </linearGradient>

        {/* Tail Ribbon Gradient */}
        <linearGradient
          id={`${prefix}-ribbon-grad`}
          x1="300"
          y1="270"
          x2="300"
          y2="490"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-rib-0`} offset="0%" stopColor={p.ribbonLight} stopOpacity="0.9" />
          <stop id={`${prefix}-rib-40`} offset="40%" stopColor={p.ribbonMid} stopOpacity="0.7" />
          <stop id={`${prefix}-rib-80`} offset="80%" stopColor={p.primaryDeep} stopOpacity="0.4" />
          <stop id={`${prefix}-rib-100`} offset="100%" stopColor={p.ribbonDark} stopOpacity="0" />
        </linearGradient>

        {/* Central Spindle Body Gradient */}
        <linearGradient
          id={`${prefix}-body-grad`}
          x1="300"
          y1="180"
          x2="300"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop id={`${prefix}-bod-0`} offset="0%" stopColor={p.bodyLight} />
          <stop id={`${prefix}-bod-35`} offset="35%" stopColor={p.bodyMid} />
          <stop id={`${prefix}-bod-70`} offset="70%" stopColor={p.primaryMid} />
          <stop id={`${prefix}-bod-100`} offset="100%" stopColor={p.bodyDark} />
        </linearGradient>

        {/* Luminous Core Nucleus Eye */}
        <radialGradient id={`${prefix}-nucleus-grad`} cx="42%" cy="38%" r="62%">
          <stop id={`${prefix}-nuc-0`} offset="0%" stopColor={p.nucleusGrad[0]} />
          <stop id={`${prefix}-nuc-40`} offset="40%" stopColor={p.nucleusGrad[1]} />
          <stop id={`${prefix}-nuc-100`} offset="100%" stopColor={p.nucleusGrad[2]} />
        </radialGradient>

        {/* Stardust Sparkle Gradient */}
        <radialGradient id={`${prefix}-stardust-grad`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop id={`${prefix}-dust-50`} offset="50%" stopColor={p.stardust} />
          <stop id={`${prefix}-dust-100`} offset="100%" stopColor={p.nucleusRing} />
        </radialGradient>
      </defs>

      {/* ============================================================ */}
      {/* 1. Ambient Glow Aura                                         */}
      {/* ============================================================ */}
      <circle cx="300" cy="230" r="240" fill={`url(#${prefix}-creature-glow)`} />

      {/* ============================================================ */}
      {/* 2. Orbiting Stardust Spores                                  */}
      {/* ============================================================ */}
      <g className="animate-spore-a">
        <circle cx="200" cy="110" r="4.5" fill={`url(#${prefix}-stardust-grad)`} />
        <circle cx="200" cy="110" r="2" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-b">
        <circle cx="420" cy="130" r="5" fill={`url(#${prefix}-stardust-grad)`} />
        <circle cx="420" cy="130" r="2.2" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-c">
        <circle cx="380" cy="360" r="4" fill={`url(#${prefix}-stardust-grad)`} />
        <circle cx="380" cy="360" r="1.8" fill="#FFFFFF" />
      </g>
      <g className="animate-spore-a">
        <circle cx="160" cy="330" r="3.5" fill={p.innerGradMid} opacity="0.8" />
      </g>

      {/* ============================================================ */}
      {/* 3. Fluid Trailing Tail Silk Ribbons                          */}
      {/* ============================================================ */}
      <g>
        <path
          ref={ribbonLeftRef}
          stroke={`url(#${prefix}-ribbon-grad)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={ribbonRightRef}
          stroke={`url(#${prefix}-ribbon-grad)`}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={ribbonCenterRef}
          stroke={`url(#${prefix}-ribbon-grad)`}
          strokeWidth="4.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* ============================================================ */}
      {/* 4. Secondary Under-Wings                                     */}
      {/* ============================================================ */}
      <g>
        <path
          ref={leftLowerWingRef}
          fill={`url(#${prefix}-lower-grad)`}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
        />
        <path
          ref={rightLowerWingRef}
          fill={`url(#${prefix}-lower-grad)`}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1.2"
        />
      </g>

      {/* ============================================================ */}
      {/* 5. Primary Outer Morphing Wings                              */}
      {/* ============================================================ */}
      <g>
        <path
          ref={leftWingRef}
          fill={`url(#${prefix}-left-wing-grad)`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 14px rgba(0,0,0,0.22))"
        />
        <path
          ref={rightWingRef}
          fill={`url(#${prefix}-right-wing-grad)`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 14px rgba(0,0,0,0.22))"
        />
      </g>

      {/* ============================================================ */}
      {/* 6. Inner Luminescent Wing Core                               */}
      {/* ============================================================ */}
      <g>
        <path
          ref={leftInnerWingRef}
          fill={`url(#${prefix}-left-inner-grad)`}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.3"
        />
        <path
          ref={rightInnerWingRef}
          fill={`url(#${prefix}-right-inner-grad)`}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth="1.3"
        />
      </g>

      {/* ============================================================ */}
      {/* 7. Dynamic Wing Energy Veins                                 */}
      {/* ============================================================ */}
      <g opacity="0.75">
        <path
          ref={veinLeft1Ref}
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={veinLeft2Ref}
          className={`${prefix}-vein-accent`}
          stroke={p.innerGradMid}
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={veinRight1Ref}
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={veinRight2Ref}
          className={`${prefix}-vein-accent`}
          stroke={p.innerGradMid}
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* ============================================================ */}
      {/* 8. Antenna Crest Wisps                                       */}
      {/* ============================================================ */}
      <g>
        <path
          ref={wispLeftRef}
          className={`${prefix}-wisp`}
          stroke={p.primaryLight}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          ref={wispRightRef}
          className={`${prefix}-wisp`}
          stroke={p.primaryLight}
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* ============================================================ */}
      {/* 9. Central Aerodynamic Spindle Body                          */}
      {/* ============================================================ */}
      <g>
        <path
          d="M 300 185 C 314 205, 316 238, 308 268 C 304 282, 300 296, 300 296 C 300 296, 296 282, 292 268 C 284 238, 286 205, 300 185 Z"
          fill={`url(#${prefix}-body-grad)`}
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.4"
        />

        {/* Head Crest */}
        <circle className={`${prefix}-crest-outer`} cx="300" cy="184" r="9" fill={p.bodyLight} />
        <circle className={`${prefix}-crest-inner`} cx="300" cy="184" r="6.5" fill={p.primaryMid} />
        <circle cx="300" cy="184" r="2.5" fill="#FFFFFF" />
      </g>

      {/* ============================================================ */}
      {/* 10. Luminous Core Nucleus                                    */}
      {/* ============================================================ */}
      <g className="animate-flower-core-pulse">
        <circle cx="300" cy="226" r="20" fill="rgba(0,0,0,0.18)" />
        <circle className={`${prefix}-nuc-ring`} cx="300" cy="225" r="17" fill={p.nucleusRing} />
        <circle cx="300" cy="225" r="14.5" fill={`url(#${prefix}-nucleus-grad)`} />
        <circle
          cx="300"
          cy="225"
          r="8"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeDasharray="3 2"
          fill="none"
          opacity="0.85"
        />
        <circle cx="300" cy="225" r="3.2" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

export default MorphingWingedCreature;
