import React from 'react';
import { AnimatedBackground, AnimatedBackgroundProps } from './AnimatedBackground';

export interface BackgroundLayerProps extends AnimatedBackgroundProps {}

/**
 * High-performance ambient background layer with animated atmosphere.
 * Re-exports AnimatedBackground for compatibility.
 */
export const BackgroundLayer: React.FC<BackgroundLayerProps> = (props) => {
  return <AnimatedBackground {...props} />;
};

export default BackgroundLayer;
