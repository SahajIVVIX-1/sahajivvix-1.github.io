import React from 'react';

export type RadialBurstMotion =
  | 'solar-iris'
  | 'spark-sweep'
  | 'aperture'
  | 'spin-bloom'
  | 'wave';

export interface RadialBurstLoaderProps {
  readonly size?: number;
  readonly className?: string;
  readonly color?: string;
  readonly isRunning?: boolean;
  readonly motion?: RadialBurstMotion;
}

/**
 * RadialBurstLoader
 *
 * Distinctive 12-spoke solar burst / flower blossom insignia with center core ring.
 * Mathematically centered with zero coordinate distortion or CSS translation override bugs.
 * Features multiple hypnotic animation variants:
 * - 'solar-iris': (NEW) Celestial continuous rotation combined with an organic traveling
 *   petal wave and breathing counter-rhythm center core.
 * - 'spark-sweep': Traveling starlight sweep around the 12 spokes.
 * - 'aperture': Synchronized organic breathing of all rays in unison with solar flare.
 * - 'spin-bloom': Rotating celestial blossom with alternating blooming rays.
 * - 'wave': Traveling radial wave where spokes undulate in sequence.
 */
export const RadialBurstLoader: React.FC<RadialBurstLoaderProps> = ({
  size = 28,
  className = '',
  color = '#E65100',
  isRunning = true,
  motion = 'solar-iris',
}) => {
  // 12 spokes spaced 30 degrees apart
  const spokes = Array.from({ length: 12 }, (_, i) => i);
  const cycleDuration = 1.4; // seconds per wave cycle

  const isSpinning =
    isRunning && (motion === 'solar-iris' || motion === 'spin-bloom');

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="select-none pointer-events-none block"
        style={{
          width: size,
          height: size,
          overflow: 'visible',
          animation: isSpinning ? 'solar-iris-spin 9s linear infinite' : 'none',
          transformOrigin: 'center',
        }}
        aria-hidden="true"
      >
        <g transform="translate(18, 18)">
          {/* Center Ring Core (The hollow ring seen in the insignia) */}
          <circle
            cx="0"
            cy="0"
            r="3.2"
            stroke={color}
            strokeWidth="2.2"
            fill="none"
            style={{
              transformOrigin: '0px 0px',
              animation:
                isRunning && (motion === 'solar-iris' || motion === 'aperture')
                  ? 'solar-iris-core 2.4s ease-in-out infinite'
                  : 'none',
            }}
          />

          {/* 12 Radiating Spokes */}
          {spokes.map((index) => {
            const angle = index * 30;
            const delay = (index / 12) * cycleDuration;
            const isEven = index % 2 === 0;

            let rayAnimation = 'none';
            let rayDelay = '0s';

            if (isRunning) {
              if (motion === 'solar-iris') {
                rayAnimation = `solar-iris-ray ${cycleDuration}s ease-in-out infinite`;
                rayDelay = `-${delay}s`;
              } else if (motion === 'spark-sweep') {
                rayAnimation = `solar-spark-sweep ${cycleDuration}s linear infinite`;
                rayDelay = `-${delay}s`;
              } else if (motion === 'aperture') {
                rayAnimation = 'solar-aperture-breath 2.2s ease-in-out infinite';
                rayDelay = '0s';
              } else if (motion === 'spin-bloom') {
                rayAnimation = isEven
                  ? 'radial-burst-bloom-a 1.8s ease-in-out infinite'
                  : 'radial-burst-bloom-b 1.8s ease-in-out infinite';
                rayDelay = isEven ? '0s' : '-0.9s';
              } else if (motion === 'wave') {
                rayAnimation = `radial-burst-ray ${cycleDuration}s ease-in-out infinite`;
                rayDelay = `-${delay}s`;
              }
            }

            return (
              <g key={index} transform={`rotate(${angle})`}>
                <g
                  style={{
                    transformOrigin: '0px 0px',
                    animation: rayAnimation,
                    animationDelay: rayDelay,
                  }}
                >
                  <line
                    x1="0"
                    y1="-5.2"
                    x2="0"
                    y2="-15.5"
                    stroke={color}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default RadialBurstLoader;
