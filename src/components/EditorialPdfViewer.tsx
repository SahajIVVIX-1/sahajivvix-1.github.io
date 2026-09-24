import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ButterflyLoader } from './ButterflyIcon';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export interface EditorialPdfViewerProps {
  readonly pdfUrl: string;
  readonly className?: string;
  readonly onLoaded?: (info: { numPages: number }) => void;
  readonly externalZoom?: number;
  readonly hideBuiltInControls?: boolean;
}

interface PageState {
  readonly pageNum: number;
  readonly isRendering: boolean;
}

/**
 * EditorialPdfViewer
 * High-fidelity, canvas-based editorial PDF document renderer.
 * - Zero enclosing boxes: seamlessly blends the document into the warm cream canvas.
 * - Border blur & feathering: the outer edge of the PDF dissolves gently into #FAF8F5.
 * - Multiplies canvas resolution by devicePixelRatio for razor-sharp typography in the center.
 * - Minimal, quiet controls for Zoom and Page Tracking.
 */
const computeDefaultWidth = (): number => {
  if (typeof window === 'undefined') return 860;
  return Math.min(Math.max(window.innerWidth - 48, 320), 860);
};

export const EditorialPdfViewer: React.FC<EditorialPdfViewerProps> = ({
  pdfUrl,
  className = '',
  onLoaded,
  externalZoom,
  hideBuiltInControls = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [internalZoom, setInternalZoom] = useState<number>(1.0);
  const zoomLevel = externalZoom !== undefined ? externalZoom : internalZoom;
  const [containerWidth, setContainerWidth] = useState<number>(computeDefaultWidth);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagesState, setPagesState] = useState<PageState[]>([]);

  // Canvas refs for all pages
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  // Active render tasks to prevent overlapping renders
  const activeRenderTasks = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());

  // Observe container width changes responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(Math.floor(rect.width));
      } else if (typeof window !== 'undefined') {
        setContainerWidth(Math.min(Math.max(window.innerWidth - 48, 320), 860));
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Load PDF document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@6.3.289/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((doc) => {
        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPagesState(
          Array.from({ length: doc.numPages }, (_, i) => ({
            pageNum: i + 1,
            isRendering: true,
          }))
        );
        setLoading(false);
        onLoaded?.({ numPages: doc.numPages });
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        console.error('Failed to load PDF document via PDF.js:', err);
        setError('Unable to load document preview.');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [pdfUrl, onLoaded]);

  // Render a specific page onto its designated canvas
  const renderPage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement, doc: pdfjsLib.PDFDocumentProxy) => {
      // Cancel existing render task for this page if running
      const existingTask = activeRenderTasks.current.get(pageNum);
      if (existingTask) {
        existingTask.cancel();
        activeRenderTasks.current.delete(pageNum);
      }

      try {
        const page = await doc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1 });

        // Calculate available display width inside paper sheet
        const maxWidth = Math.max(containerWidth - 16, 280);
        const baseScale = maxWidth / unscaledViewport.width;
        const finalScale = baseScale * zoomLevel;

        // High-DPI scaling (Retina / 4K / Mobile) for 100% crisp vector text
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const viewport = page.getViewport({ scale: finalScale * dpr });

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Logical CSS dimensions match page proportions
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        // Fill background with pristine white before rendering
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
          canvas: canvas,
        });

        activeRenderTasks.current.set(pageNum, renderTask);

        await renderTask.promise;
        activeRenderTasks.current.delete(pageNum);

        setPagesState((prev) =>
          prev.map((p) => (p.pageNum === pageNum ? { ...p, isRendering: false } : p))
        );
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    },
    [containerWidth, zoomLevel]
  );

  // Trigger page renders when doc, containerWidth, or zoom changes
  useEffect(() => {
    if (!pdfDoc) return;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const canvas = canvasRefs.current.get(pageNum);
      if (canvas) {
        renderPage(pageNum, canvas, pdfDoc);
      }
    }

    return () => {
      activeRenderTasks.current.forEach((task) => task.cancel());
      activeRenderTasks.current.clear();
    };
  }, [pdfDoc, numPages, containerWidth, zoomLevel, renderPage]);

  // Zoom controls
  const handleZoomIn = () => {
    setInternalZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.8));
  };

  const handleZoomOut = () => {
    setInternalZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.65));
  };

  const handleZoomReset = () => {
    setInternalZoom(1.0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex flex-col items-center select-none ${className}`}
    >
      {/* ============================================================ */}
      {/* Minimal Floating Control Bar (Hidden when integrated in header) */}
      {/* ============================================================ */}
      {!hideBuiltInControls ? (
        <div className="sticky top-16 md:top-20 z-20 mb-8 flex items-center justify-between gap-3 px-4 py-1.5 rounded-full bg-[#FAF8F5]/85 border border-neutral-200/60 shadow-[0_4px_20px_rgba(26,26,26,0.04)] backdrop-blur-md transition-all duration-200">
          {/* Page status */}
          <div className="flex items-center space-x-1.5 text-xs font-mono text-neutral-600 pl-1">
            <span className="text-neutral-400 font-sans text-[11px] uppercase tracking-wider">
              Doc
            </span>
            <span className="font-semibold text-neutral-800">
              {loading ? '...' : `1 / ${numPages || 1}`}
            </span>
          </div>

          {/* Minimal Divider */}
          <div className="h-3 w-[1px] bg-neutral-200" aria-hidden="true" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={loading || zoomLevel <= 0.65}
              title="Zoom out"
              aria-label="Zoom out"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-200/50 active:scale-95 text-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors text-base font-medium cursor-pointer"
            >
              −
            </button>

            <button
              type="button"
              onClick={handleZoomReset}
              disabled={loading}
              title="Reset Zoom to 100%"
              aria-label="Reset zoom"
              className="px-2 py-0.5 rounded-full hover:bg-neutral-200/50 text-[11px] font-mono font-medium text-neutral-700 transition-colors cursor-pointer"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={loading || zoomLevel >= 1.8}
              title="Zoom in"
              aria-label="Zoom in"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-200/50 active:scale-95 text-neutral-600 disabled:opacity-30 disabled:pointer-events-none transition-colors text-base font-medium cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* Loading Skeleton / Error Fallback (No harsh boxes)           */}
      {/* ============================================================ */}
      {loading ? (
        <div className="w-full max-w-[840px] aspect-[1/1.414] rounded-3xl bg-white/40 flex flex-col items-center justify-center p-8 space-y-4">
          <ButterflyLoader size="md" label="Rendering document ~" />
        </div>
      ) : null}

      {error ? (
        <div className="w-full max-w-[840px] p-12 rounded-3xl bg-white/60 text-center space-y-4">
          <p className="font-editorial text-lg text-neutral-800">{error}</p>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            You can still view the document directly or download a copy to your device.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full bg-neutral-200/70 hover:bg-neutral-300 text-xs font-medium text-neutral-800 transition-colors"
            >
              Open Direct PDF
            </a>
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* Rendered Physical Sheets (No surround boxes, border blur mixing) */}
      {/* ============================================================ */}
      {!loading && !error ? (
        <div className="w-full flex flex-col items-center space-y-12">
          {pagesState.map((page) => (
            <div
              key={page.pageNum}
              className="relative rounded-2xl md:rounded-3xl overflow-hidden flex justify-center items-center group transition-all duration-300"
            >
              {/* High-DPI rendered canvas: 100% sharp text in document interior */}
              <canvas
                ref={(node) => {
                  if (node) {
                    canvasRefs.current.set(page.pageNum, node);
                  } else {
                    canvasRefs.current.delete(page.pageNum);
                  }
                }}
                className="block max-w-full h-auto rounded-2xl md:rounded-3xl"
                style={{
                  imageRendering: 'auto',
                }}
              />

              {/* Layer 1: True border blur mixing with background - leaves center 75% unblurred */}
              <div
                className="pointer-events-none absolute -inset-1 rounded-2xl md:rounded-3xl backdrop-blur-[5px]"
                style={{
                  maskImage:
                    'radial-gradient(ellipse at center, transparent 72%, black 100%)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse at center, transparent 72%, black 100%)',
                }}
                aria-hidden="true"
              />

              {/* Layer 2: Soft perimeter gradient & feathering mixing into cream (#FAF8F5) */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl md:rounded-3xl"
                style={{
                  boxShadow:
                    'inset 0 0 32px 16px #FAF8F5, inset 0 0 12px 6px rgba(250, 248, 245, 0.9), 0 0 48px 20px #FAF8F5',
                }}
                aria-hidden="true"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default EditorialPdfViewer;
