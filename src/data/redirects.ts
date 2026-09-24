import { RESUME_CONFIG } from '../config/resume';
import { RedirectDestination } from '../types/redirect';

/**
 * Centralized registry of redirect destinations and internal pages.
 *
 * Real Destinations:
 * - GitHub: https://github.com/SahajIVVIX-1/ (EXTERNAL_REDIRECT)
 * - LinkedIn: https://www.linkedin.com/in/sahajs59 (EXTERNAL_REDIRECT)
 * - Portfolio: https://sahajivvix-1.github.io/Portfolio2026/ (EXTERNAL_REDIRECT)
 * - Resume: /Resume (INTERNAL_PAGE - in-portal viewer + download)
 */
export const REDIRECT_DESTINATIONS: readonly RedirectDestination[] = [
  {
    type: 'EXTERNAL_REDIRECT',
    slug: 'Github',
    displayName: 'GitHub',
    destinationUrl: 'https://github.com/SahajIVVIX-1/',
    enabled: true,
    description: 'Official GitHub profile and repositories',
    metadata: {
      category: 'social',
      isExternal: true,
      tags: ['code', 'developer', 'projects'],
    },
  },
  {
    type: 'EXTERNAL_REDIRECT',
    slug: 'LinkedIn',
    displayName: 'LinkedIn',
    destinationUrl: 'https://www.linkedin.com/in/sahajs59',
    enabled: true,
    description: 'Official LinkedIn profile',
    metadata: {
      category: 'career',
      isExternal: true,
      tags: ['professional', 'network'],
    },
  },
  {
    type: 'EXTERNAL_REDIRECT',
    slug: 'Portfolio',
    displayName: 'Portfolio',
    destinationUrl: 'https://sahajivvix-1.github.io/Portfolio2026/',
    enabled: true,
    description: 'Personal 2026 portfolio showcase',
    metadata: {
      category: 'portfolio',
      isExternal: true,
      tags: ['portfolio', 'showcase'],
    },
  },
  {
    type: 'INTERNAL_PAGE',
    slug: 'Resume',
    displayName: 'Resume',
    internalPath: '/Resume',
    enabled: true,
    description: 'Professional resume and curriculum vitae viewer & download',
    config: {
      viewerAssetPath: RESUME_CONFIG.viewerPath,
      downloadAssetPath: RESUME_CONFIG.downloadPath,
      downloadFilename: RESUME_CONFIG.downloadFilename,
    },
    metadata: {
      category: 'document',
      isExternal: false,
      tags: ['resume', 'cv', 'qualifications'],
    },
  },
];
