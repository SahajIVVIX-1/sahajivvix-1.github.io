import React, { ReactNode } from 'react';
import { useTransition } from '../context/TransitionContext';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';

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
}

/**
 * Core visual shell providing an elegant editorial layout,
 * warm ivory background, frosted blurred header and footer, and minimal typography.
 * Supports smooth content fade during butterfly transitions.
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
}) => {
  const { phase } = useTransition();
  const isContentHidden = phase === 'closing' || phase === 'redirecting';

  const maxWidthClass =
    maxWidth === '5xl'
      ? 'max-w-5xl'
      : maxWidth === '6xl'
      ? 'max-w-6xl'
      : maxWidth === 'full'
      ? 'max-w-full'
      : 'max-w-4xl';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-[#7EC9DB]/35 selection:text-[#1A1A1A]">
      {/* Top Editorial Frosted Blurred Header Bar (Fixed on top, does not scroll with scroll) */}
      {showHeader ? (
        <>
          <AppHeader
            pageSubtitle={pageSubtitle}
            headerRight={headerRight}
          />
          {/* Layout spacer for fixed header */}
          <div className="h-20 sm:h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />
        </>
      ) : null}

      {/* Center Editorial Composition Frame */}
      <main
        className={`relative z-20 flex-1 w-full ${maxWidthClass} mx-auto px-4 sm:px-6 md:px-8 ${
          centerContent
            ? 'py-10 md:py-16 flex flex-col items-center justify-center text-center'
            : 'py-8 md:py-12 flex flex-col items-center'
        } transition-all duration-300 ease-out ${
          isContentHidden ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        } ${contentClassName}`}
      >
        {children}
      </main>

      {/* Bottom Editorial Frosted Blurred Footer Bar */}
      {showFooter ? (
        <AppFooter
          footerSubtitle={footerSubtitle}
          sticky={stickyFooter}
        />
      ) : null}
    </div>
  );
};

export default PortalShell;
