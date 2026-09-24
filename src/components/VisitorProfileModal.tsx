import React, { useEffect, useRef, useState } from 'react';
import {
  VisitorInfo,
  getSessionData,
  getInstantTelemetry,
  fetchApproximateLocation,
  ApproximateLocation,
} from '../utils/visitorDetection';
import { RadialBurstLoader } from './RadialBurstLoader';

export interface VisitorProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

/**
 * VisitorProfileModal
 *
 * A high-contrast, editorial telemetry panel showcasing the visitor's
 * detected network intelligence, browser diagnostics, and device environment.
 * Re-architected for maximum legibility, clear visual hierarchy, and prominent IP visibility.
 */
export const VisitorProfileModal: React.FC<VisitorProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sessionData] = useState(() => getSessionData());
  const [telemetry, setTelemetry] = useState<Omit<VisitorInfo, 'location'>>(() =>
    getInstantTelemetry(sessionData.startTime)
  );
  const [location, setLocation] = useState<ApproximateLocation>({
    isLoading: true,
    isApproximate: true,
  });
  const [copiedIp, setCopiedIp] = useState<boolean>(false);
  const [animatingIn, setAnimatingIn] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Live session timer updater (every 1 second)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTelemetry(getInstantTelemetry(sessionData.startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, sessionData.startTime]);

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
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Smooth modal entrance trigger
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setAnimatingIn(true);
      });
    } else {
      setAnimatingIn(false);
    }
  }, [isOpen]);

  // Copy IP address helper
  const handleCopyIp = () => {
    if (!location.ip) return;
    navigator.clipboard.writeText(location.ip).then(() => {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    });
  };

  if (!isOpen) return null;

  const displayIp = location.isLoading
    ? 'Detecting IP...'
    : location.ip || '127.0.0.1 (Local Gateway)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* High-Contrast Backdrop with Deep Blur to isolate modal cleanly */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-neutral-950/50 backdrop-blur-md transition-opacity duration-300 ease-out cursor-pointer ${
          animatingIn ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Editorial Modal Card */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-profile-title"
        className={`relative z-10 w-full max-w-xl max-h-[90vh] rounded-3xl bg-[#FAF8F5] border border-neutral-300 shadow-[0_24px_70px_rgba(0,0,0,0.28),0_4px_16px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          animatingIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-[0.96] translate-y-3'
        }`}
      >
        {/* Top Solar Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-7 pb-4 bg-[#FAF8F5] border-b border-neutral-200 shrink-0">
          <div className="flex items-center justify-between">
            {/* Presence pill badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-neutral-200 shadow-xs">
              <RadialBurstLoader size={15} color="#E65100" motion="spin-bloom" isRunning={true} />
              <span className="font-mono text-xs uppercase tracking-wider text-neutral-700 font-semibold">
                Presence Detected ~
              </span>
            </div>

            {/* Clear Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Visitor Profile"
              className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300 text-neutral-700 hover:text-neutral-950 flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-4 flex items-center gap-4">
            <div className="shrink-0 flex items-center justify-center p-2.5 rounded-2xl bg-orange-50 border border-orange-200/80 shadow-xs">
              <RadialBurstLoader size={36} color="#E65100" motion="spin-bloom" isRunning={true} />
            </div>
            <div>
              <h2
                id="visitor-profile-title"
                className="font-editorial text-2xl sm:text-3xl text-neutral-900 font-bold tracking-tight"
              >
                Visitor Profile
              </h2>
              <p className="font-handwriting text-base sm:text-lg text-neutral-600 mt-0.5">
                Your digital presence, detected locally ~
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-left select-none">
          {/* ============================================================ */}
          {/* HERO VISITOR PUBLIC IP CARD (PROMINENT & HIGH CONTRAST)      */}
          {/* ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-orange-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-600 font-bold">
                  Visitor Public IP
                </span>
              </div>

              {location.ip && (
                <button
                  type="button"
                  onClick={handleCopyIp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-mono font-medium transition-colors cursor-pointer border border-neutral-200"
                  title="Copy IP to clipboard"
                >
                  {copiedIp ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-700 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy IP</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Main IP Value Display */}
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="font-mono text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {displayIp}
              </span>
              {location.ipType && (
                <span className="px-2 py-0.5 rounded-md bg-orange-100/80 text-orange-800 font-mono text-xs font-semibold border border-orange-200">
                  {location.ipType}
                </span>
              )}
            </div>

            {/* ISP & Geolocation Pills */}
            <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2 flex-wrap text-xs">
              {location.isp && (
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                  ISP: {location.isp}
                </span>
              )}
              {location.city && (
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                  📍 {location.city}{location.region ? `, ${location.region}` : ''}
                </span>
              )}
              {location.country && (
                <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                  {location.country}
                </span>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 1: IDENTITY & SESSION                                */}
          {/* ============================================================ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-600 font-bold">
                Identity / Session
              </span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

          {/* ============================================================ */}
          {/* SECTION 2: DEVICE & DISPLAY                                  */}
          {/* ============================================================ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-600 font-bold">
                Device & Display
              </span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

          {/* ============================================================ */}
          {/* SECTION 3: ENVIRONMENT & NETWORK                             */}
          {/* ============================================================ */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-neutral-600 font-bold">
                Environment & Diagnostics
              </span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                label="Network Status"
                value={telemetry.isOnline ? 'Online · Connected' : 'Offline'}
                accent={telemetry.isOnline ? 'emerald' : undefined}
              />
              <InfoTile
                label="CPU Cores"
                value={telemetry.cpuCores}
              />
              <InfoTile
                label="Device Memory"
                value={telemetry.deviceMemory}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer with Privacy Assurance */}
        <div className="px-6 py-4 bg-neutral-100/90 border-t border-neutral-200 flex items-center justify-center gap-2 text-center shrink-0">
          <svg
            className="w-3.5 h-3.5 text-neutral-500 shrink-0"
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
          <span className="text-xs font-sans text-neutral-600 font-medium">
            Detected from your browser session · No private credentials accessed
          </span>
        </div>
      </div>
    </div>
  );
};

