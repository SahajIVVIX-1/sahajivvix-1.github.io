import React, { useEffect, useRef } from 'react';

/**
 * CursorDistortionEffect
 *
 * Subtle, luxury cursor-reactive motion distortion engine.
 * - Senses instantaneous cursor velocity and movement direction.
 * - Fast movement produces a fluid, liquid warp, stretch, and background-smear wake.
 * - Slow movement produces almost no noticeable distortion.
 * - When cursor stops moving, the distortion smoothly decays and returns to 100% normal within ~0.3–0.4s.
 * - Zero CPU / GPU usage when stationary.
 * - Respects prefers-reduced-motion.
 */
export const CursorDistortionEffect: React.FC = () => {
  const lensRef = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<HTMLDivElement>(null);
  const displaceMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let lastX = cursorX;
    let lastY = cursorY;
    let lagX = cursorX;
    let lagY = cursorY;

    let lastTime = performance.now();
    let currentSpeed = 0;
    let targetSpeed = 0;
    let movementAngle = 0;
    let stopTimeout: number | undefined;

    let animFrameId: number;
    let isLoopRunning = false;

    // Radius of fluid disturbance lens
    const LENS_RADIUS = 130; // 260px diameter
    const WAKE_RADIUS = 85;

    // Track active nearby disturbed text elements to ensure clean spring recovery
    const disturbedElements = new Set<HTMLElement>();

    const resetDisturbedElements = () => {
      disturbedElements.forEach((el) => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), filter 0.35s ease-out';
      });
      disturbedElements.clear();
    };

    const updateNearbyElements = (cx: number, cy: number, vx: number, vy: number, speedNorm: number) => {
      if (speedNorm < 0.08) {
        if (disturbedElements.size > 0) {
          resetDisturbedElements();
        }
        return;
      }

      // Query prominent visible typography and interactive elements near cursor
      const candidateElements = document.querySelectorAll<HTMLElement>(
        'h1, h2, h3, .font-editorial, .font-handwriting, .cursor-distort-item'
      );

      const radius = 240;
      const radiusSq = radius * radius;

      candidateElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // Skip off-screen elements
        if (
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth
        ) {
          return;
        }

        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;
        const dx = elCenterX - cx;
        const dy = elCenterY - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          disturbedElements.add(el);
          const dist = Math.sqrt(distSq);
          const proximity = Math.pow(1 - dist / radius, 1.8);
          const intensity = proximity * speedNorm;

          // Subtle directional fluid smear and micro-skew
          const skewX = Math.max(Math.min(-vx * 0.022 * intensity, 4), -4);
          const skewY = Math.max(Math.min(-vy * 0.012 * intensity, 2), -2);
          const stretchX = 1 + Math.min(Math.abs(vx) * 0.0004 * intensity, 0.06);
          const offsetY = Math.max(Math.min(vy * 0.04 * intensity, 3), -3);
          const smearBlur = Math.min(intensity * 1.2, 1.4);

          el.style.transition = 'transform 0.05s ease-out, filter 0.08s ease-out';
          el.style.transform = `translate3d(0, ${offsetY.toFixed(1)}px, 0) skew(${skewX.toFixed(2)}deg, ${skewY.toFixed(2)}deg) scaleX(${stretchX.toFixed(3)})`;
          if (smearBlur > 0.3) {
            el.style.filter = `blur(${smearBlur.toFixed(2)}px)`;
          } else {
            el.style.filter = '';
          }
        }
      });
    };

    // Main animation loop: runs ONLY while cursor is actively moving or settling
    const loop = (now: number) => {
      // Calculate delta time
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Exponential decay toward target speed
      currentSpeed += (targetSpeed - currentSpeed) * 0.22;
      targetSpeed *= Math.pow(0.04, dt); // Smooth decay over ~0.35s

      // Lag coordinates create liquid inertia wake
      lagX += (cursorX - lagX) * 0.32;
      lagY += (cursorY - lagY) * 0.32;

      // Normalized speed factor (0 = stationary, 1 = vigorous swipe)
      const speedNorm = Math.min(currentSpeed / 28, 1);

      if (lensRef.current && wakeRef.current) {
        if (speedNorm > 0.015) {
          // 1. Dynamic directional stretching of the lens along movement velocity
          const stretch = 1 + speedNorm * 0.35;
          const compression = 1 - speedNorm * 0.18;
          const deg = (movementAngle * 180) / Math.PI;

          // Subtle, elegant opacity (max ~0.75 on ultra-fast swipe, invisible when slow)
          const lensOpacity = Math.min(speedNorm * 0.85, 0.8);
          const blurPx = Math.min(speedNorm * 2.4, 2.5);

          // Update main fluid refraction lens
          lensRef.current.style.opacity = lensOpacity.toFixed(3);
          lensRef.current.style.transform = `translate3d(${(cursorX - LENS_RADIUS).toFixed(1)}px, ${(cursorY - LENS_RADIUS).toFixed(1)}px, 0) rotate(${deg.toFixed(1)}deg) scale(${stretch.toFixed(2)}, ${compression.toFixed(2)})`;
          lensRef.current.style.backdropFilter = `url(#cursor-fluid-displace) blur(${blurPx.toFixed(1)}px) saturate(${(1 + speedNorm * 0.15).toFixed(2)})`;
          (lensRef.current.style as any).WebkitBackdropFilter = `url(#cursor-fluid-displace) blur(${blurPx.toFixed(1)}px) saturate(${(1 + speedNorm * 0.15).toFixed(2)})`;

          // Update trailing liquid wake (sits slightly behind cursor)
          const wakeOpacity = Math.min(speedNorm * 0.45, 0.4);
          wakeRef.current.style.opacity = wakeOpacity.toFixed(3);
          wakeRef.current.style.transform = `translate3d(${(lagX - WAKE_RADIUS).toFixed(1)}px, ${(lagY - WAKE_RADIUS).toFixed(1)}px, 0) scale(${(1 + speedNorm * 0.2).toFixed(2)})`;

          // 2. Modulate SVG displacement filter scale
          if (displaceMapRef.current) {
            // Scales from 0 up to 7px during fast swipe, completely 0 when stopped
            const displaceScale = Math.min(speedNorm * 7.5, 7.5);
            displaceMapRef.current.scale.baseVal = displaceScale;
          }

          if (turbulenceRef.current) {
            // Dynamic subtle flow shift
            const freq = 0.018 + speedNorm * 0.006;
            turbulenceRef.current.setAttribute('baseFrequency', `${freq.toFixed(4)} ${freq.toFixed(4)}`);
          }

          // 3. Apply subtle proximity wake to nearby text elements
          const vx = cursorX - lagX;
          const vy = cursorY - lagY;
          updateNearbyElements(cursorX, cursorY, vx, vy, speedNorm);
        } else {
          // Perfectly at rest: clean restoration of normal website appearance
          lensRef.current.style.opacity = '0';
          wakeRef.current.style.opacity = '0';

          if (displaceMapRef.current) {
            displaceMapRef.current.scale.baseVal = 0;
          }

          resetDisturbedElements();

          // Stop loop to preserve 0 idle CPU usage
          isLoopRunning = false;
          return;
        }
      }

      animFrameId = requestAnimationFrame(loop);
    };

    const startLoopIfNeeded = () => {
      if (!isLoopRunning) {
        isLoopRunning = true;
        lastTime = performance.now();
        animFrameId = requestAnimationFrame(loop);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      // Ignore simulated touch mouse events to keep mobile crisp
      if (e.pointerType === 'touch') return;

      const now = performance.now();
      const dt = Math.max(now - lastTime, 8);

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);

      cursorX = e.clientX;
      cursorY = e.clientY;

      if (dist > 1) {
        // Calculate instantaneous velocity in pixels per frame (~16ms)
        const instantVelocity = (dist / dt) * 16;
        targetSpeed = Math.max(targetSpeed, instantVelocity);
        movementAngle = Math.atan2(dy, dx);
      }

      lastX = cursorX;
      lastY = cursorY;

      // Start RAF loop
      startLoopIfNeeded();

      // Reset stationary stop timer
      if (stopTimeout) {
        window.clearTimeout(stopTimeout);
      }
      stopTimeout = window.setTimeout(() => {
        targetSpeed = 0;
      }, 70);
    };

    const handleMouseLeave = () => {
      targetSpeed = 0;
      if (lensRef.current) lensRef.current.style.opacity = '0';
      if (wakeRef.current) wakeRef.current.style.opacity = '0';
      if (displaceMapRef.current) displaceMapRef.current.scale.baseVal = 0;
      resetDisturbedElements();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (stopTimeout) window.clearTimeout(stopTimeout);
      cancelAnimationFrame(animFrameId);
      resetDisturbedElements();
    };
  }, []);

  return (
    <>
      {/* Hidden SVG Filter Definition for Hardware-Accelerated Liquid Displacement */}
      <svg
        className="fixed pointer-events-none w-0 h-0 overflow-hidden select-none -z-50"
        aria-hidden="true"
      >
        <defs>
          <filter id="cursor-fluid-displace" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.02 0.02"
              numOctaves="2"
              result="fluidNoise"
            />
            <feDisplacementMap
              ref={displaceMapRef}
              in="SourceGraphic"
              in2="fluidNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
          </filter>
        </defs>
      </svg>

      {/* Trailing Soft Liquid Wake (mixes gently with background tone) */}
      <div
        ref={wakeRef}
        className="fixed top-0 left-0 pointer-events-none rounded-full z-[34] opacity-0 transition-opacity duration-300 ease-out will-change-transform"
        style={{
          width: '170px',
          height: '170px',
          background:
            'radial-gradient(circle at center, rgba(224, 77, 62, 0.04) 0%, rgba(126, 201, 219, 0.03) 45%, transparent 75%)',
          filter: 'blur(12px)',
          mixBlendMode: 'multiply',
        }}
        aria-hidden="true"
      />

      {/* Primary Fluid Distortion Lens (Radial falloff, directional stretch, and liquid smear) */}
      <div
        ref={lensRef}
        className="fixed top-0 left-0 pointer-events-none rounded-full z-[35] opacity-0 transition-opacity duration-300 ease-out will-change-transform"
        style={{
          width: '260px',
          height: '260px',
          maskImage:
            'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0) 75%)',
        }}
        aria-hidden="true"
      />
    </>
  );
};

export default CursorDistortionEffect;
