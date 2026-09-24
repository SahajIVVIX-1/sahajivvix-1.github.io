import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TransitionProvider, useTransition } from './context/TransitionContext';
import { OrganicShapes } from './components/OrganicShapes';
import { FloatingWords } from './components/FloatingWords';
import { HomePage } from './pages/HomePage';
import { RedirectPage } from './pages/RedirectPage';
import { ResumePage } from './pages/ResumePage';
import { NotFoundPage } from './pages/NotFoundPage';

const AppLayout: React.FC = () => {
  const { displayLocation } = useTransition();
  const isResume = displayLocation.pathname.toLowerCase().includes('resume');

  return (
    <div className="relative min-h-screen w-full bg-[#FAF8F5] text-[#1A1A1A] overflow-x-hidden">
      {/* Persistent organic flowers that maintain orbital motion and execute curtain transitions */}
      <OrganicShapes showFloatingWords={false} />

      {/* Reusable secondary floating typography distributed around the viewport perimeter */}
      {!isResume && <FloatingWords />}

      {/* Main route view container rendered based on transition-synchronized displayLocation */}
      <div className="relative z-20 min-h-screen">
        <Routes location={displayLocation}>
          <Route path="/" element={<HomePage />} />
          <Route path="/Resume" element={<ResumePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/:slug" element={<RedirectPage />} />
          <Route path="/:slug/*" element={<RedirectPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
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
