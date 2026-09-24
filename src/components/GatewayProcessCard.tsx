import React, { useState, useEffect } from 'react';
import { ExternalRedirectDestination } from '../types/redirect';
import { useTransition } from '../context/TransitionContext';
import { EditorialTitleWithLetterMovement } from './EditorialHero';

export interface GatewayProcessCardProps {
  readonly destination: ExternalRedirectDestination;
  readonly progress: number;
  readonly statusLabel: string;
  readonly currentStage: number; // 1 to 4
  readonly isPaused: boolean;
  readonly onTogglePause: () => void;
  readonly onProceedNow: () => void;
}

interface ProcessStage {
  readonly id: number;
  readonly name: string;
  readonly technicalDetail: string;
  readonly latencyMs: number;
}

/**
 * GatewayProcessCard
 * Follows the exact Resume page transition rule:
 * - As butterflies glide outward to the sides (phase === 'opening'), content smoothly comes up.
 * - Staggered layered entry animation matching ResumePage:
 *   - Layer 1 (delay-75): Small handwritten accent line
 *   - Layer 2 (delay-150): Editorial serif heading with subtle letter drift
 *   - Layer 3 (delay-250): Supporting descriptive prose & verified link badge
 *   - Layer 4 (delay-300): High-contrast destination endpoint & progress bar card
 *   - Layer 5 (delay-350): Behind-the-scenes gateway diagnostics & live terminal stream
 * - On exit (phase === 'closing' | 'redirecting'): Smoothly collapses with opacity-0 scale-[0.98].
 */
