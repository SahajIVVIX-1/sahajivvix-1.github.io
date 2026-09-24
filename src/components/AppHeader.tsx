import React, { ReactNode, useState } from 'react';
import { TransitionLink } from './TransitionLink';
import { VisitorProfileTrigger, VisitorProfileModal } from './VisitorProfileModal';
import { SmoothCrossfadeText } from './SmoothCrossfadeText';
import { SmoothHeaderControl } from './SmoothHeaderControl';
import { useTransition } from '../context/TransitionContext';

export interface AppHeaderProps {
  readonly pageSubtitle?: string;
  readonly headerRight?: ReactNode;
  readonly className?: string;
  readonly visible?: boolean;
}

/**
 * Universal Editorial High-Blur Transparent Header Bar
 * - Uniform across all pages (Home, Resume, Redirects, 404).
 * - Fixed on top (fixed top-0 inset-x-0 z-40) with constant, unchanging height everywhere.
 * - Single elegant Visitor / Presence / System Intelligence feature on top right.
 * - Subtitles and action controls transition with fluid cross-fades and smooth dimensional sliding.
 * - High blur (36px backdrop-filter with 180% saturation) for a luxurious frosted glass refraction.
 * - Light and transparent tinted glass wash (28%-18% opacity) letting background elements show through softly.
 * - Organic feathered dissolve on the lower boundary extending 36px with ZERO sharp/quick border lines.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  pageSubtitle = 'gateway & portfolio',
  headerRight,
  className = '',
  visible = true,
}) => {
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState<boolean>(false);
  const { visitorIp, isIpDocked } = useTransition();

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        } ${className}`}
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
        <div className="relative z-10 w-full px-5 sm:px-8 md:px-12 py-5 md:py-6 flex items-center justify-between gap-3">
          {/* Brand identity & breadcrumb */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-wrap sm:flex-nowrap">
            <TransitionLink
              to="/"
              className="font-editorial text-xl font-medium tracking-tight text-[#1A1A1A] hover:opacity-80 transition-opacity cursor-pointer shrink-0"
              title="Return to Personal Gateway"
            >
              Sahaj
            </TransitionLink>
            <span className="text-neutral-300 shrink-0">/</span>
            {/* Smoothly cross-fading page subtitle */}
            <SmoothCrossfadeText
              text={pageSubtitle}
              className="font-handwriting text-base text-neutral-600 truncate shrink-0"
            />
            {/* Telemetry IP Badge docked next to Sahaj and pageSubtitle */}
            <div
              id="header-ip-dock"
              className={`flex items-center space-x-2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 ${
                isIpDocked
                  ? 'opacity-100 translate-x-0 pointer-events-auto'
                  : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}
            >
              <span className="text-neutral-300 shrink-0">/</span>
              <button
                type="button"
                onClick={() => setIsVisitorModalOpen(true)}
                className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-neutral-400 shadow-xs hover:shadow-sm text-neutral-800 hover:text-neutral-950 transition-all cursor-pointer group active:scale-95"
                title="Visitor telemetry — Click to inspect network profile"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-mono text-xs font-semibold tracking-wide">
                  IP: {visitorIp}
                </span>
              </button>
            </div>
          </div>

          {/* Right side controls: Dynamic action control + Visitor intelligence feature */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-auto">
            {/* Smooth entering / exiting dynamic control */}
            <SmoothHeaderControl duration={360}>
              {headerRight}
            </SmoothHeaderControl>

            <div className="shrink-0 flex items-center">
              <VisitorProfileTrigger
                isOpen={isVisitorModalOpen}
                onClick={() => setIsVisitorModalOpen((prev) => !prev)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Floating Visitor Intelligence Modal & Local System Telemetry */}
      <VisitorProfileModal
        isOpen={isVisitorModalOpen}
        onClose={() => setIsVisitorModalOpen(false)}
      />
    </>
  );
};

export default AppHeader;
