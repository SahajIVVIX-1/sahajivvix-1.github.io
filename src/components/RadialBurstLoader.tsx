import React from 'react';

export interface RadialBurstLoaderProps {
  readonly size?: number;
  readonly className?: string;
  readonly color?: string;
  readonly isRunning?: boolean;
  readonly motion?: 'wave' | 'spin-bloom';
}

/**
 * RadialBurstLoader
 * Replicates the organic 12-spoke radial starburst loader from the user's video.
 * Supports multiple motion variants:
 * - 'wave': traveling radial wave where spokes undulate in sequence (header trigger).
 * - 'spin-bloom': smooth celestial rotation combined with alternating blooming petals (inside visitor page).
 * No circular background or container borders.
 */
export const RadialBurstLoader: React.FC<RadialBurstLoaderProps> = ({
  size = 26,
  className = '',
  color = '#D46853',
  isRunning = true,
  motion = 'wave',
}) => {
  // 12 spokes spaced 30 degrees apart
  const spokes = Array.from({ length: 12 }, (_, i) => i);
  const duration = 1.2; // seconds per wave cycle

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none pointer-events-none ${className}`}
      style={{ overflow: 'visible' }}
    >
      <g
        transform="translate(18, 18)"
        style={{
          animation:
            motion === 'spin-bloom' && isRunning
              ? 'radial-burst-spin 8s linear infinite'
              : 'none',
          transformOrigin: '0px 0px',
        }}
      >
        {spokes.map((index) => {
          const angle = index * 30;
          const delay = (index / 12) * duration;
          const isEven = index % 2 === 0;

          // Compute ray animation based on motion variant
          let rayAnimation = 'none';
          let rayDelay = '0s';

          if (isRunning) {
            if (motion === 'wave') {
              rayAnimation = `radial-burst-ray ${duration}s ease-in-out infinite`;
              rayDelay = `-${delay}s`;
            } else if (motion === 'spin-bloom') {
              rayAnimation = isEven
                ? 'radial-burst-bloom-a 1.8s ease-in-out infinite'
                : 'radial-burst-bloom-b 1.8s ease-in-out infinite';
              rayDelay = isEven ? '0s' : '-0.9s';
            }
          }

          return (
            <g key={index} transform={`rotate(${angle})`}>
              <line
                x1="0"
                y1="-4.5"
                x2="0"
                y2="-15"
                stroke={color}
                strokeWidth="2.8"
                strokeLinecap="round"
                style={{
                  transformOrigin: '0px 0px',
                  animation: rayAnimation,
                  animationDelay: rayDelay,
                }}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default RadialBurstLoader;
