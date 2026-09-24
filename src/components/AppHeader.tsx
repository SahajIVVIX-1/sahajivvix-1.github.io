import React, { ReactNode } from 'react';
import { TransitionLink } from './TransitionLink';

export interface AppHeaderProps {
  readonly pageSubtitle?: string;
  readonly headerRight?: ReactNode;
  readonly className?: string;
}

/**
 * Universal Editorial High-Blur Transparent Header Bar
 * - Uniform across all pages (Home, Resume, Redirects, 404).
 * - Fixed on top (fixed top-0 inset-x-0 z-40) with constant, unchanging height everywhere.
 * - High blur (36px backdrop-filter with 180% saturation) for a luxurious frosted glass refraction.
 * - Light and transparent tinted glass wash (28%-18% opacity) letting background elements show through softly.
 * - Organic feathered dissolve on the lower boundary extending 36px with ZERO sharp/quick border lines.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  pageSubtitle = 'gateway & portfolio',
  headerRight,
  className = '',
}) => {
  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ease-out ${className}`}
    >
      {/* 
        High-blur light & transparent glass layer:
        - blur(36px) saturate(180%) for rich, deep frosted glass.
        - Light, airy translucency (transparent crystal finish).
        - Smooth feathered dissolve at bottom over an extended 36px overhang: zero quick/sharp border.
      */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -bottom-9"
        style={{
          background:
            'linear-gradient(to bottom, rgba(255, 255, 255, 0.28) 0%, rgba(250, 248, 245, 0.18) calc(100% - 36px), rgba(250, 248, 245, 0) 100%)',
          backdropFilter: 'blur(36px) saturate(180%)',
          WebkitBackdropFilter: 'blur(36px) saturate(180%)',
          maskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 36px), rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black calc(100% - 36px), rgba(0, 0, 0, 0) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Header Content with constant, uniform height everywhere */}
      <div className="relative z-10 w-full px-6 py-5 md:px-12 md:py-6 flex items-center justify-between">
        {/* Brand identity & breadcrumb */}
        <div className="flex items-center space-x-3">
          <TransitionLink
            to="/"
            className="font-editorial text-xl font-medium tracking-tight text-[#1A1A1A] hover:opacity-80 transition-opacity cursor-pointer"
            title="Return to Personal Gateway"
          >
            Sahaj
          </TransitionLink>
          <span className="text-neutral-300">/</span>
          <span className="font-handwriting text-base text-neutral-500">
            {pageSubtitle}
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {headerRight !== undefined ? (
            headerRight
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7EC9DB] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7EC9DB]" />
                </span>
                <span className="text-xs uppercase tracking-wider font-mono text-neutral-500 hidden sm:inline-block">
                  Online
                </span>
              </div>
              <span className="text-neutral-300 hidden sm:inline-block">·</span>
              <TransitionLink
                to="/Resume"
                className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium rounded-full bg-[#1A1A1A] text-[#FAF8F5] hover:bg-[#333333] transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
              >
                Resume / CV
              </TransitionLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
