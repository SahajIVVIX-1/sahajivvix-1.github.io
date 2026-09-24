import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate, Location } from 'react-router-dom';

export type TransitionPhase =
  | 'entering'
  | 'idle'
  | 'closing'
  | 'opening'
  | 'redirecting';

type PendingNavigation =
  | { readonly type: 'internal'; readonly to: string }
  | { readonly type: 'history'; readonly location: Location };

export interface TransitionContextValue {
  readonly phase: TransitionPhase;
  readonly isTransitioning: boolean;
  readonly displayLocation: Location;
  readonly navigateWithTransition: (to: string) => void;
  readonly executeRedirectWithTransition: (targetUrl: string) => void;
  readonly onCurtainHitCenter: () => void;
  readonly onCurtainOpened: () => void;
  readonly onEntranceComplete: () => void;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export const TransitionProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const prefersReducedMotion = useCallback(() => {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  // Initial load starts with an opening entrance curtain unless reduced motion is active
  const [phase, setPhase] = useState<TransitionPhase>(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 'idle';
    }
    return 'entering';
  });

  // Display location keeps the currently displayed DOM page in sync with transitions
  const [displayLocation, setDisplayLocation] = useState<Location>(routerLocation);
  const pendingNavRef = useRef<PendingNavigation | null>(null);
  const redirectTargetRef = useRef<string | null>(null);
  const redirectExecutedRef = useRef(false);

  // Monitor native browser history events (Back / Forward / Alt+Left / Alt+Right)
  useEffect(() => {
    // If the browser router's URL has changed from what is currently showing on screen
    if (routerLocation.pathname !== displayLocation.pathname) {
      // Respect accessibility preference
      if (prefersReducedMotion()) {
        setDisplayLocation(routerLocation);
        return;
      }

      // If navigation happens while idle or during entrance
      if (phase === 'idle' || phase === 'entering') {
        // Hold displayLocation at old route and start flower transition toward center
        pendingNavRef.current = { type: 'history', location: routerLocation };
        setPhase('closing');
      } else if (phase === 'opening') {
        // If user hits Back/Forward while the previous curtain was opening, smoothly reverse
        pendingNavRef.current = { type: 'history', location: routerLocation };
        setPhase('closing');
      } else if (phase === 'closing') {
        // If user hits Back/Forward repeatedly while closing, update target to latest
        pendingNavRef.current = { type: 'history', location: routerLocation };
      }
    }
  }, [routerLocation, displayLocation.pathname, phase, prefersReducedMotion]);

  /**
   * Internal page navigation initiated via TransitionLink or button click
   */
  const navigateWithTransition = useCallback(
    (to: string) => {
      // Do nothing if navigating to the same route while idle
      if (to === displayLocation.pathname && phase === 'idle') {
        return;
      }

      if (prefersReducedMotion()) {
        navigate(to);
        setDisplayLocation((prev) => ({
          ...prev,
          pathname: to,
          key: `nav-${Date.now()}`,
        }));
        return;
      }

      pendingNavRef.current = { type: 'internal', to };
      setPhase('closing');
    },
    [displayLocation.pathname, navigate, phase, prefersReducedMotion]
  );

  /**
   * External redirect: initiates flower curtain toward center before replacing location
   */
  const executeRedirectWithTransition = useCallback(
    (targetUrl: string) => {
      if (redirectExecutedRef.current) {
        return;
      }
      redirectExecutedRef.current = true;
      redirectTargetRef.current = targetUrl;

      if (prefersReducedMotion()) {
        window.location.replace(targetUrl);
        return;
      }

      setPhase('redirecting');
    },
    [prefersReducedMotion]
  );

  /**
   * Called by OrganicShapes when the flowers meet at the center curtain
   */
  const onCurtainHitCenter = useCallback(() => {
    // External redirect target
    if (phase === 'redirecting') {
      if (redirectTargetRef.current) {
        window.location.replace(redirectTargetRef.current);
      }
      return;
    }

    const pending = pendingNavRef.current;
    if (pending) {
      if (pending.type === 'internal') {
        // Synchronously update route under the closed flower curtain
        navigate(pending.to);
        setDisplayLocation((prev) => ({
          ...prev,
          pathname: pending.to,
          search: '',
          hash: '',
          key: `nav-${Date.now()}`,
        }));
      } else if (pending.type === 'history') {
        // Browser history navigation (Back/Forward): resolve DOM to target route
        setDisplayLocation(pending.location);
      }
      pendingNavRef.current = null;
    }

    // Now flow smoothly from the center back outward to orbital paths
    setPhase('opening');
  }, [phase, navigate]);

  /**
   * Called by OrganicShapes when flowers have smoothly returned outward to orbital paths
   */
  const onCurtainOpened = useCallback(() => {
    setPhase('idle');
  }, []);

  /**
   * Called by OrganicShapes when the initial page entrance animation completes
   */
  const onEntranceComplete = useCallback(() => {
    setPhase('idle');
  }, []);

  const value: TransitionContextValue = {
    phase,
    isTransitioning: phase !== 'idle',
    displayLocation,
    navigateWithTransition,
    executeRedirectWithTransition,
    onCurtainHitCenter,
    onCurtainOpened,
    onEntranceComplete,
  };

  return (
    <TransitionContext.Provider value={value}>
      {children}
    </TransitionContext.Provider>
  );
};

export function useTransition(): TransitionContextValue {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
}

export default TransitionContext;
