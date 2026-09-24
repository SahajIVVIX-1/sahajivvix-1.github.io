import React from 'react';
import { RESUME_CONFIG } from '../config/resume';
import { Button } from '../components/Button';
import { TransitionLink } from '../components/TransitionLink';
import { useTransition } from '../context/TransitionContext';

/**
 * Resume page styled with the warm editorial design system.
 *
 * CRITICAL SEPARATION OF ASSETS:
 * 1. Viewer: Embedded object uses Resume_Icon.pdf (/resume/Resume_Icon.pdf).
 *    Does NOT automatically download.
 * 2. Download: The "Download Resume" control uses Resume_WIcon.pdf (/resume/Resume_WIcon.pdf).
 *    Only triggers when explicitly clicked by the user.
 */
export const ResumePage: React.FC = () => {
  const { phase } = useTransition();
  const isContentHidden = phase === 'closing' || phase === 'redirecting';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden">
      {/* Top Editorial Header Bar */}
      <header className="relative z-20 w-full px-6 py-5 md:px-12 md:py-6 flex items-center justify-between border-b border-neutral-200/60 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <TransitionLink
            to="/"
            className="font-editorial text-xl font-medium tracking-tight text-[#1A1A1A] hover:opacity-80 transition-opacity"
          >
            Sahaj
          </TransitionLink>
          <span className="text-neutral-300">/</span>
          <span className="text-hand-accent text-base text-neutral-500">
            curriculum vitae
          </span>
        </div>

        {/* Explicit download action - strictly points to Resume_WIcon.pdf */}
        <Button
          href={RESUME_CONFIG.downloadPath}
          download={RESUME_CONFIG.downloadFilename}
          variant="primary"
          size="sm"
        >
          Download Resume
        </Button>
      </header>

      {/* Main PDF viewer area */}
      <main
        className={`relative z-20 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-6 flex flex-col transition-all duration-300 ease-out ${
          isContentHidden ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Title banner */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-editorial-heading font-editorial text-[#1A1A1A]">
              Curriculum Vitae
            </h1>
            <p className="text-xs font-sans text-neutral-500 mt-0.5">
              Verified document: <span className="font-mono text-neutral-700">Resume_Icon.pdf</span>
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-sans uppercase tracking-widest text-neutral-400">
            Document View Mode
          </span>
        </div>

        {/* Embedded document container */}
        <div className="flex-1 w-full min-h-[78vh] rounded-lg border border-neutral-200/80 bg-white overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <object
            data={`${RESUME_CONFIG.viewerPath}#toolbar=1`}
            type="application/pdf"
            className="w-full h-full min-h-[78vh]"
          >
            <div className="p-12 text-center text-neutral-600 flex flex-col items-center justify-center h-full space-y-4">
              <p className="text-editorial-body text-neutral-600">
                Your browser does not support inline PDF viewing.
              </p>
              <Button
                href={RESUME_CONFIG.viewerPath}
                target="_blank"
                rel="noopener noreferrer"
                variant="subtle"
                size="md"
              >
                Open Document in New Tab
              </Button>
            </div>
          </object>
        </div>
      </main>

      {/* Bottom Editorial Footer */}
      <footer className="relative z-20 w-full px-6 py-4 md:px-12 md:py-6 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-200/50">
        <span>© 2026 Sahaj</span>
        <span className="text-hand-accent text-sm text-neutral-400">
          resume archive ~
        </span>
      </footer>
    </div>
  );
};

export default ResumePage;
