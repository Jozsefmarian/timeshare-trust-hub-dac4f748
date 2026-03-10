import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "seller" | "admin" | "renter";

export type AppProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole | null;
};

const sb = supabase as any;

export async function getSessionAndProfile(): Promise<{
  session: Session | null;
  profile: AppProfile | null;
}> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!session) {
    return { session: null, profile: null };
  }

  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    session,
    profile: (profile as AppProfile | null) ?? null,
  };
}

export function getDefaultRouteForRole(role?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller/dashboard";
  return "/auth";
}

export function getInitials(profile?: AppProfile | null) {
  const source = profile?.full_name?.trim() || profile?.email?.trim() || "";

  if (!source) return "?";

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
