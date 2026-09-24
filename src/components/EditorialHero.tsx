import React, { useEffect, useState } from 'react';
import { useTransition } from '../context/TransitionContext';
import { RedirectDestination } from '../types/redirect';
import { isExternalRedirect } from '../config/redirects';

export interface EditorialHeroProps {
  /** Small intro/accent line (e.g. "connecting you to ~" or "hello, welcome ~") */
  readonly intro?: string;
  /** Main editorial serif heading text (e.g. "GitHub", "Hi, I'm Sahaj") */
  readonly heading: string;
  /** Subtitle line below the heading */
  readonly subtitle?: string;
  /** Supporting explanatory paragraph */
  readonly description?: string;
  /** Active redirect destination object, if rendering a redirect route */
  readonly destination?: RedirectDestination;
  /** Whether this hero is running a live redirect sequence */
  readonly isRedirecting?: boolean;
  /** Current progress percentage (0 - 100), if applicable */
  readonly progress?: number;
  /** Current status label ('PREPARING DESTINATION' | 'CONNECTING' | 'REDIRECTING' | etc.) */
  readonly statusLabel?: string;
  /** Optional interactive controls (e.g. destination pills on home page) */
  readonly children?: React.ReactNode;
}

/**
 * EditorialTitleWithLetterMovement
 * Splits the heading into individual letters with subtle, non-synchronized micro-drifts.
 * Accessible with root aria-label. Disabled under prefers-reduced-motion.
 */
export const EditorialTitleWithLetterMovement: React.FC<{
  readonly title: string;
  readonly className?: string;
}> = ({ title, className = '' }) => {
  const characters = Array.from(title);

  return (
    <h1
      aria-label={title}
      className={`font-editorial font-normal leading-[1.06] tracking-[-0.025em] text-[#1A1A1A] text-[clamp(2.75rem,8vw,5.5rem)] select-none will-change-transform ${className}`}
    >
      {characters.map((char, index) => {
        if (char === ' ') {
          return (
            <span key={index} className="inline-block">
              &nbsp;
            </span>
          );
        }

        // 4 subtle organic movement variants
        const variant = index % 4;
        const animClass = `animate-letter-${variant}`;
        const delay = (index * 0.14).toFixed(2);

        return (
          <span
            key={index}
            aria-hidden="true"
            className={`${animClass} will-change-transform`}
            style={{ animationDelay: `${delay}s` }}
          >
            {char}
          </span>
        );
      })}
    </h1>
  );
};

/**
 * EditorialProgressBar
 * Minimal editorial line with sliding circular dot (●) and subtle percentage.
 * Concept: ──────────────●────────
 */
export const EditorialProgressBar: React.FC<{
  readonly progress: number;
  readonly destinationUrl?: string;
}> = ({ progress, destinationUrl }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="w-72 sm:w-80 mx-auto pt-3 space-y-2.5 select-none">
      {/* Percentage and tracker with strong contrast */}
      <div className="flex items-center justify-between text-xs font-mono tracking-wider text-neutral-700">
        <span className="uppercase text-[11px] font-semibold tracking-widest text-neutral-700">Gateway Progress</span>
        <span className="tabular-nums font-bold text-[#1A1A1A]">
          {Math.round(clampedProgress)}%
        </span>
      </div>

      {/* High-visibility track */}
      <div className="relative w-full h-[4px] bg-neutral-200 rounded-full overflow-visible">
        {/* Fill line */}
        <div
          className="absolute top-0 left-0 h-full bg-[#1A1A1A] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />

        {/* Sliding Dot (●) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#E04D3E] shadow-[0_0_10px_rgba(224,77,62,0.6)] transition-all duration-300 ease-out will-change-transform"
          style={{ left: `${clampedProgress}%` }}
        />
      </div>

      {/* Target destination URL display in readable monospace */}
      {destinationUrl ? (
        <p className="text-xs font-mono font-medium text-neutral-800 truncate max-w-full text-center pt-1.5">
          {destinationUrl}
        </p>
      ) : null}
    </div>
  );
};

/**
 * EditorialHero
 * Central composition for the creative portal experience.
 * Combines:
 * - Small introduction / handwritten accent
 * - Large editorial serif heading with subtle letter drift
 * - Supporting sentence & status indicator
 * - Minimal progress line (──────────────●────────)
 * - Layered entry timing and smooth page-exit coordination
 */
export const EditorialHero: React.FC<EditorialHeroProps> = ({
  intro,
  heading,
  subtitle,
  description,
  destination,
  isRedirecting = false,
  progress = 0,
  statusLabel,
  children,
}) => {
  const { phase } = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isExiting = phase === 'closing' || phase === 'redirecting';

  // Compute status label if not provided
  let activeStatus = statusLabel;
  if (!activeStatus && isRedirecting) {
    if (progress < 40) {
      activeStatus = 'PREPARING DESTINATION';
    } else if (progress < 90) {
      activeStatus = 'CONNECTING';
    } else {
      activeStatus = 'REDIRECTING';
    }
  }

  return (
    <div
      className={`w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6 transition-all duration-300 ease-out ${
        isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Small introduction / accent line (Layer 1 in entry) */}
      {intro ? (
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-out delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="font-handwriting text-lg md:text-xl text-neutral-500 tracking-wide">
            {intro}
          </span>
        </div>
      ) : null}

      {/* 2. Large Editorial Heading with subtle letter movement (Layer 2 in entry) */}
      <div
        className={`space-y-2 transition-all duration-700 ease-out delay-150 ${
          mounted
            ? 'opacity-100 translate-y-0 filter-none scale-100'
            : 'opacity-0 translate-y-5 blur-[3px] scale-[0.97]'
        }`}
      >
        <EditorialTitleWithLetterMovement title={heading} />

        {subtitle ? (
          <p className="font-editorial italic text-2xl md:text-3xl text-neutral-600 tracking-normal font-normal">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* 3. Supporting Sentence & Status (Layer 3 in entry) */}
      {description ? (
        <p
          className={`text-editorial-body max-w-md mx-auto text-neutral-600 transition-all duration-500 ease-out delay-250 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {description}
        </p>
      ) : null}

      {/* Status indicator with crossfade transition */}
      {activeStatus ? (
        <div
          className={`transition-all duration-500 ease-out delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div
            key={activeStatus}
            className="animate-status-crossfade inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-neutral-100/80 border border-neutral-200/60"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E04D3E] animate-pulse" />
            <span className="text-[10px] font-sans font-semibold tracking-[0.2em] text-neutral-500 uppercase">
              {activeStatus}
            </span>
          </div>
        </div>
      ) : null}

      {/* 4. Minimal Progress Indicator (Layer 4 in entry) */}
      {isRedirecting ? (
        <div
          className={`w-full transition-all duration-500 ease-out delay-350 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <EditorialProgressBar
            progress={progress}
            destinationUrl={
              destination && isExternalRedirect(destination)
                ? destination.destinationUrl
                : undefined
            }
          />
        </div>
      ) : null}

      {/* 5. Interactive controls (pills, links, etc.) */}
      {children ? (
        <div
          className={`pt-2 transition-all duration-500 ease-out delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default EditorialHero;
