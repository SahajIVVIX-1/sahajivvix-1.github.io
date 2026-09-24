import React, { useEffect, useState, useRef } from 'react';
import {
  VisitorInfo,
  getInstantTelemetry,
  getSessionData,
  fetchApproximateLocation,
} from '../utils/visitorDetection';
import { RadialBurstLoader } from './RadialBurstLoader';

export interface VisitorProfileTriggerProps {
  readonly onClick: () => void;
  readonly isOpen: boolean;
  readonly className?: string;
}

/**
 * VisitorProfileTrigger
 * Borderless, organic animated radial starburst loader matching the video specification.
 * Replaces both "ONLINE" and "Resume / CV" on the top right.
 * No surrounding circular border or box.
 */
export const VisitorProfileTrigger: React.FC<VisitorProfileTriggerProps> = ({
  onClick,
  isOpen,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Visitor Profile & System Intelligence"
      aria-expanded={isOpen}
      title="Visitor Profile & Digital Presence"
      className={`group relative shrink-0 w-9 h-9 flex items-center justify-center cursor-pointer transition-transform duration-200 active:scale-90 hover:scale-110 focus:outline-none overflow-visible ${className}`}
    >
      <RadialBurstLoader
        size={28}
        color={isOpen ? '#1A1A1A' : '#D46853'}
        isRunning={true}
      />
    </button>
  );
};

export interface VisitorProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/**
 * VisitorProfileModal
 * High-craft, warm editorial floating intelligence card.
 * Continuously computes browser environment telemetry legitimately without intrusive permissions.
 */
