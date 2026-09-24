import React, { useEffect, useRef, useState } from 'react';
import { useTransition } from '../context/TransitionContext';
import { MorphingWingedCreature } from './MorphingWingedCreature';
import { BUTTERFLY_PAIRS } from '../config/butterflyPalettes';

interface CreatureTransform {
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
 * GPU-accelerated living winged butterfly entity flight engine.
 * - Features exactly 2 Big Butterflies (Left and Right).
 * - Real-time random shape-morphing wings with fluid silk streamers.
 * - On every transition, BOTH butterflies change their colors to fresh complementary palettes.
 * - Interactive mouse parallax & 3D perspective tilt attraction.
 * - Smooth center curtain transition: Both butterflies sweep into center, transform colors, and glide outward.
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

  // Dynamic color palette pair index; increments on each transition
  const [paletteIndex, setPaletteIndex] = useState<number>(0);

  // Refs for tracking live coordinates without React re-renders
  const currentLeftRef = useRef<CreatureTransform>({ x: -400, y: 200, rot: -15, scale: 0.9 });
  const currentRightRef = useRef<CreatureTransform>({ x: 1800, y: 300, rot: 15, scale: 0.9 });

  // Snapshots at transition phase boundaries
  const snapshotLeftRef = useRef<CreatureTransform>({ x: -400, y: 200, rot: -15, scale: 0.9 });
  const snapshotRightRef = useRef<CreatureTransform>({ x: 1800, y: 300, rot: 15, scale: 0.9 });

  // Transition timing
  const transitionStartRef = useRef<number>(0);
  const lastPhaseRef = useRef<string>('');
  const hasTriggeredCenterRef = useRef<boolean>(false);

  // Parallax and interactive tilt offset
  const mouseOffsetRef = useRef({ x: 0, y: 0 });

  // Current active palette pair
  const currentPair = BUTTERFLY_PAIRS[paletteIndex % BUTTERFLY_PAIRS.length];

  // Desktop mouse parallax and subtle 3D tilt attraction
  useEffect(() => {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasFinePointer || prefersReduced) return;

    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    };

