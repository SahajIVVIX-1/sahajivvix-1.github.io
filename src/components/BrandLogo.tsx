import React, { useId, useState } from 'react';

export interface BrandLogoProps {
  /** Size in pixels (width and height are equal). Default is 36. */
  readonly size?: number;
  /** Visual presentation style: 'mark' (pure sculptural vector) or 'badge' (minimalist squircle container). Default is 'mark'. */
  readonly variant?: 'mark' | 'badge';
  /** Additional CSS classes */
  readonly className?: string;
  /** Whether motion identity is enabled. Default is true. */
  readonly animated?: boolean;
  /** Optional click handler */
  readonly onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

// Continuous geometric ribbon track matching the exact silhouette of the S logo
const S_TRACK =
  'M 78 18 C 48 18, 23 20, 23 35 C 23 50, 77 50, 77 65 C 77 80, 52 82, 22 82';

/**
 * Sahaj Brand Identity Emblem
 *
 * Professional Visible Motion Identity:
 * 1. Exact Visual Foundation: The authentic orange S silhouette, proportions, and tactile crossover.
 * 2. Floating & Swaying Motion: Visibly floats in space with sinusoidal elevation and subtle harmonic tilt.
 * 3. Dynamic Shape-Changing Flex: The upper and lower loops flex and stretch in harmonic opposition (3.8s loop).
 * 4. Polished Traveling Gleam: A bright specular light beam glides continuously across the ribbon track (3.6s loop).
 * 5. Traveling Luminous Spark: A distinct warm-white energy droplet traces the S path with gentle acceleration.
 * 6. Responsive Interaction: Smooth spring lift on hover and tactile compression on click.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  variant = 'mark',
  className = '',
  animated = true,
  onClick,
}) => {
  const idPrefix = useId().replace(/:/g, '');
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    if (onClick) onClick(e);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
  };

  return (
    <span
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center select-none shrink-0 cursor-pointer group ${
        animated
          ? 'transition-all duration-300 ease-out hover:scale-110 active:scale-95'
          : ''
      } ${isClicked ? 'scale-95' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Sahaj Logo"
      role="img"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Base Solar Ribbon Gradient: Amber to Tangerine to Deep Vermilion */}
          <linearGradient
            id={`${idPrefix}-org-solar`}
            x1="20"
            y1="14"
            x2="80"
            y2="86"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFA426" />
            <stop offset="38%" stopColor="#FF6200" />
            <stop offset="72%" stopColor="#EB4400" />
            <stop offset="100%" stopColor="#C41C00" />
            {/* Subtle continuous gradient evolution */}
            {animated && (
              <>
                <animate
                  attributeName="x1"
                  values="20; 28; 20"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y1"
                  values="14; 22; 14"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="x2"
                  values="80; 72; 80"
                  dur="6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="y2"
                  values="86; 78; 86"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </>
            )}
          </linearGradient>

          {/* Upper Track Solar Gradient (Slightly lighter amber highlight) */}
          <linearGradient
            id={`${idPrefix}-org-upper`}
            x1="20"
            y1="12"
            x2="80"
            y2="52"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFB338" />
            <stop offset="55%" stopColor="#FF6600" />
            <stop offset="100%" stopColor="#E53A00" />
          </linearGradient>

          {/* Traveling Specular Gleam Gradient: Crisp polished white/gold beam */}
          <linearGradient
            id={`${idPrefix}-gleam-grad`}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="40%" stopColor="#FFF9E6" stopOpacity="0.9" />
            <stop offset="52%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="65%" stopColor="#FFD070" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFA020" stopOpacity="0" />
          </linearGradient>

          {/* Center Dimensional Fold Shadow for Tactile Ribbon Crossover */}
          <filter
            id={`${idPrefix}-fold-shadow`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="2.2"
              floodColor="#480B00"
              floodOpacity="0.42"
            />
          </filter>

          {/* Ambient Warm Glow */}
          <filter
            id={`${idPrefix}-ambient-glow`}
            x="-25%"
            y="-25%"
            width="150%"
            height="150%"
          >
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="3.5"
              floodColor="#FF5500"
              floodOpacity="0.32"
            />
          </filter>

          {/* Spark Glow Filter */}
          <filter
            id={`${idPrefix}-spark-glow`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="2"
              floodColor="#FFFFFF"
              floodOpacity="0.95"
            />
          </filter>

          {/* Badge Background Gradient (when variant="badge") */}
          <linearGradient
            id={`${idPrefix}-badge-light`}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFF7EE" />
          </linearGradient>
          <linearGradient
            id={`${idPrefix}-badge-border`}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255, 102, 0, 0.3)" />
            <stop offset="100%" stopColor="rgba(224, 50, 0, 0.15)" />
          </linearGradient>
        </defs>

        {/* Optional Squircle Badge Container */}
        {variant === 'badge' && (
          <g className="logo-badge">
            <rect
              x="4"
              y="4"
              width="92"
              height="92"
              rx="24"
              fill={`url(#${idPrefix}-badge-light)`}
              stroke={`url(#${idPrefix}-badge-border)`}
              strokeWidth="2"
            />
          </g>
        )}

        {/* Ambient Halo Glow breathing behind the ribbon */}
        {animated && (
          <ellipse
            cx="50"
            cy="50"
            rx="34"
            ry="36"
            fill="#FF5500"
            className="pointer-events-none"
            style={{
              filter: 'blur(16px)',
              animation: 'logo-ambient-surface 4.8s ease-in-out infinite',
              transformOrigin: '50px 50px',
            }}
          />
        )}

        {/* Layer 1: Global Floating & Swaying Motion Container */}
        <g
          filter={`url(#${idPrefix}-ambient-glow)`}
          style={{
            animation: animated ? 'logo-float-sway 4.5s ease-in-out infinite' : 'none',
            transformOrigin: '50px 50px',
            willChange: 'transform',
          }}
        >
          {/* Layer 2: Center Crossover Pulse Group */}
          <g
            style={{
              animation: animated ? 'logo-crossover-pulse 3.6s ease-in-out infinite' : 'none',
              transformOrigin: '50px 50px',
            }}
          >
            {/* Lower Ribbon Track with Dynamic Shape Flexing */}
            <g
              style={{
                animation: animated ? 'logo-lower-flex 3.8s ease-in-out infinite' : 'none',
                transformOrigin: '50px 65px',
                willChange: 'transform',
              }}
            >
              <path
                d="M 22 82
                   L 62 82
                   A 15 15 0 0 0 77 67
                   L 77 65
                   A 15 15 0 0 0 62 50
                   L 38 50"
                stroke={`url(#${idPrefix}-org-solar)`}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Upper Ribbon Track with Opposing Harmonic Shape Flexing */}
            <g
              style={{
                animation: animated ? 'logo-upper-flex 3.8s ease-in-out infinite' : 'none',
                transformOrigin: '50px 35px',
                willChange: 'transform',
              }}
            >
              <path
                d="M 78 18
                   L 38 18
                   A 15 15 0 0 0 23 33
                   L 23 35
                   A 15 15 0 0 0 38 50
                   L 62 50"
                stroke={`url(#${idPrefix}-org-upper)`}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${idPrefix}-fold-shadow)`}
              />
            </g>
          </g>

          {/* Layer 3: Polished Traveling Specular Gleam (Visibly glides along the S track) */}
          {animated && (
            <path
              d={S_TRACK}
              stroke={`url(#${idPrefix}-gleam-grad)`}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="42 155"
              className="pointer-events-none"
              style={{
                animation: 'logo-gleam-glide 3.6s ease-in-out infinite',
              }}
            />
          )}

          {/* Layer 4: Distinct Luminous Traveling Spark (Traces the curve smoothly) */}
          {animated && (
            <circle
              r="3.2"
              fill="#FFFFFF"
              filter={`url(#${idPrefix}-spark-glow)`}
              className="pointer-events-none"
            >
              <animateMotion
                path={S_TRACK}
                dur="3.8s"
                repeatCount="indefinite"
                rotate="auto"
              />
            </circle>
          )}
        </g>
      </svg>
    </span>
  );
};

export default BrandLogo;