export const VisitorProfileModal: React.FC<VisitorProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Instant snapshot state
  const [telemetry, setTelemetry] = useState<Omit<VisitorInfo, 'location'>>(() => {
    const session = getSessionData();
    startTimeRef.current = session.startTime;
    return getInstantTelemetry(session.startTime);
  });

  // Location state
  const [location, setLocation] = useState<VisitorInfo['location']>({
    isApproximate: true,
    isLoading: true,
  });

  // Animation mounting state for smooth transition
  const [mounted, setMounted] = useState<boolean>(false);
  const [animatingIn, setAnimatingIn] = useState<boolean>(false);

  // Handle open / close animations with silky smooth spring
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const timer = setTimeout(() => {
        setAnimatingIn(true);
      }, 20);
      return () => clearTimeout(timer);
    } else {
      setAnimatingIn(false);
      const timer = setTimeout(() => {
        setMounted(false);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Live session timer & time ticker (1-second tick)
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      setTelemetry(getInstantTelemetry(startTimeRef.current));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Dynamic window resize listener for viewport resolution
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      setTelemetry((prev) => ({
        ...prev,
        viewportSize: `${window.innerWidth} × ${window.innerHeight} px`,
      }));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Live online/offline status listener
  useEffect(() => {
    const handleStatus = () => {
      setTelemetry((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
      }));
    };

    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Fetch approximate geolocation once when opened
  useEffect(() => {
    if (!isOpen || !location.isLoading) return;

    let isSubscribed = true;
    fetchApproximateLocation().then((loc) => {
      if (isSubscribed) {
        setLocation(loc);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, location.isLoading]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-start justify-center sm:justify-end select-none">
      {/* 
        Dimmed, softened backdrop 
        Smooth fade, subtle blur, click outside to close
      */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-neutral-900/18 backdrop-blur-[2px] transition-opacity duration-300 ease-out cursor-pointer ${
          animatingIn ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 
        Floating Glass / Paper Editorial Panel:
        Desktop: Positioned from top-right near the header trigger with smooth deceleration.
        Mobile: Graceful bottom-sheet modal.
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-profile-title"
        className={`relative z-10 w-full sm:w-[470px] md:w-[500px] max-h-[85vh] sm:max-h-[calc(100vh-5.5rem)] sm:mr-6 md:mr-10 sm:mt-18 md:mt-20 rounded-t-3xl sm:rounded-3xl bg-[#FAF8F5]/96 backdrop-blur-2xl border border-neutral-200/90 shadow-[0_32px_72px_rgba(26,26,26,0.14),0_6px_20px_rgba(26,26,26,0.06)] flex flex-col overflow-hidden origin-top-right transition-all duration-400 cubic-bezier(0.16,1,0.3,1) ${
          animatingIn
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 sm:-translate-y-2 scale-[0.96]'
        }`}
      >
        {/* Editorial Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#D46853]/40 to-transparent shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-neutral-200/70 shrink-0">
          <div className="flex items-center justify-between">
            {/* Presence pill badge with rotating blooming logo */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 border border-neutral-200/70 shadow-xs">
              <RadialBurstLoader size={14} color="#D46853" motion="spin-bloom" isRunning={true} />
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                presence detected ~
              </span>
            </div>

            {/* Minimal close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Visitor Profile"
              className="w-7 h-7 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title & Subtitle with prominent spin-bloom logo */}
          <div className="mt-3.5 flex items-center gap-3.5">
            <div className="shrink-0 flex items-center justify-center p-2 rounded-2xl bg-[#D46853]/10 border border-[#D46853]/20 shadow-xs">
              <RadialBurstLoader size={34} color="#D46853" motion="spin-bloom" isRunning={true} />
            </div>
            <div>
              <h2
                id="visitor-profile-title"
                className="font-editorial text-2xl sm:text-[26px] text-[#1A1A1A] font-medium tracking-tight"
              >
                Visitor Profile
              </h2>
              <p className="font-handwriting text-base text-neutral-500 mt-0.5">
                Your digital presence, detected locally ~
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left text-xs select-none">
          {/* SECTION 1: IDENTITY / SESSION */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Identity / Session
              </span>
              <span className="h-px flex-1 bg-neutral-200/70" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Public Visitor IP Address */}
              <div className="col-span-2">
                <InfoTile
                  label="Visitor Public IP"
                  value={
                    location.isLoading
                      ? 'Detecting network address...'
                      : location.ip
                      ? `${location.ip} ${location.ipType ? `(${location.ipType})` : ''}`
                      : 'Local / Shielded'
                  }
                  isMono
                  accent="cyan"
                />
              </div>
              <InfoTile
                label="Session ID"
                value={telemetry.sessionId}
                isMono
              />
              <InfoTile
                label="Visitor Record"
                value={telemetry.visitorNumber}
                isMono
              />
              <InfoTile
                label="Session Duration"
                value={telemetry.sessionDuration}
                isMono
              />
              <InfoTile
                label="Local Time"
                value={telemetry.localTime}
              />
            </div>
          </div>

          {/* SECTION 2: DEVICE */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Device & Display
              </span>
              <span className="h-px flex-1 bg-neutral-200/70" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile
                label="Device Form"
                value={telemetry.deviceType}
              />
              <InfoTile
                label="Operating System"
                value={telemetry.os}
              />
              <InfoTile
                label="Browser Engine"
                value={telemetry.browser}
              />
              <InfoTile
                label="Pixel Ratio (DPR)"
                value={telemetry.devicePixelRatio}
              />
              <InfoTile
                label="Screen Resolution"
                value={telemetry.screenResolution}
                isMono
              />
              <InfoTile
                label="Live Viewport"
                value={telemetry.viewportSize}
                isMono
              />
              <div className="col-span-2">
                <InfoTile
                  label="Pointer & Touch"
                  value={telemetry.touchSupport}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ENVIRONMENT */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Environment
              </span>
              <span className="h-px flex-1 bg-neutral-200/70" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="col-span-2">
                <InfoTile
                  label="Local Timezone"
                  value={telemetry.timezone}
                />
              </div>
              <InfoTile
                label="Locale Language"
                value={telemetry.language}
              />
              <InfoTile
                label="Color Scheme"
                value={telemetry.colorScheme}
              />
              <InfoTile
                label="Storage & Cookies"
                value={telemetry.cookiesEnabled ? 'Active / Enabled' : 'Restricted'}
              />
              <InfoTile
                label="Network Status"
                value={telemetry.isOnline ? 'Online · Connected' : 'Offline'}
                accent={telemetry.isOnline ? 'cyan' : undefined}
              />
            </div>
          </div>

          {/* SECTION 4: SYSTEM */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                System Diagnostics
              </span>
              <span className="h-px flex-1 bg-neutral-200/70" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <InfoTile
                label="CPU Concurrency"
                value={telemetry.cpuCores}
              />
              <InfoTile
                label="Device Memory"
                value={telemetry.deviceMemory}
              />
              <div className="col-span-2">
                <InfoTile
                  label="Effective Link"
                  value={telemetry.connectionType}
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: APPROXIMATE LOCATION & NETWORK */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Network & Location
              </span>
              <span className="h-px flex-1 bg-neutral-200/70" />
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-neutral-200/70 space-y-2">
              {/* Public IP */}
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-mono text-[11px]">Public IP</span>
                <span className="text-[#1A1A1A] font-mono font-medium text-right text-xs">
                  {location.isLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-neutral-400">
                      <RadialBurstLoader size={12} color="#D46853" motion="spin-bloom" isRunning={true} />
                      Detecting...
                    </span>
                  ) : (
                    location.ip || 'Shielded / Private'
                  )}
                </span>
              </div>

              {/* ISP Provider */}
              {location.isp && (
                <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                  <span className="text-neutral-500 font-mono text-[11px]">Provider / ISP</span>
                  <span className="text-[#1A1A1A] font-medium text-right truncate max-w-[200px]">
                    {location.isp}
                  </span>
                </div>
              )}

              {/* Region & City */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <span className="text-neutral-500 font-mono text-[11px]">Region & City</span>
                <span className="text-[#1A1A1A] font-medium text-right">
                  {location.isLoading ? (
                    <span className="text-neutral-400 font-mono text-[11px]">Resolving...</span>
                  ) : location.city && location.region ? (
                    `${location.city}, ${location.region}`
                  ) : (
                    location.city || 'Local / Private Network'
                  )}
                </span>
              </div>

              {/* Country */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <span className="text-neutral-500 font-mono text-[11px]">Country</span>
                <span className="text-[#1A1A1A] font-medium">
                  {location.isLoading ? (
                    <span className="font-mono text-neutral-400 text-[11px]">Detecting...</span>
                  ) : (
                    location.country || 'Global'
                  )}
                </span>
              </div>

              {/* Precision note */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[10px] text-neutral-400">
                <span>Precision</span>
                <span className="font-mono text-[10px] text-neutral-400">
                  Network Gateway (No GPS)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Tasteful Privacy Assurance */}
        <div className="px-5 py-3.5 bg-neutral-100/60 border-t border-neutral-200/60 flex items-center justify-center gap-1.5 text-center shrink-0">
          <svg
            className="w-3 h-3 text-neutral-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-[11px] font-sans text-neutral-500 tracking-tight">
            Detected from your browser session · No private data accessed
          </span>
        </div>
      </div>
    </div>
  );
};

interface InfoTileProps {
  label: string;
  value: string;
  isMono?: boolean;
  accent?: 'cyan';
}

const InfoTile: React.FC<InfoTileProps> = ({ label, value, isMono = false, accent }) => {
  return (
    <div className="p-2.5 sm:p-3 rounded-2xl bg-white/70 border border-neutral-200/70 flex flex-col justify-between overflow-hidden shadow-2xs hover:bg-white/90 transition-colors">
      <span className="text-neutral-400 font-mono text-[10px] uppercase tracking-wider truncate mb-1">
        {label}
      </span>
      <span
        className={`text-[#1A1A1A] font-medium text-xs truncate ${
          isMono ? 'font-mono text-[11px]' : 'font-sans'
        } ${accent === 'cyan' ? 'text-[#1A1A1A] flex items-center gap-1.5' : ''}`}
      >
        {accent === 'cyan' && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#7EC9DB] shrink-0 inline-block" />
        )}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
};

export default VisitorProfileModal;
