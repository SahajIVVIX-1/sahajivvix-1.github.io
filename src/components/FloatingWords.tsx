import React, { useEffect, useRef, useState } from 'react';
import { useTransition } from '../context/TransitionContext';

export interface PerimeterSlot {
  readonly id: string;
  readonly depth: 'near' | 'mid' | 'far';
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

export interface FontArchetype {
  readonly id: string;
  readonly name: string;
  readonly classes: string;
  readonly tracking: string;
}

/**
 * 7 distinct, refined typographic personalities.
 * Optical sizing and weight are strictly unified across all fonts
 * so transitions stay subtle, calm, and seamless without attracting sudden attention.
 */
const FONT_ARCHETYPES: readonly FontArchetype[] = [
  {
    id: 'editorial-serif-italic',
    name: 'Playfair Display Italic',
    classes: 'font-editorial italic font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-[0.02em]',
  },
  {
    id: 'cormorant-literary',
    name: 'Cormorant Garamond Italic',
    classes: 'font-cormorant italic font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-[0.02em]',
  },
  {
    id: 'syne-avantgarde',
    name: 'Syne Modern Geometric',
    classes: 'font-syne font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-[0.02em]',
  },
  {
    id: 'geometric-sans',
    name: 'Plus Jakarta Sans',
    classes: 'font-sans font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-[0.02em]',
  },
  {
    id: 'space-mono',
    name: 'Space Mono',
    classes: 'font-space-mono font-normal text-xs md:text-[12px] leading-none',
    tracking: 'tracking-normal',
  },
  {
    id: 'handwriting-script',
    name: 'Caveat Cursive',
    classes: 'font-handwriting font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-normal',
  },
  {
    id: 'editorial-serif-upright',
    name: 'Playfair Display Book',
    classes: 'font-editorial font-normal text-xs md:text-[13px] leading-none',
    tracking: 'tracking-normal',
  },
];

export interface WordDefinition {
  readonly text: string;
  readonly color?: 'default' | 'cyan' | 'coral';
}

/**
 * 16 fixed perimeter locations around the viewport edges,
 * keeping the central editorial frame clear and pristine.
 */
const PERIMETER_SLOTS: readonly PerimeterSlot[] = [
  // --- TOP LEFT ---
  {
    id: 'slot-tl-1',
    depth: 'mid',
    baseRotation: -2,
    position: { top: '12%', left: '10%' },
    duration: 11,
    delay: -1.5,
    animVariant: 'A',
    deviceTier: 'all',
  },
  {
    id: 'slot-tl-2',
    depth: 'near',
    baseRotation: 4,
    position: { top: '21%', left: '20%' },
    duration: 8.5,
    delay: -3.2,
    animVariant: 'B',
    deviceTier: 'tablet-up',
  },
  {
    id: 'slot-tl-3',
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
    id: 'slot-tc-1',
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
    id: 'slot-tr-1',
    depth: 'near',
    baseRotation: -2.5,
    position: { top: '14%', right: '12%' },
    duration: 9.5,
    delay: -0.8,
    animVariant: 'B',
    deviceTier: 'all',
  },
  {
    id: 'slot-tr-2',
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
    id: 'slot-ml-1',
    depth: 'far',
    baseRotation: 1.5,
    position: { top: '44%', left: '7%' },
    duration: 15,
    delay: -6.2,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },
  {
    id: 'slot-ml-2',
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
    id: 'slot-mr-1',
    depth: 'near',
    baseRotation: -4,
    position: { top: '40%', right: '16%' },
    duration: 7.8,
    delay: -1.1,
    animVariant: 'A',
    deviceTier: 'tablet-up',
  },
  {
    id: 'slot-mr-2',
    depth: 'near',
    baseRotation: 1,
    position: { top: '53%', right: '9%' },
    duration: 11,
    delay: -4.7,
    animVariant: 'B',
    deviceTier: 'all',
  },

  // --- BOTTOM LEFT ---
  {
    id: 'slot-bl-1',
    depth: 'far',
    baseRotation: -2,
    position: { bottom: '26%', left: '13%' },
    duration: 13.5,
    delay: -2.9,
    animVariant: 'D',
    deviceTier: 'desktop-only',
  },
  {
    id: 'slot-bl-2',
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
    id: 'slot-bc-1',
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
    id: 'slot-br-1',
    depth: 'near',
    baseRotation: -1.8,
    position: { bottom: '19%', right: '11%' },
    duration: 8.8,
    delay: -2.3,
    animVariant: 'A',
    deviceTier: 'all',
  },
  {
    id: 'slot-br-2',
    depth: 'mid',
    baseRotation: 2,
    position: { bottom: '28%', right: '20%' },
    duration: 12.5,
    delay: -5.1,
    animVariant: 'D',
    deviceTier: 'tablet-up',
  },
  {
    id: 'slot-br-3',
    depth: 'mid',
    baseRotation: 3.5,
    position: { bottom: '11%', right: '26%' },
    duration: 9.2,
    delay: -1.8,
    animVariant: 'C',
    deviceTier: 'desktop-only',
  },
];

/**
 * Curated Master Vocabulary from AI, Software Engineering & Computer Science.
 * ZERO all-caps words! Only Title Case or lowercase cursive.
 */
const AI_AND_SWE_VOCABULARY: readonly WordDefinition[] = [
  // --- Artificial Intelligence & Machine Learning ---
  { text: 'Transformer' },
  { text: 'Latent Space', color: 'cyan' },
  { text: 'Attention' },
  { text: 'Embeddings' },
  { text: 'Diffusion' },
  { text: 'Agentic', color: 'coral' },
  { text: 'Neural Net' },
  { text: 'Inference' },
  { text: 'Weights' },
  { text: 'Rag Pipeline', color: 'cyan' },
  { text: 'Llm Engine' },
  { text: 'Multimodal' },
  { text: 'Tokenizer' },
  { text: 'Tensor Graph' },
  { text: 'Backpropagation' },
  { text: 'Foundation Model' },
  { text: 'Deep Learning' },
  { text: 'Computer Vision' },
  { text: 'Reinforcement' },
  { text: 'Context Window' },
  { text: 'Fine Tuning' },
  { text: 'Neural Networks' },
  { text: 'Generative Ai' },
  { text: 'Autonomous Agents', color: 'coral' },
  { text: 'Deep Logic' },
  { text: 'Latent Dimensions', color: 'cyan' },

  // --- Cursive & Handwritten AI Concepts ---
  { text: 'gradient descent ~' },
  { text: 'latent space ~' },
  { text: 'vector embeddings' },
  { text: 'agentic workflows' },
  { text: 'attention heads' },
  { text: 'synthetic data' },
  { text: 'neural logic ~' },

  // --- Software Engineering & Systems Architecture ---
  { text: 'Distributed' },
  { text: 'Concurrency' },
  { text: 'Microservices', color: 'cyan' },
  { text: 'Algorithm' },
  { text: 'Pipeline' },
  { text: 'Optimization' },
  { text: 'Compiler' },
  { text: 'Event Driven' },
  { text: 'High Performance' },
  { text: 'Low Latency', color: 'coral' },
  { text: 'System Design' },
  { text: 'Data Structures' },
  { text: 'Kubernetes' },
  { text: 'Benchmark' },
  { text: 'Infrastructure' },
  { text: 'Scalability' },
  { text: 'Heuristics' },
  { text: 'Asynchronous' },
  { text: 'Fault Tolerance' },
  { text: 'Cache Coherency' },
  { text: 'Parallelism' },
  { text: 'Zero Latency' },
  { text: 'System Architecture' },
  { text: 'Algorithmic Proofs' },
  { text: 'Distributed Consensus', color: 'cyan' },
  { text: 'High Availability' },

  // --- Cursive & Handwritten Software Engineering Concepts ---
  { text: 'clean code ~' },
  { text: 'event loops' },
  { text: 'pure functions' },
  { text: 'distributed state' },
  { text: 'async await ~' },
  { text: 'parallel threads' },
  { text: 'cache layers' },
  { text: 'clean pipelines' },

  // --- Fields & Emerging Tech Domains ---
  { text: 'Robotics' },
  { text: 'Quantum Logic' },
  { text: 'Cybernetics' },
  { text: 'Cryptography' },
  { text: 'Bioinformatics' },
  { text: 'Computational Theory' },
  { text: 'Automata Theory' },
  { text: 'formal methods ~' },
];

/**
 * Randomly sample N items from an array without replacement
 */
function sampleRandomWords(count: number): WordDefinition[] {
  const pool = [...AI_AND_SWE_VOCABULARY];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }
  return pool.slice(0, count);
}

