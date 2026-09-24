import React from 'react';

export interface AnimatedBackgroundProps {
  readonly variant?: 'full' | 'subtle';
}

/**
 * Canvas background layer maintaining warm off-white tones.
 * The persistent organic flower shapes are anchored at the layout level
 * to guarantee seamless transitions between routes.
 */
export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 bg-[#FAF8F5]"
      aria-hidden="true"
    />
  );
};

export default AnimatedBackground;
