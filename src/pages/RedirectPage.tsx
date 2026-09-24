import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRedirect } from '../hooks/useRedirect';
import { isExternalRedirect } from '../config/redirects';
import { NotFoundPage } from './NotFoundPage';
import { PortalShell } from '../components/PortalShell';
import { EditorialHero } from '../components/EditorialHero';
import { useTransition } from '../context/TransitionContext';
import { GatewayProcessCard } from '../components/GatewayProcessCard';

const ResumePage = React.lazy(() => import('./ResumePage'));

/**
 * Enhanced Gateway Route Page
 * Handles /Github, /Linkedin, /Portfolio and all other redirect endpoints.
 * Displays high-contrast, polished destination cards and a live 4-stage
 * backend resolution pipeline explaining the entire routing & security process.
 */
export const RedirectPage: React.FC = () => {
  const { matched, destination, isExecutable, isInternal, status } = useRedirect();
  const { phase, executeRedirectWithTransition } = useTransition();

  const [progress, setProgress] = useState(15);
  const [currentStage, setCurrentStage] = useState(1);
  const [statusLabel, setStatusLabel] = useState('RESOLVING INGRESS');
  const [isPaused, setIsPaused] = useState(false);

  const redirectTriggeredRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  // If this destination is an internal page (such as Resume), render the internal page directly
  if (matched && isInternal && destination?.slug.toLowerCase() === 'resume') {
    return <ResumePage />;
  }

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) {
        clearAllTimers();
      }
      return next;
    });
  };

  const handleProceedNow = useCallback(() => {
    if (
      isExternalRedirect(destination) &&
      destination.destinationUrl &&
      !redirectTriggeredRef.current
    ) {
      redirectTriggeredRef.current = true;
      clearAllTimers();
      executeRedirectWithTransition(destination.destinationUrl);
    }
  }, [destination, executeRedirectWithTransition]);

  // Progressive multi-stage execution pipeline
  useEffect(() => {
    if (!isExecutable || !matched || !destination || redirectTriggeredRef.current) {
      return;
    }

    // In accordance with ResumePage transition rule:
    // As butterflies transition outside (phase === 'opening' or 'idle'),
    // the page content and background float up, and the diagnostic pipeline begins
    if (phase === 'closing' || phase === 'redirecting' || isPaused) {
      clearAllTimers();
      return;
    }

    clearAllTimers();

    // Stage 1: Ingress & Slug Resolution (starts at 15%)
    const t1 = window.setTimeout(() => {
      setProgress(28);
      setCurrentStage(1);
      setStatusLabel('MATCHING ROUTE REGISTRY');
    }, 350);

    // Stage 2: DNS & Edge Discovery
    const t2 = window.setTimeout(() => {
      setProgress(55);
      setCurrentStage(2);
      setStatusLabel('RESOLVING CANONICAL DNS');
    }, 900);

    // Stage 3: TLS 1.3 Security Handshake
    const t3 = window.setTimeout(() => {
      setProgress(82);
      setCurrentStage(3);
      setStatusLabel('ESTABLISHING TLS 1.3 HANDSHAKE');
    }, 1700);

    // Stage 4: Destination Dispatch
    const t4 = window.setTimeout(() => {
      setProgress(100);
      setCurrentStage(4);
      setStatusLabel('DESTINATION READY · DISPATCHING');
    }, 2500);

    // Auto-transition execution
    const t5 = window.setTimeout(() => {
      if (
        isExternalRedirect(destination) &&
        destination.destinationUrl &&
        !redirectTriggeredRef.current &&
        !isPaused
      ) {
        redirectTriggeredRef.current = true;
        executeRedirectWithTransition(destination.destinationUrl);
      }
    }, 3200);

    timersRef.current = [t1, t2, t3, t4, t5];

    return () => {
      clearAllTimers();
    };
  }, [isExecutable, matched, destination, phase, isPaused, executeRedirectWithTransition]);

  if (!matched || !destination || status === 'not_found') {
    return <NotFoundPage />;
  }

  if (status === 'disabled') {
    return (
      <PortalShell pageSubtitle="gateway status">
        <EditorialHero
          intro="destination offline ~"
          heading={destination.displayName}
          description="This gateway link is currently unavailable or disabled."
          statusLabel="DESTINATION OFFLINE"
        />
      </PortalShell>
    );
  }

  if (isExternalRedirect(destination)) {
    return (
      <PortalShell
        pageSubtitle={`gateway · ${destination.slug.toLowerCase()}`}
        footerSubtitle="destination gateway ~"
        maxWidth="5xl"
        centerContent={false}
        stickyFooter={true}
        contentClassName="pt-6 md:pt-10 pb-20 md:pb-28"
      >
        <GatewayProcessCard
          destination={destination}
          progress={progress}
          statusLabel={statusLabel}
          currentStage={currentStage}
          isPaused={isPaused}
          onTogglePause={handleTogglePause}
          onProceedNow={handleProceedNow}
        />
      </PortalShell>
    );
  }

  return null;
};

export default RedirectPage;
