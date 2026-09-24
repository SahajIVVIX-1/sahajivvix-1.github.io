import { useEffect, useRef } from 'react';
import { useTransition } from '../context/TransitionContext';

interface UseRedirectExecutorOptions {
  readonly enabled: boolean;
  readonly targetUrl?: string;
  readonly statusDelayMs?: number;
  readonly onRedirectStart?: () => void;
}

/**
 * Isolated browser redirect execution hook.
 * Handles delay, safety checks, cleanup, and initiates the cinematic
 * flower curtain transition before executing browser navigation.
 */
export function useRedirectExecutor({
  enabled,
  targetUrl,
  statusDelayMs = 650,
  onRedirectStart,
}: UseRedirectExecutorOptions): { readonly isRedirecting: boolean } {
  const { executeRedirectWithTransition, isTransitioning, phase } = useTransition();
  const initiatedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !targetUrl || initiatedRef.current) {
      return;
    }

    // Wait until the initial page load entrance finishes opening
    if (phase === 'entering') {
      return;
    }

    initiatedRef.current = true;
    onRedirectStart?.();

    // Allow user to see the destination status before initiating the flower transition
    const timer = window.setTimeout(() => {
      executeRedirectWithTransition(targetUrl);
    }, statusDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [enabled, targetUrl, statusDelayMs, onRedirectStart, executeRedirectWithTransition, phase]);

  return { isRedirecting: isTransitioning || initiatedRef.current };
}

export default useRedirectExecutor;
