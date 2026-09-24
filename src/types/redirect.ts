/**
 * Type definitions for personal redirect destinations and internal pages.
 */

export type DestinationType = 'EXTERNAL_REDIRECT' | 'INTERNAL_PAGE';

export interface RedirectMetadata {
  readonly category?: string;
  readonly isExternal?: boolean;
  readonly tags?: readonly string[];
  readonly [key: string]: unknown;
}

export interface BaseDestination {
  /** The route slug (e.g. 'Github', 'LinkedIn', 'Portfolio', 'Resume') */
  readonly slug: string;
  /** Human-readable display name (e.g. 'GitHub', 'Resume') */
  readonly displayName: string;
  /** Whether this destination is active/enabled */
  readonly enabled: boolean;
  /** Optional descriptive text */
  readonly description?: string;
  /** Optional metadata */
  readonly metadata?: RedirectMetadata;
}

export interface ExternalRedirectDestination extends BaseDestination {
  readonly type: 'EXTERNAL_REDIRECT';
  /** Target HTTP/HTTPS URL */
  readonly destinationUrl: string;
}

export interface InternalResumeConfig {
  /** Path to the PDF file used for in-portal viewing (Resume_Icon.pdf) */
  readonly viewerAssetPath: string;
  /** Path to the PDF file used for downloads (Resume_WIcon.pdf) */
  readonly downloadAssetPath: string;
  /** Default filename suggested when downloading */
  readonly downloadFilename: string;
}

export interface InternalPageDestination extends BaseDestination {
  readonly type: 'INTERNAL_PAGE';
  /** Path of the internal route */
  readonly internalPath: string;
  /** Specific config for internal page */
  readonly config?: InternalResumeConfig;
}

export type RedirectDestination = ExternalRedirectDestination | InternalPageDestination;

export interface RedirectResolutionResult {
  readonly matched: boolean;
  readonly destination?: RedirectDestination;
  readonly normalizedSlug: string;
}
