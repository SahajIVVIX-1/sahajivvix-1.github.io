import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'subtle' | 'ghost';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly href?: string;
  readonly download?: string | boolean;
  readonly target?: string;
  readonly rel?: string;
  readonly children: React.ReactNode;
}

/**
 * Editorial, minimal button control for the creative portal interface.
 * Clean modern typography, soft rounded borders, smooth tactile hover transitions.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  href,
  download,
  target,
  rel,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A]/30 disabled:opacity-40 disabled:cursor-not-allowed rounded-full';

  const sizeClasses = {
    sm: 'min-h-[36px] px-4 py-1.5 text-xs tracking-wide',
    md: 'min-h-[44px] px-6 py-2.5 text-xs md:text-sm tracking-wide',
    lg: 'min-h-[50px] px-8 py-3 text-sm md:text-base tracking-wide',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#1A1A1A] text-[#FAF8F5] hover:bg-[#333333] active:scale-[0.98] shadow-sm',
    subtle:
      'bg-white/80 text-[#1A1A1A] border border-[#1A1A1A]/15 hover:border-[#1A1A1A]/40 hover:bg-white active:scale-[0.98]',
    ghost:
      'bg-transparent text-[#5E5E5E] hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5',
  }[variant];

  const combinedClasses = `${baseClasses} ${sizeClasses} ${variantClasses} ${className}`;

  if (href) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        className={combinedClasses}
        aria-disabled={disabled}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      disabled={disabled}
      className={combinedClasses}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
