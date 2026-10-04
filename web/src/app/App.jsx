import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BuilderAuthProvider } from '../contexts/BuilderAuthContext';
import { RouteTransitionProvider } from '../contexts/RouteTransitionContext';
import { RouteTransitionOverlay } from '../components/RouteTransitionOverlay/RouteTransitionOverlay';
import { BuilderNavBar } from '../pages/Agency/pages/Builder/components/BuilderNavBar';

const Builder = lazy(() => import('../pages/Agency/pages/Builder/Builder'));
const Generation = lazy(() => import('../pages/Agency/pages/Builder/Generation/Generation'));

export default function App() {
  const location = useLocation();
  const hideNav = location.pathname.toLowerCase().startsWith('/builder/generation');

  return (
    <BuilderAuthProvider>
      <RouteTransitionProvider>
        {!hideNav && <BuilderNavBar />}
        <RouteTransitionOverlay />
        <main>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/builder" element={<Builder />} />
              <Route path="/builder/generation" element={<Generation />} />
              <Route path="*" element={<Navigate to="/builder" replace />} />
            </Routes>
          </Suspense>
        </main>
      </RouteTransitionProvider>
    </BuilderAuthProvider>
  );
}
