import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../stores/userStore';

export default function RequireAuth({ children }) {
  const session = useUserStore((state) => state.session);
  const status = useUserStore((state) => state.status);
  const location = useLocation();

  if (status === 'loading') {
    return null;
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

