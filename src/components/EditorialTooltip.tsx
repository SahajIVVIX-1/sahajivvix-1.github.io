import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { BrandLogo } from './BrandLogo';

export interface TooltipData {
  text: string;
  title?: string;
  subtitle?: string;
  shortcut?: string;
  showLogo?: boolean;
  rect: DOMRect;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

interface TooltipContextType {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextType>({
  showTooltip: () => {},
  hideTooltip: () => {},
});

export const useEditorialTooltip = () => useContext(TooltipContext);

export interface TooltipProps {
  readonly content: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly shortcut?: string;
  readonly showLogo?: boolean;
  readonly placement?: 'bottom' | 'top';
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Tooltip wrapper component for individual elements
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  subtitle,
  shortcut,
  showLogo = false,
  placement = 'bottom',
  children,
  className = '',
}) => {
  const { showTooltip, hideTooltip } = useEditorialTooltip();
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    showTooltip({
      text: content,
      title,
      subtitle,
      shortcut,
      showLogo,
      rect,
      placement,
    });
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * EditorialTooltipProvider
 * 1. Universally prevents default OS tooltips by converting `title` attributes to `data-tooltip`.
 * 2. Renders a bespoke, high-contrast, motion-designed floating tooltip with brand logo and subtle glow.
 */
export const EditorialTooltipProvider: React.FC<{ readonly children: ReactNode }> = ({ children }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const hideTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);

  const showTooltip = useCallback((data: TooltipData) => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setTooltip(data);
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setTooltip(null);
    }, 80);
  }, []);

  // Universal interception: strip native `title` attribute to prevent ugly OS tooltip popups
  // and attach custom motion tooltip instead
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (target.hasAttribute('title')) {
          const titleText = target.getAttribute('title') || '';
          target.setAttribute('data-tooltip', titleText);
          target.removeAttribute('title'); // Permanently eliminate native browser tooltip
        }

        if (target.hasAttribute('data-tooltip')) {
          const text = target.getAttribute('data-tooltip') || '';
          const customTitle = target.getAttribute('data-tooltip-title') || undefined;
          const customSubtitle = target.getAttribute('data-tooltip-subtitle') || undefined;
          const shortcut = target.getAttribute('data-tooltip-shortcut') || undefined;
          const showLogo = target.getAttribute('data-tooltip-logo') === 'true';

          if (text) {
            const rect = target.getBoundingClientRect();
            if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
            showTimerRef.current = window.setTimeout(() => {
              showTooltip({
                text,
                title: customTitle,
                subtitle: customSubtitle,
                shortcut,
                showLogo,
                rect,
                placement: 'bottom',
              });
            }, 60);
          }
          return;
        }
        target = target.parentElement;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-tooltip]')) {
        if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
        hideTooltip();
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { capture: true });
    document.addEventListener('mouseout', handleMouseOut, { capture: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, { capture: true });
      document.removeEventListener('mouseout', handleMouseOut, { capture: true });
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [showTooltip, hideTooltip]);

  // Position calculation
  let top = 0;
  let left = 0;
  if (tooltip) {
    const { rect, placement = 'bottom' } = tooltip;
    if (placement === 'bottom') {
      top = rect.bottom + 8;
      left = rect.left + rect.width / 2;
    } else {
      top = rect.top - 8;
      left = rect.left + rect.width / 2;
    }
  }

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}

      {/* Bespoke Motion Tooltip Card */}
      {tooltip && (
        <div
          className={`fixed z-[9999] pointer-events-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isVisible
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-1 scale-95'
          }`}
          style={{
            top: `${top}px`,
            left: `${left}px`,
            transform: 'translateX(-50%)',
          }}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <div className="relative rounded-2xl bg-[#1A1A1A]/95 backdrop-blur-xl border border-white/15 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)] text-white flex items-center space-x-3 select-none max-w-xs sm:max-w-sm">
            {/* Ambient solar edge glow */}
            <div
              className="absolute -inset-0.5 rounded-2xl opacity-25 blur-sm pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #FF6200, #FFA426, transparent)',
              }}
            />

            {/* Optional motion brand emblem inside tooltip */}
            {tooltip.showLogo && (
              <div className="relative shrink-0 flex items-center justify-center w-7 h-7 rounded-xl bg-white/10 border border-white/15">
                <BrandLogo size={20} animated />
              </div>
            )}

            <div className="relative min-w-0">
              {tooltip.title && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold tracking-tight text-white font-editorial">
                    {tooltip.title}
                  </span>
                  {tooltip.shortcut && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/15 text-neutral-300">
                      {tooltip.shortcut}
                    </span>
                  )}
                </div>
              )}
              <div className="text-[11px] font-sans text-neutral-300 leading-tight">
                {tooltip.subtitle || tooltip.text}
              </div>
            </div>

            {/* Little indicator arrow on top */}
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#1A1A1A] border-t border-l border-white/15"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </TooltipContext.Provider>
  );
};

export default EditorialTooltipProvider;
