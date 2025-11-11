import React, { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavBar } from '../components/NavBar/NavBar';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUserStore } from '../stores/userStore';
import { fetchProfile } from '../features/account/api';
import RequireAuth from '../features/account/RequireAuth';
import NavDrawer from '../components/NavDrawer/NavDrawer';

const Home = lazy(() => import('../pages/Home/Home'));
const Models = lazy(() => import('../pages/Models/Models'));
const Configurator = lazy(() => import('../pages/Configurator/Configurator'));
const World = lazy(() => import('../pages/World/World'));
const Investor = lazy(() => import('../pages/Investor/Investor'));
const StartAnim = lazy(() => import('../pages/Start/StartAnim'));
const IndexGate = lazy(() => import('../pages/Start/IndexGate'));
const Login = lazy(() => import('../features/account/pages/Login'));
const Signup = lazy(() => import('../features/account/pages/Signup'));
const ForgotPassword = lazy(() => import('../features/account/pages/ForgotPassword'));
const Garage = lazy(() => import('../features/account/pages/Garage'));
const Profile = lazy(() => import('../features/account/pages/Profile'));

export default function App() {
  const { t } = useTranslation('common');
  const setSession = useUserStore((state) => state.setSession);
  const setProfile = useUserStore((state) => state.setProfile);
  const setStatus = useUserStore((state) => state.setStatus);
  const reset = useUserStore((state) => state.reset);

  useEffect(() => {
    if (import.meta.env.DEV) {
      import('../debug/checkSupabase')
        .then(({ runSupabaseDebugCheck }) => runSupabaseDebugCheck())
        .catch((err) => {
          console.error('Failed to run Supabase debug check:', err);
        });
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
      async (_event, session) => {
        setStatus('loading');
        await handleSession(session);
      }
    );

    return () => {
      active = false;
      subscription?.subscription?.unsubscribe();
    };
  }, [setSession, setProfile, setStatus, reset]);

  return (
    <div>
      <NavBar />
      <NavDrawer />
      <main>
        <Suspense fallback={<div className="center">{t('loading')}</div>}>
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
              path="/account/profile"
              element={(
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

