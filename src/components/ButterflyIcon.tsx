import React from 'react';

export interface ButterflyIconProps {
  readonly className?: string;
  readonly size?: number;
  readonly isOpen?: boolean;
  readonly showGlow?: boolean;
}

/**
 * ButterflyIcon
 * Professional, editorial luxury vector butterfly glyph.
 * Architectural curves, delicate wing vanes, antennae, and a luminous cyan heart.
 */
export const ButterflyIcon: React.FC<ButterflyIconProps> = ({
  className = '',
  size = 20,
  isOpen = false,
  showGlow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-all duration-300 select-none pointer-events-none ${className}`}
    >
      <defs>
        {/* Subtle cyan glow for the nucleus */}
        <radialGradient id="butterfly-nucleus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7EC9DB" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#7EC9DB" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7EC9DB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Left Upper Wing */}
      <path
        d="M 12 11.2 C 10.8 7.5, 6.2 4.2, 3.4 5.8 C 1.8 6.7, 1.8 10.4, 4.2 12.6 C 6.5 14.6, 10.5 13.8, 12 13.5"
        fill="currentColor"
        fillOpacity={isOpen ? '0.22' : '0.12'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Lower Wing */}
      <path
        d="M 12 13.5 C 10.6 14.8, 6.6 17.2, 5.4 18.8 C 4.4 20.2, 5.8 21.4, 7.6 20.4 C 9.5 19.1, 11.4 16.6, 12 15.2"
        fill="currentColor"
        fillOpacity={isOpen ? '0.18' : '0.08'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Upper Wing (Symmetrically Mirrored) */}
      <path
        d="M 12 11.2 C 13.2 7.5, 17.8 4.2, 20.6 5.8 C 22.2 6.7, 22.2 10.4, 19.8 12.6 C 17.5 14.6, 13.5 13.8, 12 13.5"
        fill="currentColor"
        fillOpacity={isOpen ? '0.22' : '0.12'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Lower Wing (Symmetrically Mirrored) */}
      <path
        d="M 12 13.5 C 13.4 14.8, 17.4 17.2, 18.6 18.8 C 19.6 20.2, 18.2 21.4, 16.4 20.4 C 14.5 19.1, 12.6 16.6, 12 15.2"
        fill="currentColor"
        fillOpacity={isOpen ? '0.18' : '0.08'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Internal Delicate Wing Vein Accents */}
      <path
        d="M 12 11.8 C 9.5 9.5, 6.8 8.2, 4.8 8.6"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M 12 11.8 C 14.5 9.5, 17.2 8.2, 19.2 8.6"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />

      {/* Antennae Wisps */}
      <path
        d="M 12 7.6 C 11 5.4, 9 4.2, 7.8 4.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M 12 7.6 C 13 5.4, 15 4.2, 16.2 4.4"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Slender Aerodynamic Central Body */}
      <path
        d="M 12 7.2 L 12 17.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Luminous Cyan Heart Nucleus */}
      {showGlow && (
        <circle cx="12" cy="12.2" r="3.2" fill="url(#butterfly-nucleus-glow)" />
      )}
      <circle
        cx="12"
        cy="12.2"
        r="1.4"
        fill="#7EC9DB"
        className="transition-transform duration-300"
      />
    </svg>
  );
};

export interface ButterflyLoaderProps {
  readonly size?: 'xs' | 'sm' | 'md' | 'lg';
  readonly className?: string;
  readonly label?: string;
}

/**
 * ButterflyLoader
 * Subtle, organic fluttering butterfly loading animation.
 * Replaces generic spinning rings with an editorial, brand-authentic presence.
 */
export const ButterflyLoader: React.FC<ButterflyLoaderProps> = ({
  size = 'sm',
  className = '',
  label,
}) => {
  const pixelSize = size === 'xs' ? 14 : size === 'sm' ? 18 : size === 'md' ? 32 : 44;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center animate-pulse"
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* Ambient subtle beacon pulse */}
        <span
          className="absolute inset-0 rounded-full bg-[#7EC9DB]/20 animate-ping"
          style={{ animationDuration: '2.4s' }}
        />

        {/* Fluttering Butterfly Entity */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform text-[#1A1A1A]"
          style={{
            animation: 'butterfly-flutter 1.8s ease-in-out infinite alternate',
          }}
        >
          <ButterflyIcon size={pixelSize} showGlow />
        </div>
      </div>

      {label && (
        <span className="font-editorial italic text-xs sm:text-sm text-neutral-500">
          {label}
        </span>
      )}
    </div>
  );
};

export default ButterflyIcon;
