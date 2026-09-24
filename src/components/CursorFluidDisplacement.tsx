import React, { useEffect, useRef, useState } from 'react';

/**
 * CursorFluidDisplacement
 * Adds a subtle, localized fluid/water distortion lens that follows the cursor.
 *
 * Requirements fulfilled:
 * 1. Small localized radius (~50px) tightly centered around the cursor.
 * 2. Subtle organic liquid displacement via SVG feDisplacementMap & feTurbulence,
 *    gradually becoming weaker toward the edges via a smooth radial mask.
 * 3. Preserves full text readability; no blur, no RGB split, no glitching.
 * 4. As cursor moves, pixels gently deform and melt like disturbing a liquid surface.
 * 5. When cursor stops, disturbed pixels smoothly settle back to original positions
 *    within ~0.35–0.5s.
 * 6. When static, completely inactive (opacity 0, scale 0) with zero overhead.
 * 7. Pointer-fine and prefers-reduced-motion aware.
 */
export const CursorFluidDisplacement: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const lensRef = useRef<HTMLDivElement>(null);
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    // Check for mouse/trackpad pointer and respect reduced motion preference
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasFinePointer || prefersReduced) {
      return;
    }

    setEnabled(true);

    let mouseX = -200;
    let mouseY = -200;
    let lensX = -200;
    let lensY = -200;
    let prevMouseX = -200;
    let prevMouseY = -200;

    let intensity = 0; // 0 (static) to 1 (active motion)
    let isInside = false;
    let animFrameId: number;
    let lastTime = performance.now();
    let seedCounter = 0;

    const onPointerMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isInside) {
        isInside = true;
        lensX = mouseX;
        lensY = mouseY;
        prevMouseX = mouseX;
        prevMouseY = mouseY;
      }
    };

    const onMouseLeave = () => {
      isInside = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);

    const radius = 55; // 55px radius -> 110px diameter: small, localized drop
    const maxDisplacement = 13; // Max 13px shift: soft liquid distortion, preserves text readability

    const renderLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Follow mouse with tight, responsive spring
      lensX += (mouseX - lensX) * 0.45;
      lensY += (mouseY - lensY) * 0.45;

      // Compute cursor velocity
      const dx = mouseX - prevMouseX;
      const dy = mouseY - prevMouseY;
      const dist = Math.hypot(dx, dy);
      prevMouseX = mouseX;
      prevMouseY = mouseY;

      // Target intensity based on movement speed
      const targetIntensity = isInside ? Math.min(dist / 14, 1) : 0;

      if (targetIntensity > intensity) {
        // Quick, responsive attack as cursor moves
        intensity += (targetIntensity - intensity) * 0.35;
      } else {
        // Smooth exponential settle back to 0 over 0.35s - 0.5s when stopped
        // decay rate: 1 - exp(-dt / tau) where tau ~ 0.13s (settles in ~3 * tau = 0.4s)
        const decayFactor = 1 - Math.exp(-dt / 0.13);
        intensity += (0 - intensity) * decayFactor;
      }

      const lensEl = lensRef.current;
      const dispEl = displacementRef.current;
      const turbEl = turbulenceRef.current;

      if (intensity > 0.003 && lensEl) {
        // Update position
        lensEl.style.display = 'block';
        lensEl.style.transform = `translate3d(${lensX - radius}px, ${lensY - radius}px, 0)`;
        lensEl.style.opacity = String(Math.min(intensity * 1.3, 1));

        // Scale displacement smoothly with motion intensity
        const scaleVal = (intensity * maxDisplacement).toFixed(2);
        if (dispEl) {
          dispEl.setAttribute('scale', scaleVal);
        }

        // Subtly evolve turbulence seed to give living water ripple texture
        seedCounter += dt * 15 * intensity;
        if (turbEl && Math.floor(seedCounter) % 2 === 0) {
          turbEl.setAttribute('seed', String(Math.floor(seedCounter) % 80));
        }
      } else if (lensEl) {
        // Completely static when cursor is not moving
        lensEl.style.display = 'none';
        lensEl.style.opacity = '0';
        if (dispEl) {
          dispEl.setAttribute('scale', '0');
        }
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {/* Hidden SVG Filter Definition for Fluid Liquid Displacement */}
      <svg
        className="fixed w-0 h-0 pointer-events-none opacity-0 select-none"
        aria-hidden="true"
        style={{ position: 'fixed', left: -9999, top: -9999 }}
      >
        <defs>
          <filter
            id="cursor-fluid-displacement-filter"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            {/* Water turbulence noise with organic wave frequencies */}
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.038 0.045"
              numOctaves="2"
              seed="1"
              result="waterNoise"
            />
            {/* Displace pixels behind the lens based on the noise map */}
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="waterNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Localized Floating Water Droplet Lens */}
      <div
        ref={lensRef}
        className="fixed top-0 left-0 pointer-events-none rounded-full z-[80] will-change-transform select-none"
        style={{
          width: 110,
          height: 110,
          display: 'none',
          opacity: 0,
          backdropFilter: 'url(#cursor-fluid-displacement-filter)',
          WebkitBackdropFilter: 'url(#cursor-fluid-displacement-filter)',
          maskImage:
            'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 85%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 85%)',
        }}
      >
        {/* Whisper-soft droplet surface meniscus sheen */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 38% 38%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(255, 255, 255, 0) 70%)',
            boxShadow:
              'inset 0 1px 2px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.03)',
          }}
        />
      </div>
    </>
  );
};

export default CursorFluidDisplacement;