export interface VisitorProfileTriggerProps {
  readonly isOpen: boolean;
  readonly onClick: () => void;
  readonly className?: string;
}

export const VisitorProfileTrigger: React.FC<VisitorProfileTriggerProps> = ({
  isOpen,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Inspect Visitor Intelligence Profile"
      aria-expanded={isOpen}
      className={`group relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-transparent border-0 outline-none shadow-none cursor-pointer transition-transform duration-200 hover:scale-115 active:scale-90 select-none shrink-0 ${className}`}
      title="Visitor Intelligence Profile"
    >
      <RadialBurstLoader
        size={26}
        color="#E65100"
        motion="solar-iris"
        isRunning={true}
      />
    </button>
  );
};

interface InfoTileProps {
  readonly label: string;
  readonly value: string;
  readonly isMono?: boolean;
  readonly accent?: 'emerald';
}

const InfoTile: React.FC<InfoTileProps> = ({
  label,
  value,
  isMono = false,
  accent,
}) => {
  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex flex-col justify-between overflow-hidden hover:border-neutral-300 hover:shadow-sm transition-all">
      <span className="text-neutral-500 font-mono text-xs uppercase tracking-wider font-semibold truncate mb-1.5">
        {label}
      </span>
      <span
        className={`text-neutral-900 font-semibold text-sm sm:text-[15px] truncate ${
          isMono ? 'font-mono text-xs sm:text-[13px]' : 'font-sans'
        } ${accent === 'emerald' ? 'text-emerald-700 flex items-center gap-2' : ''}`}
      >
        {accent === 'emerald' && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block animate-pulse" />
        )}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
};

export default VisitorProfileModal;
