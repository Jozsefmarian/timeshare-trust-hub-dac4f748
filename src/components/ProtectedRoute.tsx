import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getDefaultRouteForRole, getSessionAndProfile, type AppRole } from "@/lib/auth";

type ProtectedRouteProps = {
  allowedRoles: AppRole[];
  children: ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const { session, profile } = await getSessionAndProfile();

        if (!mounted) return;

        if (!session) {
          setRedirectTo("/auth");
          return;
        }

        if (!profile?.role) {
          setRedirectTo("/auth");
          return;
        }

        if (!allowedRoles.includes(profile.role)) {
          setRedirectTo(getDefaultRouteForRole(profile.role));
          return;
        }

        setRedirectTo(null);
      } catch (error) {
        console.error("ProtectedRoute error:", error);
        if (mounted) setRedirectTo("/auth");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [allowedRoles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
