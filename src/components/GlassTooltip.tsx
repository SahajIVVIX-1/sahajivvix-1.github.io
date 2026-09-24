import React, { useState, useEffect, useRef } from 'react';
import { RadialBurstLoader } from './RadialBurstLoader';

/**
 * GlassTooltip
 * Replaces default browser tooltips with a professional, simple glassmorphism hover card.
 *
 * Features:
 * - Completely suppresses default native browser black tooltips by intercepting and stripping `title`.
 * - Features the top-right insignia logo (`RadialBurstLoader`) with a distinctive motion design (`spark-sweep`).
 * - Simple, pristine frosted glass: blur(24px), translucent background, subtle micro-border, floating drop shadow.
 * - Viewport edge collision detection: mathematically guarantees the tooltip is NEVER cut off by any screen edge.
 * - Smooth fluid entrance & exit.
 */

interface TooltipState {
  visible: boolean;
  text: string;
  subtext?: string;
  x: number;
  y: number;
}

export const GlassTooltip: React.FC = () => {
  const [state, setState] = useState<TooltipState>({
    visible: false,
    text: '',
    subtext: undefined,
    x: -999,
    y: -999,
  });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const targetPosRef = useRef<{ x: number; y: number }>({ x: -999, y: -999 });

  useEffect(() => {
    // Disable on touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
    if (isTouch) return;

    /**
     * Compute clamped tooltip position so it NEVER cuts off outside the viewport.
     */
    const computePosition = (mouseX: number, mouseY: number) => {
      const padding = 16;
      const offsetX = 14;
      const offsetY = 16;

      const tooltipWidth = tooltipRef.current?.offsetWidth || 210;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 44;

      let x = mouseX + offsetX;
      let y = mouseY + offsetY;

      // Prevent clipping on the right edge -> flip to the left of cursor
      if (x + tooltipWidth > window.innerWidth - padding) {
        x = mouseX - tooltipWidth - offsetX;
      }
      // Clamp to left screen edge
      if (x < padding) {
        x = padding;
      }

      // Prevent clipping on the bottom edge -> flip above cursor
      if (y + tooltipHeight > window.innerHeight - padding) {
        y = mouseY - tooltipHeight - offsetY;
      }
      // Clamp to top screen edge
      if (y < padding) {
        y = padding;
      }

      return { x, y };
    };

    const handleMouseOver = (e: MouseEvent) => {
      let el = e.target as HTMLElement | null;

      while (el && el !== document.body && el !== document.documentElement) {
        // Intercept native title to prevent default browser popup
        if (el.hasAttribute('title')) {
          const rawTitle = el.getAttribute('title');
          if (rawTitle && rawTitle.trim()) {
            el.setAttribute('data-glass-tooltip', rawTitle.trim());
            el.removeAttribute('title'); // Removes native black tooltip!
          }
        }

        const tooltipData =
          el.getAttribute('data-glass-tooltip') ||
          el.getAttribute('data-tooltip') ||
          (el.tagName === 'A' && el.getAttribute('aria-label') ? el.getAttribute('aria-label') : null);

        if (tooltipData) {
          currentTargetRef.current = el;

          // Parse primary text and optional subtext if separated by '—' or '·'
          let primaryText = tooltipData;
          let secondaryText: string | undefined = undefined;

          if (tooltipData.includes('—')) {
            const parts = tooltipData.split('—');
            primaryText = parts[0].trim();
            secondaryText = parts.slice(1).join('—').trim();
          } else if (tooltipData.includes('·')) {
            const parts = tooltipData.split('·');
            primaryText = parts[0].trim();
            secondaryText = parts.slice(1).join('·').trim();
          }

          targetPosRef.current = { x: e.clientX, y: e.clientY };
          const { x, y } = computePosition(e.clientX, e.clientY);

          setState({
            visible: true,
            text: primaryText,
            subtext: secondaryText,
            x,
            y,
          });
          return;
        }

        el = el.parentElement;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!currentTargetRef.current) return;
      targetPosRef.current = { x: e.clientX, y: e.clientY };
      const { x, y } = computePosition(e.clientX, e.clientY);

      setState((prev) => ({
        ...prev,
        x,
        y,
      }));
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null;
      if (currentTargetRef.current && !currentTargetRef.current.contains(related)) {
        currentTargetRef.current = null;
        setState((prev) => ({
          ...prev,
          visible: false,
        }));
      }
    };

    // Global listeners capturing before any default browser tooltip can queue
    document.addEventListener('mouseover', handleMouseOver, { capture: true, passive: true });
    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: true });
    document.addEventListener('mouseout', handleMouseOut, { capture: true, passive: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver, { capture: true });
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseout', handleMouseOut, { capture: true });
    };
  }, []);

  if (!state.text) return null;

  return (
    <div
      ref={tooltipRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[99999] will-change-transform select-none transition-all duration-150 ease-out"
      style={{
        transform: `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.visible ? 1 : 0.94})`,
        opacity: state.visible ? 1 : 0,
      }}
    >
      {/* 
        Simple, elegant glass container:
        - Frosted glass backdrop blur (24px)
        - Translucent warm white glass finish
        - Delicate micro-border
        - Soft ambient floating drop-shadow
      */}
      <div
        className="flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl border border-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]"
        style={{
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {/* Top-Right Insignia Motion Logo with distinctive motion (spark-sweep) */}
        <div className="shrink-0 w-6 h-6 rounded-full bg-[#FAF8F5]/90 border border-neutral-200/70 flex items-center justify-center shadow-2xs">
          <RadialBurstLoader
            size={16}
            color="#E04D3E"
            motion="spark-sweep"
            isRunning={true}
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col min-w-0 pr-1 text-left">
          <span className="font-sans text-[12px] font-semibold text-[#1A1A1A] tracking-tight leading-snug whitespace-nowrap">
            {state.text}
          </span>
          {state.subtext && (
            <span className="font-mono text-[10px] text-neutral-500 tracking-wide truncate max-w-[240px]">
              {state.subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlassTooltip;
