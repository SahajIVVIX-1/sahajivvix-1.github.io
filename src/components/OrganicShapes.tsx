import React, { useEffect, useRef } from 'react';
import { useTransition } from '../context/TransitionContext';

// Pristine C2-smooth 8-lobed organic flower path (Zero pinched cusp or tail artifact)
const CYAN_OUTER_PATH =
  'M 480.00 250.00 C 480.00 265.31, 372.09 268.82, 360.87 295.92 C 349.64 323.03, 423.46 401.81, 412.63 412.63 C 401.81 423.46, 323.03 349.64, 295.92 360.87 C 268.82 372.09, 265.31 480.00, 250.00 480.00 C 234.69 480.00, 231.18 372.09, 204.08 360.87 C 176.97 349.64, 98.19 423.46, 87.37 412.63 C 76.54 401.81, 150.36 323.03, 139.13 295.92 C 127.91 268.82, 20.00 265.31, 20.00 250.00 C 20.00 234.69, 127.91 231.18, 139.13 204.08 C 150.36 176.97, 76.54 98.19, 87.37 87.37 C 98.19 76.54, 176.97 150.36, 204.08 139.13 C 231.18 127.91, 234.69 20.00, 250.00 20.00 C 265.31 20.00, 268.82 127.91, 295.92 139.13 C 323.03 150.36, 401.81 76.54, 412.63 87.37 C 423.46 98.19, 349.64 176.97, 360.87 204.08 C 372.09 231.18, 480.00 234.69, 480.00 250.00 Z';

const CYAN_INNER_PATH =
  'M 330.00 250.00 C 330.00 256.12, 298.25 258.94, 294.35 268.37 C 290.44 277.80, 310.90 302.24, 306.57 306.57 C 302.24 310.90, 277.80 290.44, 268.37 294.35 C 258.94 298.25, 256.12 330.00, 250.00 330.00 C 243.88 330.00, 241.06 298.25, 231.63 294.35 C 222.20 290.44, 197.76 310.90, 193.43 306.57 C 189.10 302.24, 209.56 277.80, 205.65 268.37 C 201.75 258.94, 170.00 256.12, 170.00 250.00 C 170.00 243.88, 201.75 241.06, 205.65 231.63 C 209.56 222.20, 189.10 197.76, 193.43 193.43 C 197.76 189.10, 222.20 209.56, 231.63 205.65 C 241.06 201.75, 243.88 170.00, 250.00 170.00 C 256.12 170.00, 258.94 201.75, 268.37 205.65 C 277.80 209.56, 302.24 189.10, 306.57 193.43 C 310.90 197.76, 290.44 222.20, 294.35 231.63 C 298.25 241.06, 330.00 243.88, 330.00 250.00 Z';

// Pristine C2-smooth 9-lobed organic flower path
const CORAL_OUTER_PATH =
  'M 480.00 250.00 C 480.00 263.68, 371.73 266.40, 362.76 291.04 C 353.79 315.68, 434.98 387.36, 426.19 397.84 C 417.40 408.32, 332.71 340.81, 310.00 353.92 C 287.29 367.03, 303.41 474.13, 289.94 476.51 C 276.47 478.88, 254.99 372.73, 229.16 368.18 C 203.34 363.62, 146.85 456.03, 135.00 449.19 C 123.15 442.35, 174.93 347.22, 158.07 327.13 C 141.22 307.05, 38.55 341.52, 33.87 328.66 C 29.19 315.81, 130.00 276.22, 130.00 250.00 C 130.00 223.78, 29.19 184.19, 33.87 171.34 C 38.55 158.48, 141.22 192.95, 158.07 172.87 C 174.93 152.78, 123.15 57.65, 135.00 50.81 C 146.85 43.97, 203.34 136.38, 229.16 131.82 C 254.99 127.27, 276.47 21.12, 289.94 23.49 C 303.41 25.87, 287.29 132.97, 310.00 146.08 C 332.71 159.19, 417.40 91.68, 426.19 102.16 C 434.98 112.64, 353.79 184.32, 362.76 208.96 C 371.73 233.60, 480.00 236.32, 480.00 250.00 Z';

