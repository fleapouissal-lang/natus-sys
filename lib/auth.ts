import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null as Profile | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile: profile as Profile | null };
});

export async function getCurrentUser() {
  const { user } = await getAuthContext();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { profile } = await getAuthContext();
  return profile;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return null;
  if (!allowedRoles.includes(profile.role)) return null;
  return profile;
}
