import React, { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavBar } from '../components/NavBar/NavBar';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUserStore } from '../stores/userStore';
import { useUiStore } from '../stores/uiStore';
import { fetchProfile } from '../features/account/api';
import RequireAuth from '../features/account/RequireAuth';
import NavDrawer from '../components/NavDrawer/NavDrawer';
import LoadingOverlay from '../components/LoadingOverlay/LoadingOverlay';
import { useRenderLogger } from '../debug/useRenderLogger';

const Home = lazy(() => import('../pages/Home/Home'));
const Models = lazy(() => import('../pages/Models/Models'));
const Configurator = lazy(() => import('../pages/Configurator/Configurator'));
const ConfiguratorFromGarage = lazy(() => import('../pages/Configurator/ConfiguratorFromGarage'));
const World = lazy(() => import('../pages/World/World'));
const Investor = lazy(() => import('../pages/Investor/Investor'));
const StartAnim = lazy(() => import('../pages/Start/StartAnim'));
const IndexGate = lazy(() => import('../pages/Start/IndexGate'));
const Login = lazy(() => import('../features/account/pages/Login'));
const Signup = lazy(() => import('../features/account/pages/Signup'));
const ForgotPassword = lazy(() => import('../features/account/pages/ForgotPassword'));
const Garage = lazy(() => import('../features/account/pages/Garage'));
const Profile = lazy(() => import('../features/account/pages/Profile'));
const VolturianoWorld = lazy(() => import('../features/account/pages/VolturianoWorld'));
const SharedGarageView = lazy(() => import('../features/garage/components/SharedGarageView'));
const LoadingOverlayTest = import.meta.env.DEV
  ? lazy(() => import('../pages/Debug/LoadingOverlayTest'))
  : null;
const RenderLogger = import.meta.env.DEV
  ? lazy(() => import('../pages/Debug/RenderLogger'))
  : null;
const TestSaveToGarage = import.meta.env.DEV
  ? lazy(() => import('../pages/Debug/TestSaveToGarage'))
  : null;

export default function App() {
  const { t } = useTranslation('common');
  const setSession = useUserStore((state) => state.setSession);
  const setProfile = useUserStore((state) => state.setProfile);
  const setStatus = useUserStore((state) => state.setStatus);
  const reset = useUserStore((state) => state.reset);
  const status = useUserStore((state) => state.status);
  const session = useUserStore((state) => state.session);
  const forceOverlay = useUiStore((state) => state.forceOverlay);
  
  useRenderLogger('App', { status, hasSession: !!session, forceOverlay });

  useEffect(() => {
    if (import.meta.env.DEV) {
      import('../debug/checkSupabase')
        .then(({ runSupabaseDebugCheck }) => runSupabaseDebugCheck())
        .catch((err) => {
          console.error('Failed to run Supabase debug check:', err);
        });
      
      // Phase 1 status check (optional - uncomment to auto-run)
      // import('../debug/checkPhase1Status')
      //   .then(({ checkPhase1Status }) => checkPhase1Status())
      //   .catch((err) => {
      //     console.error('Failed to run Phase 1 status check:', err);
      //   });
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setStatus('ready');
      return undefined;
    }
    let active = true;

    const hydrateProfile = async (session) => {
      if (!active) return;
      if (session?.user?.id) {
        const { data, error } = await fetchProfile(session.user.id);
        if (!active) return;
        if (error) {
          console.warn('Failed to load profile', error.message);
          setProfile(null);
        } else {
          setProfile(data);
        }
      } else {
        setProfile(null);
      }
    };

    const handleSession = async (session) => {
      if (!active) return;
      if (session) {
        setSession(session);
        await hydrateProfile(session);
      } else {
        reset();
      }
      if (active) {
        setStatus('ready');
      }
    };

    const initialise = async () => {
      setStatus('loading');
      const {
        data: { session }
      } = await supabase.auth.getSession();
      await handleSession(session);
    };

    initialise();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // For sign out events, handle immediately without blocking
        // The stores are already cleared optimistically in AccountMenu
        if (event === 'SIGNED_OUT') {
          // Don't await - let it run in background to avoid blocking
          handleSession(session).catch((err) => {
            console.warn('Error handling sign out session:', err);
          });
        } else {
        setStatus('loading');
        await handleSession(session);
        }
      }
    );

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [setSession, setProfile, setStatus, reset]);

  return (
    <div>
      <LoadingOverlay
        show={forceOverlay || (!session && (status === 'loading' || status === 'idle'))}
      />
      <NavBar />
      <NavDrawer />
      <main>
        <Suspense fallback={<LoadingOverlay />}>
          <Routes>
            <Route path="/" element={<IndexGate />} />
            <Route path="/start" element={<StartAnim />} />
            <Route path="/models" element={<Models />} />
            <Route
              path="/configurator/:garageItemId"
              element={(
                <RequireAuth>
                  <ConfiguratorFromGarage />
                </RequireAuth>
              )}
            />
            <Route path="/configurator" element={<Configurator />} />
            {import.meta.env.VITE_ENABLE_WORLD === 'true' && (
              <Route path="/world" element={<World />} />
            )}
            {import.meta.env.VITE_ENABLE_INVEST === 'true' && (
              <Route path="/investor" element={<Investor />} />
            )}
            <Route path="/account/login" element={<Login />} />
            <Route path="/account/signup" element={<Signup />} />
            <Route path="/account/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/garage"
              element={(
                <RequireAuth>
                  <Garage />
                </RequireAuth>
              )}
            />
            <Route
              path="/garage/share/:shareCode"
              element={<SharedGarageView />}
            />
            <Route
              path="/account/world"
              element={(
                <RequireAuth>
                  <VolturianoWorld />
                </RequireAuth>
              )}
            />
            <Route
              path="/account/profile"
              element={(
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              )}
            />
            {import.meta.env.DEV && LoadingOverlayTest && (
              <Route path="/debug/loading-overlay" element={<LoadingOverlayTest />} />
            )}
            {import.meta.env.DEV && RenderLogger && (
              <Route path="/debug/render-logger" element={<RenderLogger />} />
            )}
            {import.meta.env.DEV && TestSaveToGarage && (
              <Route path="/debug/test-save" element={<TestSaveToGarage />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

