"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveStaffHomePath } from "@/lib/cashier/access";
import type { UserRole } from "@/lib/types";

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

function getLoginErrorMessage(code?: string, message?: string): string {
  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Email ou mot de passe incorrect";
    case "email_not_confirmed":
      return "Veuillez confirmer votre email avant de vous connecter";
    case "too_many_requests":
      return "Trop de tentatives, réessayez dans quelques minutes";
    default:
      if (message?.toLowerCase().includes("invalid login")) {
        return "Email ou mot de passe incorrect";
      }
      return message || "Email ou mot de passe incorrect";
  }
}

export async function signInStaff(
  email: string,
  password: string,
  options?: { isMobile?: boolean }
): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return { ok: false, error: "Veuillez saisir votre email et mot de passe" };
  }

  const supabase = await createClient();

  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (authError) {
    return { ok: false, error: getLoginErrorMessage(authError.code, authError.message) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active, is_store_pos, store_id")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        "Profil introuvable pour ce compte. Exécutez « npm run seed:users » ou contactez un administrateur.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Votre compte a été désactivé" };
  }

  const redirectTo = await resolveStaffHomePath(
    supabase,
    { ...profile, role: profile.role as UserRole },
    { isMobile: options?.isMobile }
  );

  return { ok: true, redirectTo };
}