const CORAL_INNER_PATH =
  'M 330.00 250.00 C 330.00 255.47, 298.22 257.85, 295.11 266.42 C 291.99 274.99, 314.80 297.23, 311.28 301.42 C 307.77 305.62, 281.90 287.01, 274.00 291.57 C 266.10 296.13, 269.28 327.83, 263.89 328.78 C 258.50 329.73, 250.65 298.85, 241.66 297.27 C 232.68 295.69, 214.74 322.02, 210.00 319.28 C 205.26 316.55, 219.09 287.84, 213.23 280.85 C 207.37 273.87, 176.70 282.50, 174.82 277.36 C 172.95 272.22, 202.00 259.12, 202.00 250.00 C 202.00 240.88, 172.95 227.78, 174.82 222.64 C 176.70 217.50, 207.37 226.13, 213.23 219.15 C 219.09 212.16, 205.26 183.45, 210.00 180.72 C 214.74 177.98, 232.68 204.31, 241.66 202.73 C 250.65 201.15, 258.50 170.27, 263.89 171.22 C 269.28 172.17, 266.10 203.87, 274.00 208.43 C 281.90 212.99, 307.77 194.38, 311.28 198.58 C 314.80 202.77, 291.99 225.01, 295.11 233.58 C 298.22 242.15, 330.00 244.53, 330.00 250.00 Z';

interface FlowerTransform {
  x: number;
  y: number;
  rot: number;
  scale: number;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export interface OrganicShapesProps {
  readonly showFloatingWords?: boolean;
}

/**
 * OrganicShapes
 * High-performance, GPU-driven continuous organic flower motion engine.
 * - Primary visual transition mechanism for the entire application.
 * - Initial load: dramatic "opening curtain" sweeping inward from edges and parting to orbits.
 * - Internal navigation, browser Back/Forward (popstate), and redirects:
 *   Flows smoothly FROM wherever flowers currently are on their orbits into the center curtain,
 *   holds the route change seamlessly underneath, and parts back outward to reveal the new page.
 * - Continuous elliptical orbital circulation covering full vertical sides when idle.
 * - Crisp solid vectors (NO BLUR, NO GLITCHES).
 */
export const OrganicShapes: React.FC<OrganicShapesProps> = ({
  showFloatingWords: _showFloatingWords = true,
}) => {
  const leftShapeRef = useRef<HTMLDivElement>(null);
  const rightShapeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    phase,
    onCurtainHitCenter,
    onCurtainOpened,
    onEntranceComplete,
  } = useTransition();

  // Current live transform coordinates
  const currentLeftRef = useRef<FlowerTransform>({ x: -400, y: 200, rot: -25, scale: 0.9 });
  const currentRightRef = useRef<FlowerTransform>({ x: 1800, y: 300, rot: 25, scale: 0.9 });

  // Snapshots at transition boundaries
  const snapshotLeftRef = useRef<FlowerTransform>({ x: -400, y: 200, rot: -25, scale: 0.9 });
  const snapshotRightRef = useRef<FlowerTransform>({ x: 1800, y: 300, rot: 25, scale: 0.9 });

  // Transition timing
  const transitionStartRef = useRef<number>(0);
  const lastPhaseRef = useRef<string>('');

  // Parallax offset
  const mouseOffsetRef = useRef({ x: 0, y: 0 });

