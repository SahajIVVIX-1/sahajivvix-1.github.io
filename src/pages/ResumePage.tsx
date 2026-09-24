import React, { useState, useRef, useEffect } from 'react';
import { RESUME_CONFIG } from '../config/resume';
import { Button } from '../components/Button';
import { PortalShell } from '../components/PortalShell';
import { EditorialPdfViewer } from '../components/EditorialPdfViewer';
import { EditorialTitleWithLetterMovement } from '../components/EditorialHero';
import { useTransition } from '../context/TransitionContext';

/**
 * ResumePage
 * Editorial document portal matching the cinematic transition pattern of /Github.
 * - Layered entry animation: Letters and headings drift in smoothly from background blur.
 * - Ambient floating background words stay intact.
 * - Header is fixed on top (does NOT scroll away with scroll).
 * - Footer stays at bottom of page (does NOT scroll/float over the document).
 * - Initial state: Two options (Open Resume / Download PDF).
 * - When "Open Resume" is clicked: Smoothly unfolds document space and places Download PDF below.
 * - Viewer: Strictly renders Resume_Icon.pdf (/resume/Resume_Icon.pdf).
 * - Download: Strictly downloads Resume_WIcon.pdf (/resume/Resume_WIcon.pdf).
 */
export const ResumePage: React.FC = () => {
  const { phase } = useTransition();
  const [mounted, setMounted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const downloadSectionRef = useRef<HTMLDivElement>(null);

  // Staggered entry animation on mount matching EditorialHero (/Github)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const isExiting = phase === 'closing' || phase === 'redirecting';

  const handleOpenResume = () => {
    setIsOpen(true);
    // Smoothly scroll down so the opening document comes into view gracefully
    setTimeout(() => {
      viewerContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const handleCloseResume = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      stickyFooter={false}
      contentClassName={`transition-all duration-300 ease-out ${
        isExiting ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
      } ${isOpen ? 'pt-4 md:pt-6 pb-20 md:pb-28' : 'pt-6 md:pt-10 pb-16'}`}
      headerRight={
        <div className="flex items-center space-x-2.5">
          {!isOpen ? (
            <>
              <button
                type="button"
                onClick={handleOpenResume}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-white/80 hover:bg-white text-neutral-800 border border-neutral-200 hover:border-neutral-300 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 text-neutral-600"
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
                <span>Open Resume</span>
              </button>
              <Button
                href={RESUME_CONFIG.downloadPath}
                download={RESUME_CONFIG.downloadFilename}
                variant="primary"
                size="sm"
                className="shadow-sm text-xs"
              >
                Download PDF
              </Button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCloseResume}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full bg-white/80 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5 text-neutral-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Close Preview</span>
              </button>
              <Button
                href={RESUME_CONFIG.downloadPath}
                download={RESUME_CONFIG.downloadFilename}
                variant="primary"
                size="sm"
                className="shadow-sm text-xs"
              >
                Download PDF
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* ============================================================ */}
      {/* Document Title Header with Layered Entry Animation           */}
      {/* ============================================================ */}
      <div className="w-full text-center space-y-3 mb-8">
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
      {/* Initial State: Two Prominent Options (Open Resume / Download)*/}
      {/* Layer 4: Transition stagger (delay-300)                      */}
      {/* ============================================================ */}
      {!isOpen && (
        <div
          className={`w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 sm:my-8 transition-all duration-500 ease-out delay-300 ${
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
            className="group relative p-6 sm:p-7 rounded-3xl bg-white/70 hover:bg-white border border-neutral-200/80 hover:border-[#1A1A1A] transition-all duration-300 shadow-[0_4px_24px_rgba(26,26,26,0.03)] hover:shadow-[0_12px_32px_rgba(26,26,26,0.08)] flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
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
                <h3 className="font-editorial text-2xl text-[#1A1A1A] group-hover:text-black">
                  Open Resume
                </h3>
                <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                  Inspect the full document directly in your browser with high-resolution vector text, zoom controls, and canvas edge feathering.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center text-xs font-medium text-[#1A1A1A] group-hover:translate-x-1 transition-transform">
              <span>View Document</span>
              <span className="ml-1 text-sm">↓</span>
            </div>
          </div>

          {/* Option 2: Download PDF */}
          <a
            href={RESUME_CONFIG.downloadPath}
            download={RESUME_CONFIG.downloadFilename}
            className="group relative p-6 sm:p-7 rounded-3xl bg-white/70 hover:bg-white border border-neutral-200/80 hover:border-[#E04D3E] transition-all duration-300 shadow-[0_4px_24px_rgba(26,26,26,0.03)] hover:shadow-[0_12px_32px_rgba(224,77,62,0.12)] flex flex-col justify-between text-left cursor-pointer active:scale-[0.99]"
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

            <div className="pt-6 flex items-center text-xs font-medium text-[#E04D3E] group-hover:translate-x-1 transition-transform">
              <span>Save File Directly</span>
              <span className="ml-1 text-sm">↓</span>
            </div>
          </a>
        </div>
      )}

      {/* ============================================================ */}
      {/* Active State: Document Space Opened for PDF Viewing          */}
      {/* ============================================================ */}
      {isOpen && (
        <div
          ref={viewerContainerRef}
          className="w-full flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500"
        >
          {/* Document Active Status Bar & Controls */}
          <div className="w-full max-w-4xl mx-auto mb-6 px-4 py-2.5 rounded-2xl bg-white/60 border border-neutral-200/60 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-xs">
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

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleScrollToDownload}
                className="text-neutral-600 hover:text-[#1A1A1A] font-medium transition-colors cursor-pointer"
              >
                Go to Download ↓
              </button>
              <span className="text-neutral-300">·</span>
              <button
                type="button"
                onClick={handleCloseResume}
                className="text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Close Preview ✕
              </button>
            </div>
          </div>

          {/* Rendered Direct Document Surface with Border Blur Mixing */}
          <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
            <EditorialPdfViewer pdfUrl={RESUME_CONFIG.viewerPath} />
          </div>

          {/* ============================================================ */}
          {/* Download Goes Below: Making Space for PDF Viewing Content    */}
          {/* ============================================================ */}
          <div
            ref={downloadSectionRef}
            className="w-full max-w-4xl mx-auto mt-14 pt-8 border-t border-neutral-200/70 flex flex-col items-center text-center space-y-5 transition-all duration-500 animate-in fade-in duration-700"
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

            {/* Prominent Download Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                href={RESUME_CONFIG.downloadPath}
                download={RESUME_CONFIG.downloadFilename}
                variant="primary"
                size="lg"
                className="shadow-md text-sm px-8"
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
                className="px-5 py-2.5 rounded-full border border-neutral-300 hover:border-neutral-500 bg-white/60 hover:bg-white text-xs font-medium text-neutral-700 transition-all cursor-pointer shadow-sm"
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
      )}
    </PortalShell>
  );
};

export default ResumePage;