export const GatewayProcessCard: React.FC<GatewayProcessCardProps> = ({
  destination,
  progress,
  statusLabel,
  currentStage,
  isPaused,
  onTogglePause,
  onProceedNow,
}) => {
  const { visitorIp, phase } = useTransition();
  const [mounted, setMounted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showConsole, setShowConsole] = useState<boolean>(true);

  // Staggered entry animation on initial mount matching ResumePage rule
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const isExiting = phase === 'closing' || phase === 'redirecting';

  const targetUrl = destination.destinationUrl;
  let domain = 'destination';
  try {
    const parsed = new URL(targetUrl);
    domain = parsed.hostname;
  } catch {
    domain = targetUrl;
  }

  const stages: readonly ProcessStage[] = [
    {
      id: 1,
      name: 'Ingress & Slug Resolution',
      technicalDetail: `Route /${destination.slug} matched in registry. Ephemeral token assigned.`,
      latencyMs: 18,
    },
    {
      id: 2,
      name: 'DNS & Edge Route Discovery',
      technicalDetail: `Resolved ${domain} via Anycast DNS. Gateway route verified.`,
      latencyMs: 42,
    },
    {
      id: 3,
      name: 'TLS 1.3 Security Handshake',
      technicalDetail: 'Cryptographic SHA-256 cipher suite validated. 256-bit HTTPS active.',
      latencyMs: 65,
    },
    {
      id: 4,
      name: 'Destination Dispatch & Hand-off',
      technicalDetail: `Endpoint confirmed ready (HTTP/2 200). Handing off session.`,
      latencyMs: 28,
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Brand Icon rendering for GitHub, LinkedIn, Portfolio
  const renderBrandIcon = () => {
    const slugLower = destination.slug.toLowerCase();
    if (slugLower.includes('github')) {
      return (
        <svg className="w-8 h-8 text-[#1A1A1A]" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          />
        </svg>
      );
    }
    if (slugLower.includes('linkedin')) {
      return (
        <svg className="w-8 h-8 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    }
    if (slugLower.includes('portfolio')) {
      return (
        <svg className="w-8 h-8 text-[#E04D3E]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 3.8l7.5 13.2H4.5L12 5.8z" />
          <circle cx="12" cy="14" r="2.5" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  };

  return (
    <div
      className={`w-full max-w-3xl mx-auto flex flex-col space-y-6 select-none transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      }`}
    >
      {/* ============================================================ */}
      {/* Document & Gateway Title Header with Layered Entry Animation */}
      {/* (Exact ResumePage transition rule)                            */}
      {/* ============================================================ */}
      <div className="w-full text-center space-y-3 mb-2">
        {/* Layer 1: Small handwritten accent (delay-75) */}
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-out delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="font-handwriting text-lg md:text-xl text-neutral-500 tracking-wide block">
            connecting you to ~
          </span>
        </div>

        {/* Layer 2: Editorial serif heading with subtle letter drift (delay-150) */}
        <div
          className={`transition-all duration-700 ease-out delay-150 ${
            mounted
              ? 'opacity-100 translate-y-0 filter-none scale-100'
              : 'opacity-0 translate-y-5 blur-[3px] scale-[0.97]'
          }`}
        >
          <EditorialTitleWithLetterMovement
            title={destination.displayName}
            className="text-[clamp(2.5rem,7vw,4.5rem)]"
          />
        </div>

        {/* Layer 3: Supporting descriptive sentence (delay-250) */}
        <div
          className={`transition-all duration-500 ease-out delay-250 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <p className="text-xs sm:text-sm text-neutral-500 font-sans max-w-md mx-auto pt-1 leading-relaxed">
            {destination.description || 'Verified personal gateway endpoint and direct route for Sahaj.'}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Layer 4: Primary Destination Identity & URL Card (delay-300) */}
      {/* ============================================================ */}
      <div
        className={`w-full rounded-3xl bg-white border border-neutral-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-8 text-left transition-all duration-500 ease-out delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 shadow-xs">
              {renderBrandIcon()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#E04D3E]">
                  Gateway Routing
                </span>
                <span className="text-neutral-300">·</span>
                <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Verified Link
                </span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#1A1A1A] tracking-tight mt-0.5">
                {destination.displayName}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              type="button"
              onClick={onTogglePause}
              data-tooltip={isPaused ? 'Resume Navigation — Auto-redirect pipeline' : 'Pause Navigation — Inspect diagnostics'}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-xs font-medium text-neutral-700 transition-colors active:scale-95 cursor-pointer"
            >
              {isPaused ? (
                <>
                  <span className="text-emerald-600 font-bold">▶</span>
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <span className="text-neutral-500 font-bold">❚❚</span>
                  <span>Pause</span>
                </>
              )}
            </button>
            <a
              href={targetUrl}
              onClick={(e) => {
                e.preventDefault();
                onProceedNow();
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#1A1A1A] hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <span>Proceed Now</span>
              <span>→</span>
            </a>
          </div>
        </div>

        {/* High-contrast target URL bar with SSL Padlock & Copy */}
        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 border border-emerald-300/60 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-emerald-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[11px] font-mono text-neutral-700 font-semibold tracking-wide uppercase">
                Direct Destination Endpoint
              </span>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm sm:text-base font-mono font-medium text-[#1A1A1A] hover:text-[#E04D3E] underline-offset-2 hover:underline truncate block"
              >
                {targetUrl}
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="self-start sm:self-center shrink-0 px-3 py-1 rounded-lg text-xs font-sans font-medium text-neutral-700 hover:text-[#1A1A1A] bg-white border border-neutral-200 hover:border-neutral-300 shadow-2xs transition-colors cursor-pointer"
          >
            {copied ? '✓ Copied' : 'Copy Link'}
          </button>
        </div>

        {/* High-Contrast Progress Bar */}
        <div className="mt-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 font-sans">
              <span className="w-2 h-2 rounded-full bg-[#E04D3E] animate-pulse" />
              <span className="font-semibold tracking-wider text-[#1A1A1A] uppercase">
                {statusLabel}
              </span>
              {isPaused && (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-full font-mono">
                  [PAUSED FOR INSPECTION]
                </span>
              )}
            </div>
            <span className="font-bold text-sm text-[#1A1A1A] tabular-nums">
              {Math.min(Math.max(progress, 0), 100)}%
            </span>
          </div>

          <div className="relative w-full h-2 rounded-full bg-neutral-200/90 overflow-hidden">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-700 pt-0.5">
            <span>Gateway Stage {Math.min(Math.max(currentStage, 1), 4)} of 4</span>
            <span>Est. Hand-off: ~1.8s</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Layer 5: Backend Process & Diagnostics Card (delay-350)      */}
      {/* ============================================================ */}
      <div
        className={`w-full rounded-3xl bg-white border border-neutral-200/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-6 sm:p-7 text-left transition-all duration-500 ease-out delay-350 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600 block">
              Gateway Diagnostics
            </span>
            <h3 className="font-editorial text-xl text-[#1A1A1A] tracking-tight">
              Backend Resolution Pipeline
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className="text-xs font-mono font-medium text-neutral-700 hover:text-[#1A1A1A] bg-neutral-50 hover:bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200 transition-colors cursor-pointer"
          >
            {showConsole ? 'Hide Stream ▲' : 'Show Stream ▼'}
          </button>
        </div>

        {/* 4-Step Process Visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-5">
          {stages.map((stage) => {
            const isCompleted = currentStage > stage.id || progress >= 100;
            const isCurrent = currentStage === stage.id && progress < 100;

            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-2xl border transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                    : isCurrent
                    ? 'bg-[#FAF8F5] border-neutral-400 shadow-xs ring-1 ring-neutral-300/60'
                    : 'bg-neutral-50/50 border-neutral-200/60 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-[#1A1A1A] text-white animate-pulse'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {isCompleted ? '✓' : stage.id}
                    </span>
                    <span className="text-xs font-semibold text-[#1A1A1A]">
                      {stage.name}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-700 tabular-nums">
                    {isCompleted ? `${stage.latencyMs}ms` : isCurrent ? 'Active...' : 'Queued'}
                  </span>
                </div>

                <p className="text-[11px] font-mono text-neutral-700 leading-relaxed pl-7">
                  {stage.technicalDetail}
                </p>
              </div>
            );
          })}
        </div>

        {/* Real-time Telemetry Console Stream */}
        {showConsole && (
          <div className="mt-4 rounded-2xl bg-[#141416] p-4 text-[#F3EFEA] font-mono text-xs shadow-inner overflow-hidden border border-neutral-800">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-800 text-[11px] text-neutral-400">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span className="text-neutral-300 font-semibold uppercase tracking-wider">
                  Live Gateway Terminal
                </span>
              </div>
              <span className="text-neutral-400">
                Session: {visitorIp ? `IP ${visitorIp}` : 'Active Socket'}
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] leading-relaxed">
              <div className="text-emerald-400">
                <span className="text-neutral-500">[00:00.04]</span> INGRESS: Route requested <span className="text-white font-semibold">/{destination.slug}</span>
              </div>
              <div className="text-emerald-400">
                <span className="text-neutral-500">[00:00.18]</span> REGISTRY: Destination mapped to <span className="text-white font-semibold">{destination.displayName}</span>
              </div>

              {currentStage >= 2 && (
                <div className="text-neutral-300">
                  <span className="text-neutral-500">[00:00.35]</span> DNS: Canonical lookup resolved <span className="text-emerald-300">{domain}</span>
                </div>
              )}

              {currentStage >= 3 && (
                <div className="text-neutral-300">
                  <span className="text-neutral-500">[00:00.68]</span> SECURITY: Handshake TLS 1.3 verified (Cipher: ECDHE-RSA-AES256-GCM)
                </div>
              )}

              {currentStage >= 4 && (
                <div className="text-amber-300 font-semibold">
                  <span className="text-neutral-500">[00:01.12]</span> DISPATCH: Endpoint status 200 OK. Executing client transition.
                </div>
              )}

              {progress >= 100 && (
                <div className="text-emerald-300 font-bold">
                  <span className="text-neutral-500">[00:01.45]</span> READY: Navigation dispatched to {destination.destinationUrl}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Gateway Footer & Cancel / Hub Link */}
        <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-neutral-600 font-sans">
            Personal Digital Gateway &middot; Hosted on GitHub Pages
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onProceedNow}
              className="text-[#1A1A1A] font-semibold hover:underline underline-offset-2 cursor-pointer"
            >
              Direct Link &rarr;
            </button>
            <span className="text-neutral-300">&middot;</span>
            <a
              href="/"
              className="text-neutral-600 hover:text-[#1A1A1A] transition-colors cursor-pointer"
            >
              Cancel & Return Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatewayProcessCard;
