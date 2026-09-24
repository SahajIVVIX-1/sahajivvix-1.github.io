/**
 * Centralized Design System Tokens — Premium Editorial Direction
 * Warm ivory background, editorial serif typography, and organic flat color shapes.
 */

export const THEME_TOKENS = {
  colors: {
    bgBase: '#FAF8F5',
    bgSurface: '#FFFFFF',
    bgElevated: '#F3EFEA',
    borderSubtle: 'rgba(26, 26, 26, 0.08)',
    borderMedium: 'rgba(26, 26, 26, 0.16)',
    textPrimary: '#1A1A1A',
    textSecondary: '#5E5E5E',
    textMuted: '#8E8E8E',
    shapeCyan: '#7EC9DB',
    shapeCyanInner: '#D8F0F5',
    shapeCoral: '#E04D3E',
    shapeCoralInner: '#FADBD7',
  },
  typography: {
    fontSerif: "'Playfair Display', Georgia, serif",
    fontSans: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontHandwriting: "'Caveat', cursive",
  },
  animation: {
    durationLeftShape: '15s',
    durationRightShape: '21s',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;
