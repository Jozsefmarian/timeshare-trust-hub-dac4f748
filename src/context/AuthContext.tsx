import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionAndProfile, type AppProfile } from "@/lib/auth";

type AuthContextValue = {
  profile: AppProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  profile: null,
  isLoading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const { profile } = await getSessionAndProfile();
      setProfile(profile);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsLoading(false);
      } else if (event === "SIGNED_IN") {
        loadProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ profile, isLoading, refresh: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
