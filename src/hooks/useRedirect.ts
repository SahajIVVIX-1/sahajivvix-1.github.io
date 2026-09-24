import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  resolveRedirect,
  isDestinationExecutable,
  isInternalPage,
} from '../config/redirects';
import { RedirectDestination } from '../types/redirect';
import { useTransition } from '../context/TransitionContext';

export type RedirectStatus =
  | 'matched_executable'
  | 'internal_page'
  | 'disabled'
  | 'not_found';

export interface UseRedirectResult {
  readonly rawSlug: string;
  readonly matched: boolean;
  readonly destination?: RedirectDestination;
  readonly isExecutable: boolean;
  readonly isInternal: boolean;
  readonly status: RedirectStatus;
}

/**
 * Custom hook to resolve redirect destinations or internal pages from current route parameters or pathname.
 * Synchronized with the transition context's displayLocation.
 */
export function useRedirect(customSlug?: string): UseRedirectResult {
  const params = useParams<{ slug?: string }>();
  const location = useLocation();
  const { displayLocation } = useTransition();

  const activePathname = displayLocation?.pathname ?? location.pathname;

  // Extract slug from custom param, route param, or first pathname segment
  const rawSlug = useMemo(() => {
    if (customSlug) return customSlug;
    if (params.slug) return params.slug;
    const segments = activePathname.split('/').filter(Boolean);
    return segments[0] ?? '';
  }, [customSlug, params.slug, activePathname]);

  return useMemo(() => {
    const resolution = resolveRedirect(rawSlug);
    const destination = resolution.destination;

    if (!resolution.matched || !destination) {
      return {
        rawSlug,
        matched: false,
        isExecutable: false,
        isInternal: false,
        status: 'not_found',
      };
    }

    if (!destination.enabled) {
      return {
        rawSlug,
        matched: true,
        destination,
        isExecutable: false,
        isInternal: false,
        status: 'disabled',
      };
    }

    if (isInternalPage(destination)) {
      return {
        rawSlug,
        matched: true,
        destination,
        isExecutable: false,
        isInternal: true,
        status: 'internal_page',
      };
    }

    const executable = isDestinationExecutable(destination);

    return {
      rawSlug,
      matched: true,
      destination,
      isExecutable: executable,
      isInternal: false,
      status: executable ? 'matched_executable' : 'disabled',
    };
  }, [rawSlug]);
}

export default useRedirect;
