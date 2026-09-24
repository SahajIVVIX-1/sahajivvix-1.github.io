/**
 * Centralized configuration for Resume assets and portal.
 *
 * CRITICAL REQUIREMENTS:
 * - viewerPath MUST point to Resume_Icon.pdf (used ONLY for in-portal embedded viewing).
 * - downloadPath MUST point to Resume_WIcon.pdf (used ONLY when user clicks download).
 * - The two files MUST NOT be swapped.
 */
export const RESUME_CONFIG = {
  /** Path to PDF for in-portal viewing only */
  viewerPath: '/resume/Resume_Icon.pdf',
  /** Path to PDF for explicit download only */
  downloadPath: '/resume/Resume_WIcon.pdf',
  /** Suggested filename for downloaded file */
  downloadFilename: 'Resume_WIcon.pdf',
} as const;
