import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransitionProvider, useTransition } from './context/TransitionContext';
import { OrganicShapes } from './components/OrganicShapes';
import { FloatingWords } from './components/FloatingWords';
import { HomePage } from './pages/HomePage';
import { ResumePage } from './pages/ResumePage';
import { RedirectPage } from './pages/RedirectPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppLayout: React.FC = () => {
  const { displayLocation } = useTransition();

  return (
    <div className="relative min-h-screen w-full bg-[#FAF8F5] text-[#1A1A1A] overflow-x-hidden">
      {/* Reusable secondary floating typography in background (z-[5]) across all views */}
      <FloatingWords />

      {/* Persistent living winged butterflies that overlay background words (z-[15] idle, z-40 transition) */}
      <OrganicShapes showFloatingWords={false} />

      {/* Main route view container rendered on top of butterflies when idle (z-20) */}
      <div className="relative z-20 min-h-screen">
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
        <AppLayout />
      </TransitionProvider>
    </BrowserRouter>
  );
};

export default App;