  // Setup desktop mouse parallax
  useEffect(() => {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasFinePointer || prefersReduced) return;

    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) - 0.5;
      targetY = (e.clientY / window.innerHeight) - 0.5;
    };

    const onMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    const parallaxInterval = setInterval(() => {
      mouseOffsetRef.current.x += (targetX - mouseOffsetRef.current.x) * 0.05;
      mouseOffsetRef.current.y += (targetY - mouseOffsetRef.current.y) * 0.05;
    }, 16);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      clearInterval(parallaxInterval);
    };
  }, []);

  // Continuous RAF circulation and transition interpolation loop
  useEffect(() => {
    let animFrameId: number;

    const loop = (now: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      // Base flower size
      const size = Math.min(Math.max(vw * (isMobile ? 0.52 : 0.36), 280), 560);

      // Current global animation time (seconds)
      const globalTime = now / 1000;

      // 1. Compute smooth idle orbital targets
      // Left flower: 14s cycle, traverses Upper -> Middle (dips inward) -> Lower -> Middle -> Upper
      const angleLeft = (globalTime / 14) * Math.PI * 2;
      const idleLeftX =
        (isMobile ? -size * 0.44 : -size * 0.30) +
        Math.cos(angleLeft) * (isMobile ? size * 0.12 : size * 0.20) +
        mouseOffsetRef.current.x * 20;
      const idleLeftY =
        (vh - size) * 0.5 +
        Math.sin(angleLeft) * (vh * (isMobile ? 0.24 : 0.32)) +
        mouseOffsetRef.current.y * 16;
      const idleLeftRot = -6 + Math.sin(angleLeft) * 14;
      const idleLeftScale = 1.0 + Math.cos(angleLeft) * 0.04;

      // Right flower: 18s cycle, opposing phase (PI offset), traverses Lower -> Middle -> Upper -> Middle -> Lower
      const angleRight = (globalTime / 18) * Math.PI * 2 + Math.PI;
      const idleRightX =
        vw -
        (isMobile ? size * 0.56 : size * 0.70) -
        Math.cos(angleRight) * (isMobile ? size * 0.12 : size * 0.20) -
        mouseOffsetRef.current.x * 20;
      const idleRightY =
        (vh - size) * 0.5 -
        Math.sin(angleRight) * (vh * (isMobile ? 0.24 : 0.32)) -
        mouseOffsetRef.current.y * 16;
      const idleRightRot = 8 - Math.sin(angleRight) * 14;
      const idleRightScale = 1.0 + Math.cos(angleRight) * 0.04;

      // Target center meeting positions (curtain)
      const centerLeftX = (vw - size) * 0.5 - (isMobile ? size * 0.16 : size * 0.22);
      const centerLeftY = (vh - size) * 0.5;
      const centerLeftRot = 16;
      const centerLeftScale = isMobile ? 1.28 : 1.35;

      const centerRightX = (vw - size) * 0.5 + (isMobile ? size * 0.16 : size * 0.22);
      const centerRightY = (vh - size) * 0.5;
      const centerRightRot = -16;
      const centerRightScale = isMobile ? 1.25 : 1.30;

      // Detect phase transition trigger
      if (phase !== lastPhaseRef.current) {
        if (phase === 'entering') {
          // Off-screen initial positions for initial page load entrance
          snapshotLeftRef.current = {
            x: -size * 0.95,
            y: (vh - size) * 0.35,
            rot: -28,
            scale: 0.9,
          };
          snapshotRightRef.current = {
            x: vw + size * 0.15,
            y: (vh - size) * 0.55,
            rot: 24,
            scale: 0.9,
          };
          currentLeftRef.current = { ...snapshotLeftRef.current };
          currentRightRef.current = { ...snapshotRightRef.current };
        } else {
          // Snapshot the EXACT position where the flowers are right now
          snapshotLeftRef.current = { ...currentLeftRef.current };
          snapshotRightRef.current = { ...currentRightRef.current };
        }
        transitionStartRef.current = now;
        lastPhaseRef.current = phase;
      }

      // Handle motion by current phase
      if (phase === 'entering') {
        // Initial page load: sweeps inward from off-screen, briefly approaches center, and opens out to orbits
        const duration = 1000;
        const elapsed = now - transitionStartRef.current;
        const progress = Math.min(elapsed / duration, 1.0);

        if (progress < 0.44) {
          // Stage 1: sweep inward toward center
          const subP = progress / 0.44;
          const ease = easeInOutCubic(subP);
          const inLeftX = centerLeftX - size * 0.06;
          const inLeftY = centerLeftY;
          const inRightX = centerRightX + size * 0.06;
          const inRightY = centerRightY;

          currentLeftRef.current.x =
            snapshotLeftRef.current.x + (inLeftX - snapshotLeftRef.current.x) * ease;
          currentLeftRef.current.y =
            snapshotLeftRef.current.y + (inLeftY - snapshotLeftRef.current.y) * ease;
          currentLeftRef.current.rot =
            snapshotLeftRef.current.rot + (14 - snapshotLeftRef.current.rot) * ease;
          currentLeftRef.current.scale =
            snapshotLeftRef.current.scale + (centerLeftScale * 0.95 - snapshotLeftRef.current.scale) * ease;

          currentRightRef.current.x =
            snapshotRightRef.current.x + (inRightX - snapshotRightRef.current.x) * ease;
          currentRightRef.current.y =
            snapshotRightRef.current.y + (inRightY - snapshotRightRef.current.y) * ease;
          currentRightRef.current.rot =
            snapshotRightRef.current.rot + (-14 - snapshotRightRef.current.rot) * ease;
          currentRightRef.current.scale =
            snapshotRightRef.current.scale + (centerRightScale * 0.95 - snapshotRightRef.current.scale) * ease;
        } else {
          // Stage 2: sweep outward from center to live orbital targets
          const subP = Math.min((progress - 0.44) / 0.56, 1.0);
          const ease = easeInOutCubic(subP);
          const inLeftX = centerLeftX - size * 0.06;
          const inLeftY = centerLeftY;
          const inRightX = centerRightX + size * 0.06;
          const inRightY = centerRightY;

          currentLeftRef.current.x = inLeftX + (idleLeftX - inLeftX) * ease;
          currentLeftRef.current.y = inLeftY + (idleLeftY - inLeftY) * ease;
          currentLeftRef.current.rot = 14 + (idleLeftRot - 14) * ease;
          currentLeftRef.current.scale =
            centerLeftScale * 0.95 + (idleLeftScale - centerLeftScale * 0.95) * ease;

          currentRightRef.current.x = inRightX + (idleRightX - inRightX) * ease;
          currentRightRef.current.y = inRightY + (idleRightY - inRightY) * ease;
          currentRightRef.current.rot = -14 + (idleRightRot - (-14)) * ease;
          currentRightRef.current.scale =
            centerRightScale * 0.95 + (idleRightScale - centerRightScale * 0.95) * ease;
        }

        if (progress >= 1.0) {
          onEntranceComplete();
        }
      } else if (phase === 'idle') {
        // Continuous organic orbit around respective sides
        currentLeftRef.current.x += (idleLeftX - currentLeftRef.current.x) * 0.1;
        currentLeftRef.current.y += (idleLeftY - currentLeftRef.current.y) * 0.1;
        currentLeftRef.current.rot += (idleLeftRot - currentLeftRef.current.rot) * 0.1;
        currentLeftRef.current.scale += (idleLeftScale - currentLeftRef.current.scale) * 0.1;

        currentRightRef.current.x += (idleRightX - currentRightRef.current.x) * 0.1;
        currentRightRef.current.y += (idleRightY - currentRightRef.current.y) * 0.1;
        currentRightRef.current.rot += (idleRightRot - currentRightRef.current.rot) * 0.1;
        currentRightRef.current.scale += (idleRightScale - currentRightRef.current.scale) * 0.1;
      } else if (phase === 'closing' || phase === 'redirecting') {
        // Flow dynamically from wherever the flowers currently are into the center curtain
        const duration = phase === 'redirecting' ? 620 : 520;
        const elapsed = now - transitionStartRef.current;
        const rawProgress = Math.min(elapsed / duration, 1.0);
        const ease = easeInOutCubic(rawProgress);

        // Interpolate Left Flower
        currentLeftRef.current.x =
          snapshotLeftRef.current.x + (centerLeftX - snapshotLeftRef.current.x) * ease;
        currentLeftRef.current.y =
          snapshotLeftRef.current.y + (centerLeftY - snapshotLeftRef.current.y) * ease;
        currentLeftRef.current.rot =
          snapshotLeftRef.current.rot + (centerLeftRot - snapshotLeftRef.current.rot) * ease;
        currentLeftRef.current.scale =
          snapshotLeftRef.current.scale +
          (centerLeftScale - snapshotLeftRef.current.scale) * ease;

        // Interpolate Right Flower
        currentRightRef.current.x =
          snapshotRightRef.current.x + (centerRightX - snapshotRightRef.current.x) * ease;
        currentRightRef.current.y =
          snapshotRightRef.current.y + (centerRightY - snapshotRightRef.current.y) * ease;
        currentRightRef.current.rot =
          snapshotRightRef.current.rot + (centerRightRot - snapshotRightRef.current.rot) * ease;
        currentRightRef.current.scale =
          snapshotRightRef.current.scale +
          (centerRightScale - snapshotRightRef.current.scale) * ease;

        if (rawProgress >= 1.0) {
          // Reached center curtain: trigger page swap or redirect
          onCurtainHitCenter();
        }
      } else if (phase === 'opening') {
        // Flow smoothly from the center back out to continuous orbital paths
        const duration = 520;
        const elapsed = now - transitionStartRef.current;
        const rawProgress = Math.min(elapsed / duration, 1.0);
        const ease = easeInOutCubic(rawProgress);

        // Target is the live orbital path
        currentLeftRef.current.x =
          snapshotLeftRef.current.x + (idleLeftX - snapshotLeftRef.current.x) * ease;
        currentLeftRef.current.y =
          snapshotLeftRef.current.y + (idleLeftY - snapshotLeftRef.current.y) * ease;
        currentLeftRef.current.rot =
          snapshotLeftRef.current.rot + (idleLeftRot - snapshotLeftRef.current.rot) * ease;
        currentLeftRef.current.scale =
          snapshotLeftRef.current.scale +
          (idleLeftScale - snapshotLeftRef.current.scale) * ease;

        currentRightRef.current.x =
          snapshotRightRef.current.x + (idleRightX - snapshotRightRef.current.x) * ease;
        currentRightRef.current.y =
          snapshotRightRef.current.y + (idleRightY - snapshotRightRef.current.y) * ease;
        currentRightRef.current.rot =
          snapshotRightRef.current.rot + (idleRightRot - snapshotRightRef.current.rot) * ease;
        currentRightRef.current.scale =
          snapshotRightRef.current.scale +
          (idleRightScale - snapshotRightRef.current.scale) * ease;

        if (rawProgress >= 1.0) {
          onCurtainOpened();
        }
      }

      // Apply transforms directly to the DOM elements on the GPU
      if (leftShapeRef.current) {
        leftShapeRef.current.style.transform = `translate3d(${currentLeftRef.current.x.toFixed(
          2
        )}px, ${currentLeftRef.current.y.toFixed(2)}px, 0) rotate(${currentLeftRef.current.rot.toFixed(
          2
        )}deg) scale(${currentLeftRef.current.scale.toFixed(3)})`;
        leftShapeRef.current.style.width = `${size.toFixed(0)}px`;
        leftShapeRef.current.style.height = `${size.toFixed(0)}px`;
      }

      if (rightShapeRef.current) {
        rightShapeRef.current.style.transform = `translate3d(${currentRightRef.current.x.toFixed(
          2
        )}px, ${currentRightRef.current.y.toFixed(2)}px, 0) rotate(${currentRightRef.current.rot.toFixed(
          2
        )}deg) scale(${currentRightRef.current.scale.toFixed(3)})`;
        rightShapeRef.current.style.width = `${size.toFixed(0)}px`;
        rightShapeRef.current.style.height = `${size.toFixed(0)}px`;
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [phase, onCurtainHitCenter, onCurtainOpened, onEntranceComplete]);

  const isTransitioning = phase !== 'idle';
  const zIndexClass = isTransitioning ? 'z-30' : 'z-10';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none overflow-hidden select-none ${zIndexClass} transition-[z-index] duration-150`}
      aria-hidden="true"
    >
      {/* ============================================================ */}
      {/* LEFT FLOWER: Soft Cyan 8-Lobed Flower (CRISP - NO BLUR)      */}
      {/* ============================================================ */}
      <div
        ref={leftShapeRef}
        className="absolute top-0 left-0 will-change-transform pointer-events-none"
      >
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full drop-shadow-none"
          fill="none"
          shapeRendering="geometricPrecision"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crisp, organic 8-lobed form - NO PINCH, NO BLUR */}
          <path d={CYAN_OUTER_PATH} fill="#7EC9DB" />
          {/* Soft inner organic core */}
          <path d={CYAN_INNER_PATH} fill="#EBF8FA" />
        </svg>
      </div>

      {/* ============================================================ */}
      {/* RIGHT FLOWER: Warm Coral 9-Lobed Flower (CRISP - NO BLUR)    */}
      {/* ============================================================ */}
      <div
        ref={rightShapeRef}
        className="absolute top-0 left-0 will-change-transform pointer-events-none"
      >
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full drop-shadow-none"
          fill="none"
          shapeRendering="geometricPrecision"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Crisp, organic 9-lobed form - NO PINCH, NO BLUR */}
          <path d={CORAL_OUTER_PATH} fill="#E04D3E" />
          {/* Soft inner organic core */}
          <path d={CORAL_INNER_PATH} fill="#FDECE9" />
        </svg>
      </div>
    </div>
  );
};

export default OrganicShapes;
