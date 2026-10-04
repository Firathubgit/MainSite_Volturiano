import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RouteTransitionProvider } from './contexts/RouteTransitionContext';
import { RouteTransitionOverlay } from './components/RouteTransitionOverlay/RouteTransitionOverlay';
import { NavBar } from './builder/NavBar';

const PromptPage = lazy(() => import('./builder/PromptPage'));
const Generation = lazy(() => import('./builder/generation/Generation'));
const ProjectsPage = lazy(() => import('./builder/projects/ProjectsPage'));

export default function App() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/generation');

  return (
    <RouteTransitionProvider>
      {!hideNav && <NavBar />}
      <RouteTransitionOverlay />
      <main>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<PromptPage />} />
            <Route path="/generation" element={<Generation />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </RouteTransitionProvider>
  );
}
