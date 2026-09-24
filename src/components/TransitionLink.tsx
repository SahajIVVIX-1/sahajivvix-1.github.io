import React from 'react';
import { useTransition } from '../context/TransitionContext';

export interface TransitionLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  readonly to: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/**
 * Reusable link component that triggers the organic flower page transition
 * instead of full browser reload or instant uncurtained swap.
 */
export const TransitionLink: React.FC<TransitionLinkProps> = ({
  to,
  children,
  className = '',
  onClick,
  ...rest
}) => {
  const { navigateWithTransition, isTransitioning } = useTransition();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If external link or user opens in new tab (Ctrl/Cmd/middle click), allow native behavior
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      to.startsWith('http://') ||
      to.startsWith('https://') ||
      to.startsWith('//')
    ) {
      onClick?.(e);
      return;
    }

    e.preventDefault();
    onClick?.(e);

    if (!isTransitioning) {
      navigateWithTransition(to);
    }
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      className={className}
      aria-disabled={isTransitioning}
      {...rest}
    >
      {children}
    </a>
  );
};

export default TransitionLink;
