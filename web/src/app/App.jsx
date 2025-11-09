import React, { Suspense, lazy } from 'react';
import { NavBar } from '../components/NavBar/NavBar';
import { Route, Routes, Navigate } from 'react-router-dom';

const Home = lazy(() => import('../pages/Home/Home'));
const Models = lazy(() => import('../pages/Models/Models'));
const Configurator = lazy(() => import('../pages/Configurator/Configurator'));
const World = lazy(() => import('../pages/World/World'));
const Investor = lazy(() => import('../pages/Investor/Investor'));
const StartAnim = lazy(() => import('../pages/Start/StartAnim'));
const IndexGate = lazy(() => import('../pages/Start/IndexGate'));

export default function App() {
  return (
    <div>
      <NavBar />
      <main>
        <Suspense fallback={<div className="center">Loading…</div>}>
          <Routes>
            <Route path="/" element={<IndexGate />} />
            <Route path="/start" element={<StartAnim />} />
            <Route path="/models" element={<Models />} />
            <Route path="/configurator" element={<Configurator />} />
            {import.meta.env.VITE_ENABLE_WORLD === 'true' && (
              <Route path="/world" element={<World />} />
            )}
            {import.meta.env.VITE_ENABLE_INVEST === 'true' && (
              <Route path="/investor" element={<Investor />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

