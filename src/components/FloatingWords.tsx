import React, { useEffect, useRef } from 'react';
import { useTransition } from '../context/TransitionContext';

export interface FloatingWordDef {
  readonly id: string;
  readonly text: string;
  readonly styleType: 'sans' | 'serif' | 'handwriting';
  readonly depth: 'near' | 'mid' | 'far';
  readonly color?: 'default' | 'cyan' | 'coral';
  readonly baseRotation: number;
  readonly position: {
    readonly top?: string;
    readonly bottom?: string;
    readonly left?: string;
    readonly right?: string;
  };
  readonly duration: number; // in seconds
  readonly delay: number; // in seconds
  readonly animVariant: 'A' | 'B' | 'C' | 'D';
  readonly deviceTier: 'all' | 'tablet-up' | 'desktop-only';
}

/**
 * Editorial floating words distributed around viewport perimeter.
 * Carefully positioned away from the central editorial focus zone.
 */
const FLOATING_WORDS: readonly FloatingWordDef[] = [
  // --- TOP LEFT ---
  {
    id: 'w-systems',
    text: 'SYSTEMS',
    styleType: 'sans',
    depth: 'mid',
    baseRotation: -2,
    position: { top: '12%', left: '10%' },
    duration: 11,
    delay: -1.5,
    animVariant: 'A',
    deviceTier: 'all',
  },
  {
    id: 'w-ideas',
    text: 'ideas',
    styleType: 'handwriting',
    depth: 'near',
    baseRotation: 4,
    position: { top: '21%', left: '20%' },
    duration: 8.5,
    delay: -3.2,
    animVariant: 'B',
    deviceTier: 'tablet-up',
  },
  {
    id: 'w-code',
    text: 'CODE',
    styleType: 'sans',
    depth: 'far',
    baseRotation: -1,
    position: { top: '32%', left: '14%' },
    duration: 13,
    delay: -4.0,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },

  // --- TOP CENTER / MID ---
  {
    id: 'w-ai',
    text: 'AI',
    styleType: 'sans',
    depth: 'far',
    baseRotation: 0,
    position: { top: '8%', left: '46%' },
    duration: 14,
    delay: -2.1,
    animVariant: 'D',
    deviceTier: 'desktop-only',
  },

  // --- TOP RIGHT ---
  {
    id: 'w-research',
    text: 'RESEARCH',
    styleType: 'serif',
    depth: 'near',
    color: 'coral',
    baseRotation: -2.5,
    position: { top: '14%', right: '12%' },
    duration: 9.5,
    delay: -0.8,
    animVariant: 'B',
    deviceTier: 'all',
  },
  {
    id: 'w-explore',
    text: 'explore',
    styleType: 'handwriting',
    depth: 'mid',
    baseRotation: 3,
    position: { top: '22%', right: '23%' },
    duration: 10,
    delay: -5.4,
    animVariant: 'A',
    deviceTier: 'tablet-up',
  },

  // --- MIDDLE LEFT ---
  {
    id: 'w-llm',
    text: 'LLM',
    styleType: 'sans',
    depth: 'far',
    baseRotation: 1.5,
    position: { top: '44%', left: '7%' },
    duration: 15,
    delay: -6.2,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },
  {
    id: 'w-engineering',
    text: 'ENGINEERING',
    styleType: 'sans',
    depth: 'mid',
    baseRotation: -1.5,
    position: { top: '57%', left: '12%' },
    duration: 12,
    delay: -3.8,
    animVariant: 'D',
    deviceTier: 'tablet-up',
  },

  // --- MIDDLE RIGHT ---
  {
    id: 'w-works',
    text: 'works',
    styleType: 'handwriting',
    depth: 'near',
    baseRotation: -4,
    position: { top: '40%', right: '16%' },
    duration: 7.8,
    delay: -1.1,
    animVariant: 'A',
    deviceTier: 'tablet-up',
  },
  {
    id: 'w-vision',
    text: 'VISION',
    styleType: 'sans',
    depth: 'near',
    color: 'cyan',
    baseRotation: 1,
    position: { top: '53%', right: '9%' },
    duration: 11,
    delay: -4.7,
    animVariant: 'B',
    deviceTier: 'all',
  },

  // --- BOTTOM LEFT ---
  {
    id: 'w-rag',
    text: 'RAG',
    styleType: 'sans',
    depth: 'far',
    color: 'cyan',
    baseRotation: -2,
    position: { bottom: '26%', left: '13%' },
    duration: 13.5,
    delay: -2.9,
    animVariant: 'D',
    deviceTier: 'desktop-only',
  },
  {
    id: 'w-build',
    text: 'build',
    styleType: 'handwriting',
    depth: 'near',
    baseRotation: -4,
    position: { bottom: '15%', left: '19%' },
    duration: 9,
    delay: -0.4,
    animVariant: 'B',
    deviceTier: 'all',
  },

  // --- BOTTOM CENTER / MID ---
  {
    id: 'w-opensource',
    text: 'OPEN SOURCE',
    styleType: 'sans',
    depth: 'far',
    baseRotation: 0.5,
    position: { bottom: '10%', left: '42%' },
    duration: 14.5,
    delay: -7.0,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },

  // --- BOTTOM RIGHT ---
  {
    id: 'w-digital',
    text: 'DIGITAL',
    styleType: 'serif',
    depth: 'near',
    baseRotation: -1.8,
    position: { bottom: '19%', right: '11%' },
    duration: 8.8,
    delay: -2.3,
    animVariant: 'A',
    deviceTier: 'all',
  },
  {
    id: 'w-network',
    text: 'NETWORK',
    styleType: 'sans',
    depth: 'mid',
    color: 'coral',
    baseRotation: 2,
    position: { bottom: '28%', right: '20%' },
    duration: 12.5,
    delay: -5.1,
    animVariant: 'D',
    deviceTier: 'tablet-up',
  },
  {
    id: 'w-hello',
    text: 'hello',
    styleType: 'handwriting',
    depth: 'mid',
    baseRotation: 3.5,
    position: { bottom: '11%', right: '26%' },
    duration: 9.2,
    delay: -1.8,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },
];

