import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminStore } from '../../../stores/adminStore';
import { useUserStore } from '../../../stores/userStore';
import LoadingOverlay from '../../../components/LoadingOverlay/LoadingOverlay';

export default function RequireAdmin({ children, requiredRole = null }) {
  const { isAdmin, adminRole, loading: adminLoading, error, checkAdminStatus } = useAdminStore();
  const { session, status: authStatus } = useUserStore();
  const location = useLocation();
  const checkedSessionRef = useRef(null);
  
  useEffect(() => {
    // Only check if we haven't checked this session yet, or if we need to re-check
    // And only when auth is ready
    if (authStatus === 'ready' && session?.user?.id !== checkedSessionRef.current) {
      console.log('[RequireAdmin] Checking admin status for session:', session?.user?.id);
      checkedSessionRef.current = session?.user?.id;
      checkAdminStatus(session);
    } else if (authStatus === 'ready' && !session) {
      // No session, admin check will handle clearing state
      checkAdminStatus(null);
    }
  }, [checkAdminStatus, session, authStatus]);
  
  // Show loading if either auth is initializing or admin check is in progress
  if (authStatus === 'loading' || adminLoading) {
    return <LoadingOverlay />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Admin Access Error</h2>
        <p>{error}</p>
        <p>Please check your database policies or contact support.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <Navigate 
        to="/account/login" 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // Check if specific role is required
  if (requiredRole && adminRole !== requiredRole && adminRole !== 'super_admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
}

