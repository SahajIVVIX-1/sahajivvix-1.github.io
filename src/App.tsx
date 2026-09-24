import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransitionProvider, useTransition } from './context/TransitionContext';
import {
  HeaderFooterProvider,
  useHeaderFooter,
} from './context/HeaderFooterContext';
import { OrganicShapes } from './components/OrganicShapes';
import { FloatingWords } from './components/FloatingWords';
import { FlyingIpBadge } from './components/FlyingIpBadge';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { LiquidCursorEffect } from './components/LiquidCursorEffect';
import { GlassTooltip } from './components/GlassTooltip';
import { HomePage } from './pages/HomePage';
import { ResumePage } from './pages/ResumePage';
import { RedirectPage } from './pages/RedirectPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Persistent Header & Footer Navigation
 * Stays mounted continuously across page switches so headers and footers never blink or remount.
 * Changes to subtitles and dynamic action buttons transition with liquid cross-fading and smooth sliding.
 */
const PersistentNavigation: React.FC = () => {
  const { config } = useHeaderFooter();

  return (
    <>
      <AppHeader
        pageSubtitle={config.pageSubtitle}
        headerRight={config.headerRight}
        visible={config.showHeader}
      />
      <AppFooter
        footerSubtitle={config.footerSubtitle}
        fixed={config.fixedFooter}
        sticky={config.stickyFooter && !config.fixedFooter}
        visible={config.showFooter}
      />
    </>
  );
};

const AppLayout: React.FC = () => {
  const { displayLocation } = useTransition();

  // Universal prevention of text selection, right-click context menu, dragging, and developer inspect shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      // Prevent copying selection
      if (window.getSelection()?.toString()) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools inspect)
      // or Cmd+Option+I, Cmd+Option+J, Cmd+Option+C on macOS
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.shiftKey || e.altKey) &&
        ['i', 'j', 'c', 'I', 'J', 'C'].includes(e.key)
      ) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U / Cmd+Option+U (View Source)
      if ((e.ctrlKey || e.metaKey) && ['u', 'U', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, { capture: true });
    document.addEventListener('selectstart', handleSelectStart, { capture: true });
    document.addEventListener('dragstart', handleDragStart, { capture: true });
    document.addEventListener('copy', handleCopy, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      document.removeEventListener('selectstart', handleSelectStart, { capture: true });
      document.removeEventListener('dragstart', handleDragStart, { capture: true });
      document.removeEventListener('copy', handleCopy, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#FAF8F5] text-[#1A1A1A] overflow-x-hidden select-none">
      {/* Reusable secondary floating typography in background (z-[5]) across all views */}
      <FloatingWords />

      {/* Persistent high-blur editorial header and footer with smooth liquid transitions */}
      <PersistentNavigation />

      {/* Persistent living winged butterflies that overlay background words (z-[15] idle, z-40 transition) */}
      <OrganicShapes showFloatingWords={false} />

      {/* Cinematic Flying IP badge motion from center screen to top header breadcrumb */}
      <FlyingIpBadge />

      {/* Localized Liquid Cursor Effect (subtle underwater displacement attached directly to cursor) */}
      <LiquidCursorEffect />

      {/* Professional Motion Glass Tooltip (suppresses default browser tooltips and incorporates motion insignia) */}
      <GlassTooltip />

      {/* Main route view container */}
      <div className="relative min-h-screen">
        <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5]" />}>
          <Routes location={displayLocation}>
            <Route path="/" element={<HomePage />} />
            <Route path="/Resume" element={<ResumePage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/:slug" element={<RedirectPage />} />
            <Route path="/:slug/*" element={<RedirectPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <TransitionProvider>
        <HeaderFooterProvider>
          <AppLayout />
        </HeaderFooterProvider>
      </TransitionProvider>
    </BrowserRouter>
  );
};

export default App;
