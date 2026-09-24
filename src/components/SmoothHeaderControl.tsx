import React, { ReactNode, useEffect, useState, useRef } from 'react';

export interface SmoothHeaderControlProps {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly duration?: number; // ms
}

/**
 * SmoothHeaderControl
 * Provides liquid enter and exit transitions for dynamic header controls.
 * Expands width and slides in when added; smoothly collapses width, slides,
 * and dissolves before unmounting when removed during page switching.
 */
export const SmoothHeaderControl: React.FC<SmoothHeaderControlProps> = ({
  children,
  className = '',
  duration = 360,
}) => {
  const [renderedContent, setRenderedContent] = useState<ReactNode>(children);
  const [isVisible, setIsVisible] = useState<boolean>(Boolean(children));
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (children) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      setRenderedContent(children);
      // Small frame delay to ensure DOM is ready for entrance animation
      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      // Begin smooth exit animation
      setIsVisible(false);
      exitTimerRef.current = setTimeout(() => {
        setRenderedContent(null);
      }, duration);

      return () => {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      };
    }
  }, [children, duration]);

  if (!renderedContent && !isVisible) {
    return null;
  }

  return (
    <div
      className={`flex items-center shrink-0 overflow-hidden transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
        maxWidth: isVisible ? '500px' : '0px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'translateX(0) scale(1)'
          : 'translateX(6px) scale(0.95)',
        marginRight: isVisible ? '8px' : '0px',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="shrink-0 flex items-center">
        {renderedContent}
      </div>
    </div>
  );
};

export default SmoothHeaderControl;
