import React, { useEffect, useState, useRef } from 'react';

export interface SmoothCrossfadeTextProps {
  readonly text: string;
  readonly className?: string;
  readonly duration?: number; // transition duration in ms
}

/**
 * SmoothCrossfadeText
 * Gracefully cross-fades between changing text values.
 * Previous text dissolves upward while incoming text fades in smoothly from below.
 * Eliminates abrupt text snapping in headers and footers across page switches.
 */
export const SmoothCrossfadeText: React.FC<SmoothCrossfadeTextProps> = ({
  text,
  className = '',
  duration = 340,
}) => {
  const [currentText, setCurrentText] = useState<string>(text);
  const [exitingText, setExitingText] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (text !== currentText) {
      if (timerRef.current) clearTimeout(timerRef.current);

      setExitingText(currentText);
      setCurrentText(text);
      setIsTransitioning(true);

      timerRef.current = setTimeout(() => {
        setExitingText(null);
        setIsTransitioning(false);
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, currentText, duration]);

  return (
    <span className={`relative inline-flex items-center overflow-visible ${className}`}>
      {/* Exiting previous text */}
      {exitingText !== null && (
        <span
          className="absolute inset-0 pointer-events-none transition-all ease-out"
          style={{
            transitionDuration: `${duration}ms`,
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning
              ? 'translateY(-3px) scale(0.98)'
              : 'translateY(0) scale(1)',
          }}
          aria-hidden="true"
        >
          {exitingText}
        </span>
      )}

      {/* Entering current text */}
      <span
        className="transition-all ease-out"
        style={{
          transitionDuration: `${duration}ms`,
          opacity: 1,
          transform: 'translateY(0) scale(1)',
          animation: isTransitioning
            ? `crossfade-enter ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : 'none',
        }}
      >
        {currentText}
      </span>
    </span>
  );
};

export default SmoothCrossfadeText;
