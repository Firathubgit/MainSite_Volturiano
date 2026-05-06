import React from "react";
import { Navigate } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import { useBuilderAuth } from "../../../../../contexts/BuilderAuthContext";

export default function RequireBuilderAdmin({ children }) {
  const { isAuthenticated, isAdmin, loading } = useBuilderAuth();

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Loader2Icon size={22} style={{ animation: "spin 1s linear infinite" }} />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/builder/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/builder" replace />;
  }

  return children;
}
