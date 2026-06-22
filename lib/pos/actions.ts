"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { canManageStore } from "@/lib/permissions";
import {
  getActivePosOperator,
  getStorePosAccount,
} from "@/lib/pos/operator-session";
import { normalizeNfcUid } from "@/lib/pos/nfc";
import type { Profile } from "@/lib/types";

const MANAGEMENT = ["directeur", "admin", "manager"] as const;

async function endActiveSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  terminalUserId: string
) {
  await supabase
    .from("pos_operator_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("terminal_user_id", terminalUserId)
    .is("ended_at", null);
}

async function startOperatorSession(
  terminalProfile: Profile,
  operatorId: string,
  authMethod: "password" | "nfc"
) {
  const supabase = await createClient();
  await endActiveSessions(supabase, terminalProfile.id);

  const { error } = await supabase.from("pos_operator_sessions").insert({
    store_id: terminalProfile.store_id,
    terminal_user_id: terminalProfile.id,
    operator_id: operatorId,
    auth_method: authMethod,
  });

  if (error) return { error: error.message };

  revalidatePath("/cashier", "layout");
  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/planning");
  redirect("/cashier/pos");
}

async function validateOperatorForTerminal(
  terminalProfile: Profile,
  operatorId: string
): Promise<{ error?: string }> {
  if (!terminalProfile.is_store_pos || !terminalProfile.store_id) {
    return { error: "Ce compte n'est pas une caisse magasin" };
  }

  const admin = createAdminClient();
  const { data: operator } = await admin
    .from("profiles")
    .select("id, role, store_id, is_active, is_store_pos, full_name, email")
    .eq("id", operatorId)
    .maybeSingle();

  if (!operator) {
    return {
      error:
        "Compte caissier introuvable. Vérifiez que le compte existe (npm run seed:users) et qu'il est affecté à ce magasin.",
    };
  }

  if (operator.is_store_pos) {
    return {
      error:
        "Utilisez votre compte caissier personnel (Oussal, Hajar…), pas le compte caisse magasin déjà ouvert sur cet appareil.",
    };
  }

  if (operator.role !== "cashier" || !operator.is_active) {
    return { error: "Compte caissier introuvable ou inactif" };
  }

  if (operator.store_id !== terminalProfile.store_id) {
    return { error: "Ce caissier n'est pas affecté à ce magasin" };
  }

  return {};
}

async function verifyCashierPassword(
  email: string,
  password: string
): Promise<{ operatorId?: string; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { error: "Configuration Supabase manquante" };

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    user?: { id?: string };
    error_description?: string;
    msg?: string;
  } | null;

  if (!response.ok || !payload?.user?.id) {
    return { error: "Email ou mot de passe incorrect" };
  }

  return { operatorId: payload.user.id };
}

export async function signInPosOperatorByPassword(
  email: string,
  password: string
): Promise<{ success?: true; error?: string }> {
  const terminalProfile = await requireRole(["cashier"]);
  if (!terminalProfile?.is_store_pos) {
    return { error: "Compte caisse magasin requis" };
  }

  const verified = await verifyCashierPassword(email, password);
  if (verified.error || !verified.operatorId) {
    return { error: verified.error ?? "Authentification impossible" };
  }

  const operatorCheck = await validateOperatorForTerminal(
    terminalProfile,
    verified.operatorId
  );
  if (operatorCheck.error) return operatorCheck;

  return startOperatorSession(terminalProfile, verified.operatorId, "password");
}

export async function signInPosOperatorByNfc(
  rawUid: string
): Promise<{ success?: true; error?: string }> {
  const terminalProfile = await requireRole(["cashier"]);
  if (!terminalProfile?.is_store_pos || !terminalProfile.store_id) {
    return { error: "Compte caisse magasin requis" };
  }

  const nfcUid = normalizeNfcUid(rawUid);
  if (!nfcUid) return { error: "Carte NFC invalide" };

  const admin = createAdminClient();
  const { data: card } = await admin
    .from("cashier_nfc_cards")
    .select("cashier_id, store_id, is_active")
    .eq("nfc_uid", nfcUid)
    .eq("is_active", true)
    .maybeSingle();

  if (!card || card.store_id !== terminalProfile.store_id) {
    return { error: "Carte NFC non reconnue pour ce magasin" };
  }

  const operatorCheck = await validateOperatorForTerminal(
    terminalProfile,
    card.cashier_id
  );
  if (operatorCheck.error) return operatorCheck;

  return startOperatorSession(terminalProfile, card.cashier_id, "nfc");
}

export async function signOutPosOperator(): Promise<{ success?: true; error?: string }> {
  const terminalProfile = await requireRole(["cashier"]);
  if (!terminalProfile?.is_store_pos) {
    return { error: "Aucune session caissier active" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pos_operator_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("terminal_user_id", terminalProfile.id)
    .is("ended_at", null);

  if (error) return { error: error.message };

  revalidatePath("/cashier", "layout");
  revalidatePath("/cashier/pos");
  revalidatePath("/cashier/planning");
  return { success: true };
}

export async function getPosOperatorState(): Promise<{
  isStorePos: boolean;
  operator: Awaited<ReturnType<typeof getActivePosOperator>>;
}> {
  const profile = await requireRole(["cashier"]);
  if (!profile) {
    return { isStorePos: false, operator: null };
  }

  if (!profile.is_store_pos) {
    return { isStorePos: false, operator: null };
  }

  const operator = await getActivePosOperator(profile);
  return { isStorePos: true, operator };
}

export async function assignCashierNfcCard(input: {
  cashierId: string;
  nfcUid: string;
  label?: string | null;
}): Promise<{ success?: true; error?: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("profiles")
    .select("id, role, store_id, is_store_pos")
    .eq("id", input.cashierId)
    .maybeSingle();

  if (
    !cashier ||
    cashier.role !== "cashier" ||
    cashier.is_store_pos ||
    !cashier.store_id
  ) {
    return { error: "Caissier introuvable" };
  }

  const store = await getStoreById(cashier.store_id);
  if (!store || !canManageStore(profile, store)) {
    return { error: "Accès refusé" };
  }

  const nfcUid = normalizeNfcUid(input.nfcUid);
  if (nfcUid.length < 4) return { error: "UID NFC invalide" };

  const admin = createAdminClient();
  const { error } = await admin.from("cashier_nfc_cards").upsert(
    {
      cashier_id: cashier.id,
      store_id: cashier.store_id,
      nfc_uid: nfcUid,
      label: input.label?.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "cashier_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/manager/users");
  revalidatePath("/director/users");
  return { success: true };
}

export async function removeCashierNfcCard(
  cashierId: string
): Promise<{ success?: true; error?: string }> {
  const profile = await requireRole([...MANAGEMENT]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: cashier } = await supabase
    .from("profiles")
    .select("id, store_id")
    .eq("id", cashierId)
    .maybeSingle();

  if (!cashier?.store_id) return { error: "Caissier introuvable" };

  const store = await getStoreById(cashier.store_id);
  if (!store || !canManageStore(profile, store)) {
    return { error: "Accès refusé" };
  }

  const { error } = await supabase
    .from("cashier_nfc_cards")
    .delete()
    .eq("cashier_id", cashierId);

  if (error) return { error: error.message };

  revalidatePath("/manager/users");
  revalidatePath("/director/users");
  return { success: true };
}

export async function storeHasPosAccount(storeId: string): Promise<boolean> {
  const account = await getStorePosAccount(storeId);
  return Boolean(account);
}
