import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import type { PosOperatorSession } from "@/lib/pos/types";

export async function getStorePosAccount(
  storeId: string
): Promise<Pick<Profile, "id" | "email" | "full_name" | "store_id"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, store_id")
    .eq("store_id", storeId)
    .eq("is_store_pos", true)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function getActivePosOperator(
  terminalProfile: Pick<Profile, "id" | "is_store_pos">
): Promise<PosOperatorSession | null> {
  if (!terminalProfile.is_store_pos) return null;

  const supabase = await createClient();
  const { data: session, error } = await supabase
    .from("pos_operator_sessions")
    .select(
      "id, store_id, terminal_user_id, operator_id, auth_method, started_at, ended_at"
    )
    .eq("terminal_user_id", terminalProfile.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .maybeSingle();

  if (error || !session) return null;

  const { data: operator } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", session.operator_id)
    .maybeSingle();

  return {
    ...session,
    operator: operator ?? null,
  };
}

export async function requirePosOperatorId(
  profile: Profile
): Promise<{ operatorId: string | null; error?: string }> {
  // Compte caisse magasin : ventes au nom du terminal (resolve_sale_cashier_id → auth.uid())
  return { operatorId: null };
}

export async function getEffectiveCashierId(
  profile: Profile
): Promise<{ cashierId: string; error?: string }> {
  return { cashierId: profile.id };
}

export async function getCashierNfcCard(
  storeId: string,
  cashierId: string
): Promise<{ nfc_uid: string; label: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cashier_nfc_cards")
    .select("nfc_uid, label")
    .eq("store_id", storeId)
    .eq("cashier_id", cashierId)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}
