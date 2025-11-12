import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';
import LoadingOverlay from '../../components/LoadingOverlay/LoadingOverlay';

export default function RequireAuth({ children }) {
  const session = useUserStore((state) => state.session);
  const status = useUserStore((state) => state.status);
  const location = useLocation();

  if (!session && status !== 'ready') {
    return <LoadingOverlay />;
  }

  if (!session) {
    return (
      <Navigate
        to="/account/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

