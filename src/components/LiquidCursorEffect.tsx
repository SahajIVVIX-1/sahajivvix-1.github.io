import React, { useEffect, useRef } from 'react';

/**
 * LiquidCursorEffect
 * Creates a subtle liquid-flow / underwater displacement effect directly attached to the cursor.
 *
 * Characteristics:
 * - Tiny affected area (~56px diameter), directly surrounding the cursor.
 * - Any content underneath the cursor (letters, words, icons, shapes, lines) is gently
 *   displaced in the direction of cursor velocity.
 * - When stationary, displacement decays to 0 (no motion while resting).
 * - As the cursor moves away, elements organically spring back to their original positions
 *   via fluid dampening physics (no CSS animations).
 * - Completely invisible boundary: no circles, lines, borders, glows, or tinting.
 * - Highly performant 60/120fps requestAnimationFrame physics loop.
 */

interface LiquidItem {
  element: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  baseTransform: string;
}

export const LiquidCursorEffect: React.FC = () => {
  const lensRef = useRef<HTMLDivElement>(null);
  const dispMapRef = useRef<SVGFEDisplacementMapElement>(null);
  const turbRef = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    // Disable on touch-only devices or if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;

    if (prefersReducedMotion || isTouchOnly) {
      return;
    }

    const maxRadius = 54; // Small radius (54px)
    let mouseX = -100;
    let mouseY = -100;
    let prevMouseX = -100;
    let prevMouseY = -100;
    let speed = 0;
    let velocityX = 0;
    let velocityY = 0;
    let currentFilterScale = 0;
    let isMouseInside = false;

    const activeItems = new Map<HTMLElement, LiquidItem>();
    let animationFrameId: number;

    const onMouseMove = (e: MouseEvent) => {
      isMouseInside = true;
      const curX = e.clientX;
      const curY = e.clientY;

      if (prevMouseX === -100) {
        prevMouseX = curX;
        prevMouseY = curY;
      }

      velocityX = curX - prevMouseX;
      velocityY = curY - prevMouseY;
      speed = Math.hypot(velocityX, velocityY);

      mouseX = curX;
      mouseY = curY;
      prevMouseX = curX;
      prevMouseY = curY;

      // Only apply new fluid impulse if cursor is genuinely moving
      if (speed > 0.4) {
        inspectAndPushElements(curX, curY, velocityX, velocityY);
      }
    };

    const onMouseLeave = () => {
      isMouseInside = false;
      speed = 0;
      velocityX = 0;
      velocityY = 0;
    };

    /**
     * Inspect elements directly underneath/near the moving cursor
     */
    const inspectAndPushElements = (cx: number, cy: number, vx: number, vy: number) => {
      // Sample localized points around the cursor
      const samplePoints: [number, number][] = [
        [cx, cy],
        [cx - 18, cy],
        [cx + 18, cy],
        [cx, cy - 18],
        [cx, cy + 18],
        [cx - 12, cy - 12],
        [cx + 12, cy + 12],
      ];

      const elementsToDisplace = new Set<HTMLElement>();

      for (const [px, py] of samplePoints) {
        if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) continue;

        const stack = document.elementsFromPoint(px, py);
        for (const el of stack) {
          if (!(el instanceof HTMLElement)) continue;

          // Skip root, body, html, fixed navigation bars, fixed full-screen curtains, and lens
          if (
            el === document.body ||
            el === document.documentElement ||
            el.id === 'root' ||
            el.classList.contains('liquid-lens-container') ||
            el.classList.contains('butterfly-curtain') ||
            el.classList.contains('transition-curtain-left') ||
            el.classList.contains('transition-curtain-right') ||
            el.tagName.toLowerCase() === 'svg' && el.classList.contains('fixed')
          ) {
            continue;
          }

          // Prioritize granular leaf elements: spans, links, buttons, icons, headings, badges
          // If the element has element children, let's look for child spans/elements
          const isLeaf = el.children.length === 0 || el.tagName.toLowerCase() === 'span' || el.tagName.toLowerCase() === 'a' || el.tagName.toLowerCase() === 'button';

          if (isLeaf) {
            elementsToDisplace.add(el);
            break; // Stop at the topmost granular leaf element
          }
        }
      }

      // Calculate localized physical water displacement for each element
      elementsToDisplace.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const elCenterX = rect.left + rect.width / 2;
        const elCenterY = rect.top + rect.height / 2;

        const dist = Math.hypot(elCenterX - cx, elCenterY - cy);
        if (dist > maxRadius) return;

        // Smooth cubic falloff: 1 at center, 0 at boundary with 0 derivative
        const u = dist / maxRadius;
        const weight = (1 - u * u) * (1 - u * u);

        // Subtle water drag in movement direction (max 3.5px displacement)
        const pushMag = Math.min(speed * 0.18 * weight, 3.5);
        const normVx = vx / (speed || 1);
        const normVy = vy / (speed || 1);

        const pushX = normVx * pushMag;
        const pushY = normVy * pushMag;

        let item = activeItems.get(el);
        if (!item) {
          // Store existing computed transform before manipulating
          const baseTransform = el.style.transform || '';
          item = {
            element: el,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            targetX: 0,
            targetY: 0,
            baseTransform,
          };
          activeItems.set(el, item);
        }

        // Add soft push with gentle damping
        item.targetX = Math.max(-4.5, Math.min(4.5, item.targetX + pushX));
        item.targetY = Math.max(-4.5, Math.min(4.5, item.targetY + pushY));
        item.vx += pushX * 0.4;
        item.vy += pushY * 0.4;
      });
    };

    /**
     * Physics simulation loop: updates spring physics and restores original positions
     */
    const renderLoop = () => {
      // 1. Update Lens Position and Optical Refraction
      if (lensRef.current) {
        if (isMouseInside && mouseX >= 0) {
          lensRef.current.style.transform = `translate3d(${mouseX - 28}px, ${mouseY - 28}px, 0)`;
          lensRef.current.style.opacity = '1';
        } else {
          lensRef.current.style.opacity = '0';
        }
      }

      // Smooth decay of optical scale when stationary
      const targetScale = isMouseInside ? Math.min(speed * 0.28, 6.0) : 0;
      currentFilterScale += (targetScale - currentFilterScale) * 0.22;

      if (dispMapRef.current) {
        dispMapRef.current.setAttribute('scale', currentFilterScale.toFixed(2));
      }

      // Decay speed per frame if no new mouse events fired
      speed *= 0.82;
      velocityX *= 0.82;
      velocityY *= 0.82;

      // 2. Update Physical Fluid Displacement on Active Elements
      const springStiffness = 0.18;
      const fluidDamping = 0.74; // Organic underwater fluid settling

      activeItems.forEach((item, el) => {
        // Target smoothly relaxes to 0
        item.targetX *= 0.86;
        item.targetY *= 0.86;

        // Spring acceleration toward target (eventually 0)
        const ax = (item.targetX - item.x) * springStiffness - item.vx * fluidDamping;
        const ay = (item.targetY - item.y) * springStiffness - item.vy * fluidDamping;

        item.vx += ax;
        item.vy += ay;
        item.x += item.vx;
        item.y += item.vy;

        // Check if element has organically settled back to rest position
        const isSettled =
          Math.abs(item.x) < 0.04 &&
          Math.abs(item.y) < 0.04 &&
          Math.abs(item.vx) < 0.04 &&
          Math.abs(item.vy) < 0.04 &&
          Math.abs(item.targetX) < 0.04 &&
          Math.abs(item.targetY) < 0.04;

        if (isSettled) {
          // Restore exact original state
          el.style.transform = item.baseTransform;
          if (!item.baseTransform) {
            el.style.removeProperty('transform');
          }
          el.style.removeProperty('will-change');
          activeItems.delete(el);
        } else {
          // Apply subtle physical fluid displacement
          el.style.willChange = 'transform';
          const dispTransform = `translate3d(${item.x.toFixed(2)}px, ${item.y.toFixed(2)}px, 0)`;
          el.style.transform = item.baseTransform ? `${item.baseTransform} ${dispTransform}` : dispTransform;
        }
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
    animationFrameId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(animationFrameId);

      // Clean up any remaining displaced elements on unmount
      activeItems.forEach((item, el) => {
        el.style.transform = item.baseTransform;
        if (!item.baseTransform) {
          el.style.removeProperty('transform');
        }
        el.style.removeProperty('will-change');
      });
      activeItems.clear();
    };
  }, []);

  return (
    <>
      {/* Hidden SVG Filter for localized optical underwater micro-refraction */}
      <svg
        className="fixed w-0 h-0 pointer-events-none overflow-hidden select-none -z-50"
        aria-hidden="true"
      >
        <defs>
          <filter
            id="liquid-cursor-lens"
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
            filterUnits="userSpaceOnUse"
          >
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0.042"
              numOctaves="2"
              result="fluidNoise"
            />
            <feDisplacementMap
              ref={dispMapRef}
              in="SourceGraphic"
              in2="fluidNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Localized Floating Water Lens
          - Exactly attached to cursor (56px x 56px, radius 28px)
          - Completely invisible boundary: no border, no outline, no background, no shadow
          - Soft feathered radial gradient mask ensures the perimeter dissolves seamlessly
          - Pointer-events none: never interrupts clicks, hover states, or selection
      */}
      <div
        ref={lensRef}
        aria-hidden="true"
        className="liquid-lens-container pointer-events-none fixed top-0 left-0 w-[56px] h-[56px] rounded-full z-50 transition-opacity duration-200"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          backdropFilter: 'url(#liquid-cursor-lens)',
          WebkitBackdropFilter: 'url(#liquid-cursor-lens)',
          maskImage: 'radial-gradient(circle at center, black 0%, black 20%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, black 20%, transparent 68%)',
          willChange: 'transform, opacity',
          transform: 'translate3d(-200px, -200px, 0)',
          opacity: 0,
        }}
      />
    </>
  );
};

export default LiquidCursorEffect;
