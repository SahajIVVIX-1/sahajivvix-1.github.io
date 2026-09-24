import React from 'react';

export interface AppFooterProps {
  readonly footerSubtitle?: string;
  readonly className?: string;
  readonly sticky?: boolean;
}

/**
 * Universal Editorial High-Blur Transparent Footer Bar
 * - Uniform across all pages (Home, Resume, Redirects, 404).
 * - Constant, unchanging height and typography everywhere.
 * - High blur (36px backdrop-filter with 180% saturation) for a luxurious frosted glass refraction.
 * - Light and transparent tinted glass wash (28%-18% opacity) letting background elements show through softly.
 * - Organic feathered dissolve on the upper boundary extending 36px with ZERO sharp/quick border lines.
 */
export const AppFooter: React.FC<AppFooterProps> = ({
  footerSubtitle = 'personal gateway ~',
  className = '',
  sticky = false,
}) => {
  return (
    <footer
      className={`${
        sticky ? 'sticky bottom-0' : 'relative'
      } z-30 w-full transition-all duration-300 ease-out ${className}`}
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
        <span className="font-sans font-medium text-neutral-600">© 2026 Sahaj</span>
        <span className="font-handwriting text-sm text-neutral-400">
          {footerSubtitle}
        </span>
      </div>
    </footer>
  );
};

export default AppFooter;
