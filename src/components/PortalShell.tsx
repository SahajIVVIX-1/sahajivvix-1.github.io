import React, { ReactNode } from 'react';
import { useTransition } from '../context/TransitionContext';
import { TransitionLink } from './TransitionLink';

export interface PortalShellProps {
  readonly children: ReactNode;
  readonly showHeader?: boolean;
  readonly showFooter?: boolean;
  readonly contentClassName?: string;
  readonly backgroundVariant?: 'full' | 'subtle';
}

/**
 * Core visual shell providing an elegant editorial layout,
 * warm ivory background, organic floating shapes framing, and minimal typography.
 * Supports smooth content fade during flower curtain transitions.
 */
export const PortalShell: React.FC<PortalShellProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  contentClassName = '',
}) => {
  const { phase } = useTransition();
  const isContentHidden = phase === 'closing' || phase === 'redirecting';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden selection:bg-[#7EC9DB]/35 selection:text-[#1A1A1A]">
      {/* Top Editorial Navigation Bar */}
      {showHeader ? (
        <header className="relative z-20 w-full px-6 py-6 md:px-12 md:py-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TransitionLink
              to="/"
              className="font-editorial text-xl font-medium tracking-tight text-[#1A1A1A] hover:opacity-80 transition-opacity"
            >
              Sahaj
            </TransitionLink>
            <span className="text-neutral-300">/</span>
            <span className="text-hand-accent text-sm md:text-base text-neutral-500">
              gateway & portfolio
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#7EC9DB]" />
            <span className="text-editorial-label text-neutral-500">
              Online
            </span>
          </div>
        </header>
      ) : null}

      {/* Center Editorial Composition Frame */}
      <main
        className={`relative z-20 flex-1 w-full max-w-4xl mx-auto px-6 py-10 md:py-16 flex flex-col items-center justify-center text-center transition-all duration-300 ease-out ${
          isContentHidden ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        } ${contentClassName}`}
      >
        {children}
      </main>

      {/* Bottom Editorial Footer */}
      {showFooter ? (
        <footer className="relative z-20 w-full px-6 py-5 md:px-12 md:py-6 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-200/50">
          <span className="font-sans">© 2026 Sahaj</span>
          <span className="text-hand-accent text-sm text-neutral-400">
            personal gateway ~
          </span>
        </footer>
      ) : null}
    </div>
  );
};

export default PortalShell;
