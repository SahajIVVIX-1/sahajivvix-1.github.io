import React from 'react';
import { TransitionLink } from './TransitionLink';
import { BrandLogo } from './BrandLogo';
import { SmoothCrossfadeText } from './SmoothCrossfadeText';

export interface AppFooterProps {
  readonly footerSubtitle?: string;
  readonly className?: string;
  readonly sticky?: boolean;
  readonly fixed?: boolean;
  readonly visible?: boolean;
}

/**
 * Universal Editorial High-Blur Transparent Footer Bar
 * - Uniform across all pages (Home, Resume, Redirects, 404).
 * - Fixed on bottom (fixed bottom-0 inset-x-0 z-40) with constant, unchanging height everywhere.
 * - Stays intact in place when content expands (such as Opening Resume / CV).
 * - Smooth crossfade for dynamic footer subtitle changes during page switches.
 * - High blur (36px backdrop-filter with 180% saturation) for a luxurious frosted glass refraction.
 * - Light and transparent tinted glass wash (28%-18% opacity) letting background elements show through softly.
 * - Organic feathered dissolve on the upper boundary extending 36px with ZERO sharp/quick border lines.
 */
export const AppFooter: React.FC<AppFooterProps> = ({
  footerSubtitle = 'personal gateway ~',
  className = '',
  sticky = false,
  fixed = true,
  visible = true,
}) => {
  const positionClass = fixed
    ? 'fixed bottom-0 inset-x-0'
    : sticky
    ? 'sticky bottom-0'
    : 'relative';

  return (
    <footer
      className={`${positionClass} z-40 w-full transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-2 pointer-events-none'
      } ${className}`}
    >
      {/* 
        High-blur light & transparent glass layer:
        - blur(36px) saturate(180%) for rich, deep frosted glass.
        - Light, airy translucency (transparent crystal finish).
        - Smooth feathered dissolve at top over an extended 36px overhang: zero quick/sharp border.
      */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -top-9"
        style={{
          background:
            'linear-gradient(to top, rgba(255, 255, 255, 0.28) 0%, rgba(250, 248, 245, 0.18) calc(100% - 36px), rgba(250, 248, 245, 0) 100%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          maskImage:
            'linear-gradient(to top, black 0%, black calc(100% - 36px), rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, black 0%, black calc(100% - 36px), rgba(0, 0, 0, 0) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Footer Content with constant, uniform height everywhere */}
      <div className="relative z-10 w-full px-6 py-5 md:px-12 md:py-6 flex items-center justify-between text-xs text-neutral-500">
        <TransitionLink
          to="/"
          className="group inline-flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-95 shrink-0"
          title="Sahaj — Return to Gateway"
          aria-label="Sahaj Logo"
        >
          <BrandLogo size={36} animated />
        </TransitionLink>
        {/* Smoothly cross-fading footer subtitle */}
        <SmoothCrossfadeText
          text={footerSubtitle}
          className="font-handwriting text-sm text-neutral-400"
        />
      </div>
    </footer>
  );
};

export default AppFooter;
