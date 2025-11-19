import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

console.log('[RequireAuth] ===== MODULE LOADED =====', new Date().toISOString());

export default function RequireAuth({ children }) {
  console.log('[RequireAuth] ===== COMPONENT RENDERED =====', new Date().toISOString());
  const session = useUserStore((state) => state.session);
  const status = useUserStore((state) => state.status);
  const location = useLocation();

  // Log every render with full details
  console.log('[RequireAuth] ===== RENDER CHECK =====');
  console.log('[RequireAuth] Session:', {
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    sessionEmail: session?.user?.email,
    hasAccessToken: !!session?.access_token,
    accessTokenPrefix: session?.access_token?.substring(0, 30),
    expiresAt: session?.expires_at,
    expiresIn: session?.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000) : null
  });
  console.log('[RequireAuth] Status:', status);
  console.log('[RequireAuth] Location:', location.pathname);
  console.log('[RequireAuth] Timestamp:', new Date().toISOString());
  
  // Also check Supabase directly
  if (typeof window !== 'undefined') {
    import('../../lib/supabaseClient').then(({ supabase }) => {
      if (supabase) {
        supabase.auth.getSession().then(({ data: { session: directSession }, error }) => {
          console.log('[RequireAuth] Direct Supabase session check:', {
            hasSession: !!directSession,
            hasUser: !!directSession?.user,
            userId: directSession?.user?.id,
            hasAccessToken: !!directSession?.access_token,
            error: error?.message,
            matchesStore: directSession?.access_token === session?.access_token
          });
        });
      }
    });
  }

  if (!session && status !== 'ready') {
    console.log('[RequireAuth] ⏳ Showing loading overlay - no session and status not ready');
    return <LoadingOverlay />;
  }

  if (!session) {
    console.log('[RequireAuth] 🚫 Redirecting to login - no session and status is ready');
    console.log('[RequireAuth] This means session was not restored after page refresh!');
    return (
      <Navigate
        to="/account/login"
        state={{ from: location }}
        replace
      />
    );
  }

  console.log('[RequireAuth] ✅ Allowing access - session present');
  return children;
}

