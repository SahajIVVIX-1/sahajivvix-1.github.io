import { REDIRECT_DESTINATIONS } from '../data/redirects';
import { isValidUrl } from '../lib/utils';
import {
  ExternalRedirectDestination,
  InternalPageDestination,
  RedirectDestination,
  RedirectResolutionResult,
} from '../types/redirect';

/**
 * Global configuration options for the redirect system.
 */
export const REDIRECT_CONFIG = {
  /** Delay in milliseconds before triggering browser navigation in temporary state */
  executionDelayMs: 600,
} as const;

/**
 * Normalizes a route path or slug for resilient comparison.
 * - Trims whitespace
 * - Strips leading slashes ('/')
 * - Strips trailing slashes ('/')
 * - Converts to lower case for case-insensitive matching
 *
 * Examples:
 *   '/Github'   -> 'github'
 *   '/github/'  -> 'github'
 *   'Portfolio' -> 'portfolio'
 *   '/Resume/'  -> 'resume'
 */
export function normalizeSlug(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return input.trim().replace(/^\/+|\/+$/g, '').toLowerCase();
}

/**
 * Returns all configured destinations and internal pages from the centralized registry.
 */
export function getAllRedirectDestinations(): readonly RedirectDestination[] {
  return REDIRECT_DESTINATIONS;
}

/**
 * Resolves a redirect destination or internal page from a raw path or route parameter.
 * Case-insensitive and safe against leading/trailing slashes.
 *
 * @param slugOrPath - The requested slug or path (e.g. 'Github', '/Github/', 'resume', '/Resume/')
 * @returns RedirectResolutionResult containing match status and destination if found.
 */
export function resolveRedirect(slugOrPath: string): RedirectResolutionResult {
  const normalized = normalizeSlug(slugOrPath);

  if (!normalized) {
    return {
      matched: false,
      normalizedSlug: '',
    };
  }

  const destination = REDIRECT_DESTINATIONS.find((dest) => {
    return normalizeSlug(dest.slug) === normalized;
  });

  return {
    matched: Boolean(destination),
    destination,
    normalizedSlug: normalized,
  };
}

/**
 * Type guard to check whether a destination is an external redirect.
 */
export function isExternalRedirect(
  destination?: RedirectDestination
): destination is ExternalRedirectDestination {
  return destination?.type === 'EXTERNAL_REDIRECT';
}

/**
 * Type guard to check whether a destination is an internal page (like Resume).
 */
export function isInternalPage(
  destination?: RedirectDestination
): destination is InternalPageDestination {
  return destination?.type === 'INTERNAL_PAGE';
}

/**
 * Checks whether an external redirect destination is enabled AND contains a valid HTTP/HTTPS URL.
 * Only if this returns true may browser redirection proceed.
 */
export function isDestinationExecutable(
  destination?: RedirectDestination
): destination is ExternalRedirectDestination {
  if (!destination || destination.type !== 'EXTERNAL_REDIRECT') {
    return false;
  }
  return destination.enabled === true && isValidUrl(destination.destinationUrl);
}
