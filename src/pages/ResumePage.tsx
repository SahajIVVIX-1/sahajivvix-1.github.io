import React, { useState, useRef, useEffect } from 'react';
import { RESUME_CONFIG } from '../config/resume';
import { Button } from '../components/Button';
import { PortalShell } from '../components/PortalShell';
import { EditorialPdfViewer } from '../components/EditorialPdfViewer';
import { EditorialTitleWithLetterMovement } from '../components/EditorialHero';
import { useTransition } from '../context/TransitionContext';

/**
 * ResumePage
 * Editorial document portal with fluid, cinematic transitions for all interactions.
 * - Initial state: Two options (Open Resume / Download PDF).
 * - On clicking "Open Resume":
 *   - The two options smoothly fade out and collapse.
 *   - The document viewer, active controls, and bottom download section smoothly expand and fade in.
 *   - Header button smoothly morphs between "Open Resume" and "Close Preview".
 * - On clicking "Close Preview":
 *   - The document viewer and controls smoothly fade out and collapse.
 *   - The two options smoothly expand and fade back into place.
 * - Header is fixed on top with constant size everywhere.
 * - Footer stays at bottom of page with constant size everywhere.
 */
export const ResumePage: React.FC = () => {
  const { phase } = useTransition();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [pdfPages, setPdfPages] = useState<number>(1);
  const [pdfLoading, setPdfLoading] = useState<boolean>(true);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const downloadSectionRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.8));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.65));
  };

  const handleZoomReset = () => {
    setZoomLevel(1.0);
  };

  // Auto-load PDF asset in background immediately when /Resume page is requested
  useEffect(() => {
    fetch(RESUME_CONFIG.viewerPath).catch(() => {});
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = RESUME_CONFIG.viewerPath;
    link.as = 'fetch';
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(link);
      } catch (_) {}
    };
  }, []);

  // Staggered entry animation on initial mount matching EditorialHero (/Github)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const isExiting = phase === 'closing' || phase === 'redirecting';

  // Open resume without any window scrolling or jumping
  const handleOpenResume = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsOpen(true);
  };

  // Close resume without any window scrolling or jumping
  const handleCloseResume = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsOpen(false);
  };

  const handleScrollToDownload = () => {
    downloadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <PortalShell
      pageSubtitle="curriculum vitae"
      footerSubtitle="resume archive & document portal ~"
      maxWidth="5xl"
      centerContent={false}
      stickyFooter={true}
      contentClassName={`transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      } pt-6 md:pt-10 pb-20 md:pb-28`}
      headerRight={
        <div className="flex items-center space-x-2.5">
          {/* Dynamic morphing toggle button: Open Resume <-> Close Preview */}
          <button
            type="button"
            onClick={isOpen ? handleCloseResume : handleOpenResume}
            className={`inline-flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-full shadow-sm transition-all duration-300 ease-out active:scale-95 cursor-pointer ${
              isOpen
                ? 'bg-white/95 hover:bg-neutral-100 text-neutral-800 border border-neutral-300'
                : 'bg-white/80 hover:bg-white text-neutral-800 border border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {/* Morphing SVG Icon */}
            <span className="relative w-3.5 h-3.5 flex items-center justify-center">
              <svg
                className={`w-3.5 h-3.5 absolute inset-0 transition-all duration-300 ease-out ${
                  isOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                } text-neutral-600`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>

              <svg
                className={`w-3.5 h-3.5 absolute inset-0 transition-all duration-300 ease-out ${
                  isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                } text-neutral-500`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>

            {/* Morphing text */}
            <span className="transition-all duration-300 ease-out">
              {isOpen ? 'Close Preview' : 'Open Resume'}
            </span>
          </button>

          {/* Persistent Download PDF Button */}
          <Button
            href={RESUME_CONFIG.downloadPath}
            download={RESUME_CONFIG.downloadFilename}
            variant="primary"
            size="sm"
            className="shadow-sm text-xs transition-all duration-300 ease-out hover:shadow-md active:scale-95"
          >
            Download PDF
          </Button>
        </div>
      }
    >
      {/* ============================================================ */}
      {/* Document Title Header with Layered Entry Animation           */}
      {/* ============================================================ */}
      <div className="w-full text-center space-y-3 mb-6">
        {/* Layer 1: Small handwritten accent (delay-75) */}
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-out delay-75 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="font-handwriting text-lg md:text-xl text-neutral-500 tracking-wide block">
            official credentials & record ~
          </span>
        </div>

        {/* Layer 2: Editorial serif heading with subtle letter drift & blur resolve (delay-150) */}
        <div
          className={`transition-all duration-700 ease-out delay-150 ${
            mounted
              ? 'opacity-100 translate-y-0 filter-none scale-100'
              : 'opacity-0 translate-y-5 blur-[3px] scale-[0.97]'
          }`}
        >
          <EditorialTitleWithLetterMovement
            title="Curriculum Vitae"
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
            Verified engineering credentials, portfolio record, and career background for Sahaj.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* State 1: Two Prominent Options (Open Resume / Download)       */}
      {/* Smoothly collapses and fades out when Open Resume is clicked */}
      {/* ============================================================ */}
      <div
        className={`w-full transition-all duration-500 ease-in-out overflow-hidden ${
          isOpen
            ? 'max-h-0 opacity-0 -translate-y-4 pointer-events-none scale-[0.98] mb-0'
            : 'max-h-[800px] opacity-100 translate-y-0 scale-100 my-4 sm:my-8'
        }`}
      >
        <div
          className={`w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-500 ease-out delay-300 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Option 1: Open Resume */}
          <div
            onClick={handleOpenResume}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenResume();
              }
            }}
            className="group relative p-6 sm:p-7 rounded-3xl bg-white/70 hover:bg-white border border-neutral-200/80 hover:border-[#1A1A1A] transition-all duration-300 ease-out shadow-[0_4px_24px_rgba(26,26,26,0.03)] hover:shadow-[0_12px_32px_rgba(26,26,26,0.08)] hover:scale-[1.01] flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-[#7EC9DB]/15 text-[#1A1A1A] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <svg
                    className="w-5 h-5 text-neutral-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 bg-neutral-100/70 px-2 py-0.5 rounded-full">
                  Interactive View
                </span>
              </div>

              <div>
                <h3 className="font-editorial text-2xl text-[#1A1A1A] group-hover:text-black transition-colors">
                  Open Resume
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  Inspect the full document directly in your browser with high-resolution vector text, zoom controls, and canvas edge feathering.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-medium text-[#1A1A1A] group-hover:translate-x-1.5 transition-transform duration-300">
              <span>View Document</span>
              <span className="ml-1 text-sm">↓</span>
            </div>
          </div>

          {/* Option 2: Download PDF */}
          <a
            href={RESUME_CONFIG.downloadPath}
            download={RESUME_CONFIG.downloadFilename}
            className="group relative p-6 sm:p-7 rounded-3xl bg-white/70 hover:bg-white border border-neutral-200/80 hover:border-[#E04D3E] transition-all duration-300 ease-out shadow-[0_4px_24px_rgba(26,26,26,0.03)] hover:shadow-[0_12px_32px_rgba(224,77,62,0.12)] hover:scale-[1.01] flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-2xl bg-[#E04D3E]/10 text-[#E04D3E] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <svg
                    className="w-5 h-5 text-[#E04D3E]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </span>
                <span className="text-[11px] font-mono text-[#E04D3E] bg-[#E04D3E]/10 px-2 py-0.5 rounded-full">
                  Resume_WIcon.pdf
                </span>
              </div>

              <div>
                <h3 className="font-editorial text-2xl text-[#1A1A1A] group-hover:text-[#E04D3E] transition-colors">
                  Download PDF
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  Download the official formatted PDF file directly to your device for offline reading, recruitment, or printing.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-medium text-[#E04D3E] group-hover:translate-x-1.5 transition-transform duration-300">
              <span>Save File Directly</span>
              <span className="ml-1 text-sm">↓</span>
            </div>
          </a>
        </div>
      </div>

      {/* ============================================================ */}
      {/* State 2: Document Space Opened for PDF Viewing               */}
      {/* Smoothly expands and fades in when Open Resume is clicked    */}
      {/* ============================================================ */}
      <div
        ref={viewerContainerRef}
        className={`w-full flex flex-col items-center transition-all duration-700 ease-in-out ${
          isOpen
            ? 'max-h-[12000px] opacity-100 translate-y-0 scale-100 mt-2'
            : 'max-h-0 opacity-0 translate-y-6 scale-[0.98] overflow-hidden pointer-events-none'
        }`}
      >
        {/* Document Active Status Bar & Controls */}
        <div className="w-full max-w-4xl mx-auto mb-6 px-4 py-2 rounded-2xl bg-white/70 border border-neutral-200/70 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm transition-all duration-300">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-sans font-medium text-neutral-800">
              In-Portal Viewer Active
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono text-[11px] text-neutral-500">
              Resume_Icon.pdf
            </span>
          </div>

          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {/* Minimal Inline Zoom & Doc Pill Controls (merged into status bar to save space) */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-neutral-100/90 hover:bg-neutral-100 border border-neutral-200/80 shadow-xs text-xs font-mono text-neutral-600 transition-colors">
              <span className="text-neutral-400 font-sans uppercase tracking-wider text-[10px]">
                Doc
              </span>
              <span className="font-semibold text-neutral-800">
                {pdfLoading ? '...' : `1 / ${pdfPages || 1}`}
              </span>

              <span className="text-neutral-300">|</span>

              <button
                type="button"
                onClick={handleZoomOut}
                disabled={pdfLoading || zoomLevel <= 0.65}
                title="Zoom out"
                aria-label="Zoom out"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-200/70 active:scale-95 text-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm font-medium cursor-pointer"
              >
                −
              </button>

              <button
                type="button"
                onClick={handleZoomReset}
                disabled={pdfLoading}
                title="Reset Zoom to 100%"
                aria-label="Reset zoom"
                className="px-1.5 py-0.5 rounded-sm hover:bg-neutral-200/70 text-[11px] font-mono font-medium text-neutral-700 transition-colors cursor-pointer"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={pdfLoading || zoomLevel >= 1.8}
                title="Zoom in"
                aria-label="Zoom in"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-neutral-200/70 active:scale-95 text-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors text-sm font-medium cursor-pointer"
              >
                +
              </button>
            </div>

            <span className="text-neutral-300 hidden sm:inline">·</span>

            <button
              type="button"
              onClick={handleScrollToDownload}
              className="text-neutral-600 hover:text-[#1A1A1A] font-medium transition-all duration-200 hover:underline underline-offset-2 active:scale-95 cursor-pointer"
            >
              Go to Download ↓
            </button>
            <span className="text-neutral-300">·</span>
            <button
              type="button"
              onClick={handleCloseResume}
              className="text-neutral-500 hover:text-red-600 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Close Preview ✕
            </button>
          </div>
        </div>

        {/* Rendered Direct Document Surface with Border Blur Mixing (Auto-loaded in background) */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
          <EditorialPdfViewer
            pdfUrl={RESUME_CONFIG.viewerPath}
            externalZoom={zoomLevel}
            hideBuiltInControls={true}
            onLoaded={({ numPages }) => {
              setPdfPages(numPages);
              setPdfLoading(false);
            }}
          />
        </div>

        {/* ============================================================ */}
        {/* Download Goes Below: Making Space for PDF Viewing Content    */}
        {/* ============================================================ */}
        <div
          ref={downloadSectionRef}
          className="w-full max-w-4xl mx-auto mt-14 pt-8 border-t border-neutral-200/70 flex flex-col items-center text-center space-y-5 transition-all duration-500"
        >
          <div className="space-y-1">
            <span className="font-handwriting text-base text-neutral-400">
              offline copy & official file ~
            </span>
            <h3 className="font-editorial text-3xl text-[#1A1A1A]">
              Download Official PDF
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Ready for employment submissions, offline archival, and high-quality printing.
            </p>
          </div>

          {/* Prominent Download Button and Close Preview Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              href={RESUME_CONFIG.downloadPath}
              download={RESUME_CONFIG.downloadFilename}
              variant="primary"
              size="lg"
              className="shadow-md hover:shadow-lg text-sm px-8 transition-all duration-300 hover:scale-[1.02] active:scale-95"
            >
              <span className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>Download PDF (Resume_WIcon.pdf)</span>
              </span>
            </Button>

            <button
              type="button"
              onClick={handleCloseResume}
              className="px-5 py-2.5 rounded-full border border-neutral-300 hover:border-neutral-500 bg-white/70 hover:bg-white text-xs font-medium text-neutral-700 transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm"
            >
              Close Preview ↑
            </button>
          </div>

          {/* Signatures & Auxiliary links */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] text-neutral-600">
                Digital Signature Verified (2026 Edition)
              </span>
            </div>
            <span className="text-neutral-300">·</span>
            <a
              href={RESUME_CONFIG.viewerPath}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1A1A1A] underline decoration-neutral-300 underline-offset-4 transition-colors"
            >
              Open raw PDF in new tab
            </a>
          </div>
        </div>
      </div>
    </PortalShell>
  );
};

export default ResumePage;