export interface FloatingWordsProps {
  readonly className?: string;
}

/**
 * FloatingWords
 * Reusable secondary floating typography creating layered ambient motion.
 * - Scattered non-grid layout around viewport perimeter
 * - Multi-depth (near / mid / far) with subtle blur and opacity hierarchy
 * - Independent asynchronous floating animations (7s to 15s)
 * - Mouse parallax micro-shift on desktop (disabled on touch/mobile)
 * - Coordinated page entrance and exit with TransitionContext
 * - Clear center clearance: words never overlap central editorial content
 */
export const FloatingWords: React.FC<FloatingWordsProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { phase } = useTransition();

  const isTransitioning = phase === 'closing' || phase === 'redirecting';

  // Desktop subtle mouse parallax (zero React re-render, strictly GPU-bound via CSS vars)
  useEffect(() => {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasFinePointer || prefersReduced || !containerRef.current) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;

    const onPointerMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth) - 0.5;
      targetY = (e.clientY / window.innerHeight) - 0.5;
    };

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (containerRef.current) {
        // Near items shift by ~6px, far items shift by ~2px
        containerRef.current.style.setProperty('--mouse-near-x', `${(currentX * 12).toFixed(2)}px`);
        containerRef.current.style.setProperty('--mouse-near-y', `${(currentY * 10).toFixed(2)}px`);
        containerRef.current.style.setProperty('--mouse-far-x', `${(currentX * 4).toFixed(2)}px`);
        containerRef.current.style.setProperty('--mouse-far-y', `${(currentY * 3).toFixed(2)}px`);
      }
      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    rafId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none select-none z-15 overflow-hidden transition-all duration-500 ease-out ${
        isTransitioning
          ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          : 'opacity-100 scale-100 translate-y-0'
      } ${className}`}
      style={{
        // Default zero CSS vars for parallax
        ['--mouse-near-x' as string]: '0px',
        ['--mouse-near-y' as string]: '0px',
        ['--mouse-far-x' as string]: '0px',
        ['--mouse-far-y' as string]: '0px',
      }}
    >
      {FLOATING_WORDS.map((item) => {
        // Device tier responsive visibility classes
        const tierClasses =
          item.deviceTier === 'desktop-only'
            ? 'hidden lg:block'
            : item.deviceTier === 'tablet-up'
            ? 'hidden md:block'
            : 'block';

        // Typography styling by styleType
        const typeClasses =
          item.styleType === 'sans'
            ? 'font-sans uppercase text-[10px] md:text-[11px] font-medium tracking-[0.24em]'
            : item.styleType === 'serif'
            ? 'font-editorial italic text-xs md:text-sm tracking-wider font-normal'
            : 'font-handwriting text-sm md:text-base font-normal tracking-wide';

        // Depth styles (opacity, subtle blur, font scale)
        let depthClasses = '';
        let parallaxVar = '--mouse-near';
        if (item.depth === 'far') {
          depthClasses = 'opacity-30 blur-[0.8px] text-[10px]';
          parallaxVar = '--mouse-far';
        } else if (item.depth === 'mid') {
          depthClasses = 'opacity-50 blur-0';
          parallaxVar = '--mouse-near';
        } else {
          // near
          depthClasses = 'opacity-75 blur-0';
          parallaxVar = '--mouse-near';
        }

        // Palette styling: mostly primary text with subtle opacity, few accents
        let colorClasses = 'text-[#1A1A1A]';
        if (item.color === 'cyan') {
          colorClasses = 'text-[#7EC9DB] font-semibold';
        } else if (item.color === 'coral') {
          colorClasses = 'text-[#E04D3E] font-semibold';
        }

        const animClass = `animate-float-drift-${item.animVariant.toLowerCase()}`;

        return (
          <div
            key={item.id}
            className={`absolute ${tierClasses}`}
            style={{
              top: item.position.top,
              bottom: item.position.bottom,
              left: item.position.left,
              right: item.position.right,
            }}
          >
            {/* Parallax Wrapper */}
            <div
              style={{
                transform: `translate3d(var(${parallaxVar}-x, 0px), var(${parallaxVar}-y, 0px), 0)`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              {/* Floating Animation Item */}
              <div
                className={`${typeClasses} ${depthClasses} ${colorClasses} ${animClass} whitespace-nowrap will-change-transform`}
                style={{
                  animationDuration: `${item.duration}s`,
                  animationDelay: `${item.delay}s`,
                  ['--base-rot' as string]: `${item.baseRotation}deg`,
                  transform: `rotate(${item.baseRotation}deg)`,
                }}
              >
                {item.text}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FloatingWords;