    const onMouseLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    const parallaxInterval = setInterval(() => {
      mouseOffsetRef.current.x += (targetX - mouseOffsetRef.current.x) * 0.06;
      mouseOffsetRef.current.y += (targetY - mouseOffsetRef.current.y) * 0.06;
    }, 16);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      clearInterval(parallaxInterval);
    };
  }, []);

  // Continuous RAF flight loop & curtain transition engine
  useEffect(() => {
    let animFrameId: number;

    const loop = (now: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw < 640;

      // Butterfly dimensions
      const width = Math.min(Math.max(vw * (isMobile ? 0.62 : 0.44), 320), 620);
      const height = width * (520 / 600);

      const globalTime = now / 1000;

      // ================================================================
      // 1. Smooth Idle Flight Paths
      // ================================================================

      // Left Butterfly: 14s cycle, glides smoothly across upper to middle left margin
      const angleLeft = (globalTime / 14) * Math.PI * 2;
      const idleLeftX =
        (isMobile ? -width * 0.42 : -width * 0.28) +
        Math.cos(angleLeft) * (isMobile ? width * 0.12 : width * 0.18) +
        mouseOffsetRef.current.x * 32;
      const idleLeftY =
        (vh - height) * 0.5 +
        Math.sin(angleLeft) * (vh * (isMobile ? 0.24 : 0.32)) +
        mouseOffsetRef.current.y * 22;
      const idleLeftRot = -4 + Math.sin(angleLeft) * 12 + mouseOffsetRef.current.x * 10;
      const idleLeftScale = 1.0 + Math.cos(angleLeft) * 0.04;

      // Right Butterfly: 18s cycle, opposing phase, glides across right margin
      const angleRight = (globalTime / 18) * Math.PI * 2 + Math.PI;
      const idleRightX =
        vw -
        (isMobile ? width * 0.58 : width * 0.72) -
        Math.cos(angleRight) * (isMobile ? width * 0.12 : width * 0.18) -
        mouseOffsetRef.current.x * 32;
      const idleRightY =
        (vh - height) * 0.5 -
        Math.sin(angleRight) * (vh * (isMobile ? 0.24 : 0.32)) -
        mouseOffsetRef.current.y * 22;
      const idleRightRot = 4 - Math.sin(angleRight) * 12 + mouseOffsetRef.current.x * 10;
      const idleRightScale = 1.0 + Math.cos(angleRight) * 0.04;

      // ================================================================
      // 2. Target Center Meeting Positions (Curtain)
      // ================================================================
      const centerLeftX = (vw - width) * 0.5 - (isMobile ? width * 0.15 : width * 0.20);
      const centerLeftY = (vh - height) * 0.5;
      const centerLeftRot = 12;
      const centerLeftScale = isMobile ? 1.30 : 1.38;

      const centerRightX = (vw - width) * 0.5 + (isMobile ? width * 0.15 : width * 0.20);
      const centerRightY = (vh - height) * 0.5;
      const centerRightRot = -12;
      const centerRightScale = isMobile ? 1.28 : 1.35;

      // Detect phase transition trigger
      if (phase !== lastPhaseRef.current) {
        hasTriggeredCenterRef.current = false;
        if (phase === 'entering') {
          snapshotLeftRef.current = {
            x: -width * 0.95,
            y: (vh - height) * 0.35,
            rot: -24,
            scale: 0.9,
          };
          snapshotRightRef.current = {
            x: vw + width * 0.15,
            y: (vh - height) * 0.55,
            rot: 20,
            scale: 0.9,
          };
          currentLeftRef.current = { ...snapshotLeftRef.current };
          currentRightRef.current = { ...snapshotRightRef.current };
        } else {
          // Snapshot current live positions of both butterflies
          snapshotLeftRef.current = { ...currentLeftRef.current };
          snapshotRightRef.current = { ...currentRightRef.current };
        }
        transitionStartRef.current = now;
        lastPhaseRef.current = phase;
      }

      // Handle motion by current phase
      if (phase === 'entering') {
        const duration = 1000;
        const elapsed = now - transitionStartRef.current;
        const progress = Math.min(elapsed / duration, 1.0);

        if (progress < 0.44) {
          const subP = progress / 0.44;
          const ease = easeInOutCubic(subP);
          const inLeftX = centerLeftX - width * 0.06;
          const inRightX = centerRightX + width * 0.06;

          currentLeftRef.current.x =
            snapshotLeftRef.current.x + (inLeftX - snapshotLeftRef.current.x) * ease;
          currentLeftRef.current.y =
            snapshotLeftRef.current.y + (centerLeftY - snapshotLeftRef.current.y) * ease;
          currentLeftRef.current.rot =
            snapshotLeftRef.current.rot + (10 - snapshotLeftRef.current.rot) * ease;
          currentLeftRef.current.scale =
            snapshotLeftRef.current.scale + (centerLeftScale * 0.95 - snapshotLeftRef.current.scale) * ease;

          currentRightRef.current.x =
            snapshotRightRef.current.x + (inRightX - snapshotRightRef.current.x) * ease;
          currentRightRef.current.y =
            snapshotRightRef.current.y + (centerRightY - snapshotRightRef.current.y) * ease;
          currentRightRef.current.rot =
            snapshotRightRef.current.rot + (-10 - snapshotRightRef.current.rot) * ease;
          currentRightRef.current.scale =
            snapshotRightRef.current.scale + (centerRightScale * 0.95 - snapshotRightRef.current.scale) * ease;
        } else {
          const subP = Math.min((progress - 0.44) / 0.56, 1.0);
          const ease = easeInOutCubic(subP);
          const inLeftX = centerLeftX - width * 0.06;
          const inRightX = centerRightX + width * 0.06;

          currentLeftRef.current.x = inLeftX + (idleLeftX - inLeftX) * ease;
          currentLeftRef.current.y = centerLeftY + (idleLeftY - centerLeftY) * ease;
          currentLeftRef.current.rot = 10 + (idleLeftRot - 10) * ease;
          currentLeftRef.current.scale =
            centerLeftScale * 0.95 + (idleLeftScale - centerLeftScale * 0.95) * ease;

          currentRightRef.current.x = inRightX + (idleRightX - inRightX) * ease;
          currentRightRef.current.y = centerRightY + (idleRightY - centerRightY) * ease;
          currentRightRef.current.rot = -10 + (idleRightRot - (-10)) * ease;
          currentRightRef.current.scale =
            centerRightScale * 0.95 + (idleRightScale - centerRightScale * 0.95) * ease;
        }

        if (progress >= 1.0) {
          onEntranceComplete();
        }
      } else if (phase === 'idle') {
        currentLeftRef.current.x += (idleLeftX - currentLeftRef.current.x) * 0.1;
        currentLeftRef.current.y += (idleLeftY - currentLeftRef.current.y) * 0.1;
        currentLeftRef.current.rot += (idleLeftRot - currentLeftRef.current.rot) * 0.1;
        currentLeftRef.current.scale += (idleLeftScale - currentLeftRef.current.scale) * 0.1;

        currentRightRef.current.x += (idleRightX - currentRightRef.current.x) * 0.1;
        currentRightRef.current.y += (idleRightY - currentRightRef.current.y) * 0.1;
        currentRightRef.current.rot += (idleRightRot - currentRightRef.current.rot) * 0.1;
        currentRightRef.current.scale += (idleRightScale - currentRightRef.current.scale) * 0.1;
      } else if (phase === 'closing' || phase === 'redirecting') {
        // Both butterflies merge at the center
        const duration = phase === 'redirecting' ? 620 : 520;
        const elapsed = now - transitionStartRef.current;
        const rawProgress = Math.min(elapsed / duration, 1.0);
        const ease = easeInOutCubic(rawProgress);

        currentLeftRef.current.x =
          snapshotLeftRef.current.x + (centerLeftX - snapshotLeftRef.current.x) * ease;
        currentLeftRef.current.y =
          snapshotLeftRef.current.y + (centerLeftY - snapshotLeftRef.current.y) * ease;
        currentLeftRef.current.rot =
          snapshotLeftRef.current.rot + (centerLeftRot - snapshotLeftRef.current.rot) * ease;
        currentLeftRef.current.scale =
          snapshotLeftRef.current.scale + (centerLeftScale - snapshotLeftRef.current.scale) * ease;

        currentRightRef.current.x =
          snapshotRightRef.current.x + (centerRightX - snapshotRightRef.current.x) * ease;
        currentRightRef.current.y =
          snapshotRightRef.current.y + (centerRightY - snapshotRightRef.current.y) * ease;
        currentRightRef.current.rot =
          snapshotRightRef.current.rot + (centerRightRot - snapshotRightRef.current.rot) * ease;
        currentRightRef.current.scale =
          snapshotRightRef.current.scale + (centerRightScale - snapshotRightRef.current.scale) * ease;

        // When curtain hits center: both butterflies change their colors!
        if (rawProgress >= 1.0 && !hasTriggeredCenterRef.current) {
          hasTriggeredCenterRef.current = true;
          // Advance to next vibrant color palette pair
          setPaletteIndex((prev) => (prev + 1) % BUTTERFLY_PAIRS.length);

          onCurtainHitCenter();
        }
      } else if (phase === 'opening') {
        const duration = 520;
        const elapsed = now - transitionStartRef.current;
        const rawProgress = Math.min(elapsed / duration, 1.0);
        const ease = easeInOutCubic(rawProgress);

        currentLeftRef.current.x =
          snapshotLeftRef.current.x + (idleLeftX - snapshotLeftRef.current.x) * ease;
        currentLeftRef.current.y =
          snapshotLeftRef.current.y + (idleLeftY - snapshotLeftRef.current.y) * ease;
        currentLeftRef.current.rot =
          snapshotLeftRef.current.rot + (idleLeftRot - snapshotLeftRef.current.rot) * ease;
        currentLeftRef.current.scale =
          snapshotLeftRef.current.scale + (idleLeftScale - snapshotLeftRef.current.scale) * ease;

        currentRightRef.current.x =
          snapshotRightRef.current.x + (idleRightX - snapshotRightRef.current.x) * ease;
        currentRightRef.current.y =
          snapshotRightRef.current.y + (idleRightY - snapshotRightRef.current.y) * ease;
        currentRightRef.current.rot =
          snapshotRightRef.current.rot + (idleRightRot - snapshotRightRef.current.rot) * ease;
        currentRightRef.current.scale =
          snapshotRightRef.current.scale + (idleRightScale - snapshotRightRef.current.scale) * ease;

        if (rawProgress >= 1.0) {
          onCurtainOpened();
        }
      }

      // 3D tilt attraction
      const tiltX = (-mouseOffsetRef.current.y * 12).toFixed(2);
      const tiltY = (mouseOffsetRef.current.x * 12).toFixed(2);

      // Direct GPU Transform Updates
      if (leftShapeRef.current) {
        leftShapeRef.current.style.transform = `translate3d(${currentLeftRef.current.x.toFixed(
          2
        )}px, ${currentLeftRef.current.y.toFixed(2)}px, 0) rotate(${currentLeftRef.current.rot.toFixed(
          2
        )}deg) scale(${currentLeftRef.current.scale.toFixed(3)}) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        leftShapeRef.current.style.width = `${width.toFixed(0)}px`;
        leftShapeRef.current.style.height = `${height.toFixed(0)}px`;
      }

      if (rightShapeRef.current) {
        rightShapeRef.current.style.transform = `translate3d(${currentRightRef.current.x.toFixed(
          2
        )}px, ${currentRightRef.current.y.toFixed(2)}px, 0) rotate(${currentRightRef.current.rot.toFixed(
          2
        )}deg) scale(${currentRightRef.current.scale.toFixed(3)}) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        rightShapeRef.current.style.width = `${width.toFixed(0)}px`;
        rightShapeRef.current.style.height = `${height.toFixed(0)}px`;
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
      {/* 1. LEFT BUTTERFLY (Permanent, Changes Color on Navigation)    */}
      {/* ============================================================ */}
      <div
        ref={leftShapeRef}
        className="absolute top-0 left-0 will-change-transform pointer-events-none filter drop-shadow-[0_12px_36px_rgba(0,0,0,0.22)]"
        style={{ zIndex: 20 }}
      >
        <MorphingWingedCreature
          palette={currentPair.parent1}
          seed={0}
          instanceId="butterfly-left"
        />
      </div>

      {/* ============================================================ */}
      {/* 2. RIGHT BUTTERFLY (Permanent, Changes Color on Navigation)   */}
      {/* ============================================================ */}
      <div
        ref={rightShapeRef}
        className="absolute top-0 left-0 will-change-transform pointer-events-none filter drop-shadow-[0_12px_36px_rgba(0,0,0,0.22)]"
        style={{ zIndex: 20 }}
      >
        <MorphingWingedCreature
          palette={currentPair.parent2}
          seed={4.2}
          instanceId="butterfly-right"
        />
      </div>
    </div>
  );
};

export default OrganicShapes;