interface MorphingWordSlotProps {
  readonly slot: PerimeterSlot;
  readonly word: WordDefinition;
  readonly slotIndex: number;
}

/**
 * MorphingWordSlot
 * Renders an individual word with true optical shape-morphing between font forms.
 * Uses a ping-pong dual-layer buffer so transitions are 100% flicker-free:
 * - One layer dissolves from 1 to 0 while the other layer emerges from 0 to 1 over 2.2s.
 * - No instant state resets; layers alternately assume the new font forms.
 * - Each word operates on its own independent 15 to 20 second schedule (not all at once).
 */
const MorphingWordSlot: React.FC<MorphingWordSlotProps> = ({ slot, word, slotIndex }) => {
  // Initial font indices
  const initialFont0 = (slotIndex * 2) % FONT_ARCHETYPES.length;
  const initialFont1 = (slotIndex * 2 + 1) % FONT_ARCHETYPES.length;

  // Active layer indicator: 0 means Layer 0 is visible; 1 means Layer 1 is visible
  const [activeLayer, setActiveLayer] = useState<0 | 1>(0);
  const [fonts, setFonts] = useState<[number, number]>([initialFont0, initialFont1]);

  // Keep live refs to avoid stale closure re-renders
  const activeLayerRef = useRef<0 | 1>(0);
  activeLayerRef.current = activeLayer;
  const fontsRef = useRef<[number, number]>([initialFont0, initialFont1]);
  fontsRef.current = fonts;

  // Independent randomized timer: each word stays in its font for 15-20 seconds
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    let isCancelled = false;
    let timerId: NodeJS.Timeout;

    // Organic initial stagger across perimeter (10s to 45s) so words never change all at once
    const initialDelay = 10000 + ((slotIndex * 3700) % 35000) + Math.floor(Math.random() * 5000);

    const triggerMorph = () => {
      if (isCancelled) return;

      const currentVisible = activeLayerRef.current;
      const targetLayer = currentVisible === 0 ? 1 : 0;
      const currentFont = fontsRef.current[currentVisible];

      // Pick a random new font distinct from current
      const availableIndices: number[] = [];
      for (let i = 0; i < FONT_ARCHETYPES.length; i++) {
        if (i !== currentFont) {
          availableIndices.push(i);
        }
      }
      const randomNewFont =
        availableIndices[Math.floor(Math.random() * availableIndices.length)];

      // 1. Assign the new font to the currently invisible target layer
      setFonts((prev) => {
        const nextFonts: [number, number] = [...prev];
        nextFonts[targetLayer] = randomNewFont;
        return nextFonts;
      });

      // 2. In the next frame, flip active layer to initiate smooth, seamless 3.6s cross-fade
      requestAnimationFrame(() => {
        if (isCancelled) return;
        setActiveLayer(targetLayer);
      });

      // 3. Schedule next morph within 38 to 60 seconds (calm, never distracting)
      const nextStayDuration = 38000 + Math.floor(Math.random() * 22000);
      timerId = setTimeout(triggerMorph, nextStayDuration);
    };

    timerId = setTimeout(triggerMorph, initialDelay);

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
    };
  }, [slotIndex]);

  // Responsive device visibility
  const tierClasses =
    slot.deviceTier === 'desktop-only'
      ? 'hidden lg:block'
      : slot.deviceTier === 'tablet-up'
      ? 'hidden md:block'
      : 'block';

  // Depth styles
  let depthClasses = '';
  let parallaxVar = '--mouse-near';
  if (slot.depth === 'far') {
    depthClasses = 'opacity-30 text-[10px]';
    parallaxVar = '--mouse-far';
  } else if (slot.depth === 'mid') {
    depthClasses = 'opacity-55';
    parallaxVar = '--mouse-near';
  } else {
    depthClasses = 'opacity-80';
    parallaxVar = '--mouse-near';
  }

  // Accent colors
  let colorClasses = 'text-[#1A1A1A]';
  if (word.color === 'cyan') {
    colorClasses = 'text-[#7EC9DB] font-semibold';
  } else if (word.color === 'coral') {
    colorClasses = 'text-[#E04D3E] font-semibold';
  }

  const animClass = `animate-float-drift-${slot.animVariant.toLowerCase()}`;
  const archetype0 = FONT_ARCHETYPES[fonts[0]];
  const archetype1 = FONT_ARCHETYPES[fonts[1]];

  return (
    <div
      className={`absolute ${tierClasses}`}
      style={{
        top: slot.position.top,
        bottom: slot.position.bottom,
        left: slot.position.left,
        right: slot.position.right,
      }}
    >
      {/* Parallax Wrapper */}
      <div
        style={{
          transform: `translate3d(var(${parallaxVar}-x, 0px), var(${parallaxVar}-y, 0px), 0)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Floating Ambient Animation Container */}
        <div
          className={`${animClass} whitespace-nowrap will-change-transform`}
          style={{
            animationDuration: `${slot.duration}s`,
            animationDelay: `${slot.delay}s`,
            ['--base-rot' as string]: `${slot.baseRotation}deg`,
            transform: `rotate(${slot.baseRotation}deg)`,
          }}
        >
          {/* Dual-Layer Optical Font-Shape Morphing Stack (Grid aligned, zero layout jumps) */}
          <span
            className={`inline-grid grid-cols-1 grid-rows-1 place-items-center select-none ${depthClasses} ${colorClasses}`}
          >
            {/* Layer 0 */}
            <span
              className={`col-start-1 row-start-1 inline-block whitespace-nowrap ${archetype0.classes} ${archetype0.tracking} will-change-[opacity,filter]`}
              style={{
                transition:
                  'opacity 3600ms cubic-bezier(0.4, 0, 0.2, 1), filter 3600ms cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: activeLayer === 0 ? 1 : 0,
                filter: activeLayer === 0 ? 'blur(0px)' : 'blur(1px)',
                pointerEvents: activeLayer === 0 ? 'auto' : 'none',
              }}
            >
              {word.text}
            </span>

            {/* Layer 1 */}
            <span
              aria-hidden={activeLayer !== 1}
              className={`col-start-1 row-start-1 inline-block whitespace-nowrap ${archetype1.classes} ${archetype1.tracking} will-change-[opacity,filter]`}
              style={{
                transition:
                  'opacity 3600ms cubic-bezier(0.4, 0, 0.2, 1), filter 3600ms cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: activeLayer === 1 ? 1 : 0,
                filter: activeLayer === 1 ? 'blur(0px)' : 'blur(1px)',
                pointerEvents: activeLayer === 1 ? 'auto' : 'none',
              }}
            >
              {word.text}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export interface FloatingWordsProps {
  readonly className?: string;
}

/**
 * FloatingWords
 * Ambient background typography scattered around viewport perimeter.
 * - Words strictly from AI, Software Engineering & Computer Science fields.
 * - ZERO all-caps: only Title Case or lowercase cursive.
 * - Smooth font-shape morphing: letters seamlessly melt and reshape into new font forms.
 * - Navigation sync: word swaps only occur in the background when opacity is 0 behind the butterfly curtain.
 */
export const FloatingWords: React.FC<FloatingWordsProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { phase } = useTransition();

  // Active random words assigned to slots
  const [activeWords, setActiveWords] = useState<WordDefinition[]>(() =>
    sampleRandomWords(PERIMETER_SLOTS.length)
  );

  // Hidden state: true during navigation curtain closing or external redirecting.
  // As butterflies transition outside (phase === 'opening'), the background words smoothly come up.
  const isHidden = phase === 'closing' || phase === 'redirecting';

  // Timer ref to ensure route transition swaps happen strictly when opacity has reached 0 in background
  const swapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPhaseRef = useRef<string>(phase);

  // Handle route transition swapping strictly in invisible background
  useEffect(() => {
    if (phase === 'closing' || phase === 'redirecting') {
      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
      }
      // Swap words after 240ms when opacity is guaranteed 0 behind the closing curtain
      swapTimerRef.current = setTimeout(() => {
        setActiveWords(sampleRandomWords(PERIMETER_SLOTS.length));
      }, 240);
    } else if (phase === 'opening' && lastPhaseRef.current === 'closing') {
      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
      }
      setActiveWords(sampleRandomWords(PERIMETER_SLOTS.length));
    }

    lastPhaseRef.current = phase;

    return () => {
      if (swapTimerRef.current) {
        clearTimeout(swapTimerRef.current);
      }
    };
  }, [phase]);

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
      targetX = e.clientX / window.innerWidth - 0.5;
      targetY = e.clientY / window.innerHeight - 0.5;
    };

    const updateParallax = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (containerRef.current) {
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
      className={`fixed inset-0 pointer-events-none select-none z-[5] overflow-hidden ${
        isHidden
          ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none transition-all duration-200 ease-out'
          : 'opacity-100 scale-100 translate-y-0 transition-all duration-500 delay-150 ease-out'
      } ${className}`}
      style={{
        ['--mouse-near-x' as string]: '0px',
        ['--mouse-near-y' as string]: '0px',
        ['--mouse-far-x' as string]: '0px',
        ['--mouse-far-y' as string]: '0px',
      }}
    >
      {PERIMETER_SLOTS.map((slot, index) => {
        const word =
          activeWords[index] || AI_AND_SWE_VOCABULARY[index % AI_AND_SWE_VOCABULARY.length];
        return (
          <MorphingWordSlot
            key={slot.id}
            slot={slot}
            word={word}
            slotIndex={index}
          />
        );
      })}
    </div>
  );
};

export default FloatingWords;
