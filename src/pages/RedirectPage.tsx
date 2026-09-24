import React, { useEffect, useState } from 'react';
import { useRedirect } from '../hooks/useRedirect';
import { useRedirectExecutor } from '../hooks/useRedirectExecutor';
import { isExternalRedirect } from '../config/redirects';
import { ResumePage } from './ResumePage';
import { NotFoundPage } from './NotFoundPage';
import { PortalShell } from '../components/PortalShell';
import { EditorialHero } from '../components/EditorialHero';

/**
 * Reusable route page handling all redirect destinations.
 * Uses the warm editorial layout with large serif typography and organic framing shapes.
 * Triggers the cinematic flower curtain transition before executing browser navigation.
 */
export const RedirectPage: React.FC = () => {
  const { matched, destination, isExecutable, isInternal, status } = useRedirect();
  const [progress, setProgress] = useState(18);
  const [statusLabel, setStatusLabel] = useState('PREPARING DESTINATION');

  // Realistic sequential state progression
  useEffect(() => {
    if (!isExecutable) return;

    const t1 = window.setTimeout(() => {
      setProgress(72);
      setStatusLabel('CONNECTING');
    }, 200);

    const t2 = window.setTimeout(() => {
      setProgress(100);
      setStatusLabel('REDIRECTING');
    }, 540);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isExecutable]);

  // If this destination is an internal page (such as Resume), render the internal page directly
  if (matched && isInternal && destination?.slug.toLowerCase() === 'resume') {
    return <ResumePage />;
  }

  // Isolated execution hook triggers transition and navigation only if destination is executable
  useRedirectExecutor({
    enabled: isExecutable,
    targetUrl: isExternalRedirect(destination) ? destination.destinationUrl : undefined,
    statusDelayMs: 600,
  });

  if (!matched || !destination || status === 'not_found') {
    return <NotFoundPage />;
  }

  if (status === 'disabled') {
    return (
      <PortalShell>
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
    <PortalShell>
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
