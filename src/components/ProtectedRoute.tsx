import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getDefaultRouteForRole, type AppRole } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

type ProtectedRouteProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(profile.role as AppRole)) {
    return <Navigate to={getDefaultRouteForRole(profile.role)} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
