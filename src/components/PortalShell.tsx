import React, { ReactNode } from 'react';
import { useTransition } from '../context/TransitionContext';
import { useSetHeaderFooter } from '../context/HeaderFooterContext';

export interface PortalShellProps {
  readonly children: ReactNode;
  readonly showHeader?: boolean;
  readonly showFooter?: boolean;
  readonly pageSubtitle?: string;
  readonly footerSubtitle?: string;
  readonly headerRight?: ReactNode;
  readonly contentClassName?: string;
  readonly maxWidth?: '4xl' | '5xl' | '6xl' | 'full';
  readonly centerContent?: boolean;
  readonly backgroundVariant?: 'full' | 'subtle';
  readonly stickyFooter?: boolean;
  readonly fixedFooter?: boolean;
}

/**
 * Core visual shell providing an elegant editorial layout,
 * warm ivory background, frosted blurred header and footer, and minimal typography.
 * Supports smooth content fade during butterfly transitions.
 * Coordinates with HeaderFooterContext so header & footer elements enter and exit with liquid smoothness.
 */
export const PortalShell: React.FC<PortalShellProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  pageSubtitle = 'gateway & portfolio',
  footerSubtitle = 'personal gateway ~',
  headerRight,
  contentClassName = '',
  maxWidth = '4xl',
  centerContent = true,
  stickyFooter = false,
  fixedFooter = true,
}) => {
  const { phase } = useTransition();
  const isContentHidden = phase === 'closing' || phase === 'redirecting';

  // Synchronize header & footer configurations with the persistent layout-level header/footer
  useSetHeaderFooter({
    pageSubtitle,
    footerSubtitle,
    headerRight,
    showHeader,
    showFooter,
    fixedFooter,
    stickyFooter,
  });

  const maxWidthClass =
    maxWidth === '5xl'
      ? 'max-w-5xl'
      : maxWidth === '6xl'
      ? 'max-w-6xl'
      : maxWidth === 'full'
      ? 'max-w-full'
      : 'max-w-4xl';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden select-none">
      {/* Layout spacer for fixed header so content clears the persistent frosted bar */}
      {showHeader ? (
        <div className="h-20 sm:h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      ) : null}

      {/* Center Editorial Composition Frame */}
      <main
        className={`relative z-20 flex-1 w-full ${maxWidthClass} mx-auto px-4 sm:px-6 md:px-8 ${
          centerContent
            ? 'py-8 md:py-12 flex flex-col items-center justify-center text-center'
            : 'py-6 md:py-10 flex flex-col items-center'
        } transition-all duration-300 ease-out ${
          isContentHidden ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        } ${contentClassName}`}
      >
        {children}
      </main>

      {/* Bottom Layout spacer matching fixed footer so content never clips behind footer */}
      {showFooter && fixedFooter ? (
        <div className="h-20 sm:h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      ) : null}
    </div>
  );
};

export default PortalShell;
