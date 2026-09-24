import React, { useEffect, useState, useRef } from 'react';
import { useRedirect } from '../hooks/useRedirect';
import { isExternalRedirect } from '../config/redirects';
import { NotFoundPage } from './NotFoundPage';
import { PortalShell } from '../components/PortalShell';
import { EditorialHero } from '../components/EditorialHero';
import { useTransition } from '../context/TransitionContext';

const ResumePage = React.lazy(() => import('./ResumePage'));

/**
 * Reusable route page handling all redirect destinations.
 * Smoothly progresses from initial connection to 100% without abrupt jumps.
 * Once 100% is reached, the butterfly curtain glides in to the center,
 * and the browser immediately executes the direct redirect.
 */
export const RedirectPage: React.FC = () => {
  const { matched, destination, isExecutable, isInternal, status } = useRedirect();
  const { phase, executeRedirectWithTransition } = useTransition();

  const [progress, setProgress] = useState(12);
  const [statusLabel, setStatusLabel] = useState('PREPARING DESTINATION');
  const redirectTriggeredRef = useRef(false);

  // If this destination is an internal page (such as Resume), render the internal page directly
  if (matched && isInternal && destination?.slug.toLowerCase() === 'resume') {
    return <ResumePage />;
  }

  // Smooth, organic progress progression that starts ONLY when page is revealed
  useEffect(() => {
    if (!isExecutable || !matched || !destination || redirectTriggeredRef.current) {
      return;
    }

    // Do NOT advance progress while the initial entrance curtain is still opening
    if (phase === 'entering') {
      return;
    }

    const destName = destination.displayName.toUpperCase();

    // Step 1: 36% - Resolving gateway
    const t1 = window.setTimeout(() => {
      setProgress(36);
      setStatusLabel('RESOLVING GATEWAY');
    }, 220);

    // Step 2: 64% - Connecting to destination service
    const t2 = window.setTimeout(() => {
      setProgress(64);
      setStatusLabel(`CONNECTING TO ${destName}`);
    }, 540);

    // Step 3: 88% - Link verified
    const t3 = window.setTimeout(() => {
      setProgress(88);
      setStatusLabel('LINK VERIFIED');
    }, 880);

    // Step 4: 100% - Ready to redirect
    const t4 = window.setTimeout(() => {
      setProgress(100);
      setStatusLabel('DESTINATION READY');
    }, 1200);

    // Step 5: After reaching 100%, the butterflies glide in to the center,
    // and as soon as they meet, the direct redirect happens!
    const t5 = window.setTimeout(() => {
      if (
        isExternalRedirect(destination) &&
        destination.destinationUrl &&
        !redirectTriggeredRef.current
      ) {
        redirectTriggeredRef.current = true;
        executeRedirectWithTransition(destination.destinationUrl);
      }
    }, 1420);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      window.clearTimeout(t5);
    };
  }, [isExecutable, matched, destination, phase, executeRedirectWithTransition]);

  if (!matched || !destination || status === 'not_found') {
    return <NotFoundPage />;
  }

  if (status === 'disabled') {
    return (
      <PortalShell pageSubtitle="gateway status">
        <EditorialHero
          intro="destination offline ~"
          heading={destination.displayName}
          description="This gateway link is currently unavailable."
          statusLabel="DESTINATION OFFLINE"
        />
      </PortalShell>
    );
  }

  return (
    <PortalShell pageSubtitle="gateway connecting">
      <EditorialHero
        intro="connecting you to ~"
        heading={destination.displayName}
        description="Preparing destination gateway..."
        destination={destination}
        isRedirecting={isExecutable}
        progress={progress}
        statusLabel={statusLabel}
      />
    </PortalShell>
  );
};

export default RedirectPage;
