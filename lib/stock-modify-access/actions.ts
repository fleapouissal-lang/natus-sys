"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getHubStoreByCity } from "@/lib/hub";
import { getStoreById } from "@/lib/inventory";
import {
  canManageStore,
  filterRetailStoresByProfile,
  isDirector,
  isHub,
  isManager,
} from "@/lib/permissions";
import { toLocalDateKey } from "@/lib/utils";
import type { Profile } from "@/lib/types";

function actionError(message: string): { error: string } {
  return { error: message };
}

function revalidateStockAccessPaths() {
  revalidatePath("/manager/stock");
  revalidatePath("/hub/stock");
  revalidatePath("/director/stock-access");
  revalidatePath("/director/stock");
}

function parseDateKey(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

async function validateStoreIdsForManager(profile: Profile, storeIds: string[]): Promise<string[] | { error: string }> {
  if (storeIds.length === 0) return actionError("Sélectionnez au moins un magasin");

  const unique = [...new Set(storeIds)];
  for (const storeId of unique) {
    const store = await getStoreById(storeId);
    if (!store || store.is_hub || !store.is_active) {
      return actionError("Magasin invalide");
    }
    if (!canManageStore(profile, store)) {
      return actionError("Magasin non autorisé");
    }
  }
  return unique;
}

export async function createStockModifyAccessRequest(input: {
  validFrom: string;
  validTo: string;
  storeIds?: string[];
  requestNote?: string;
}): Promise<{ success: true; requestId: string } | { error: string }> {
  const profile = await requireRole(["manager", "hub"]);
  if (!profile) return actionError("Non autorisé");

  const validFrom = parseDateKey(input.validFrom);
  const validTo = parseDateKey(input.validTo);
  if (!validFrom || !validTo) return actionError("Dates invalides");
  if (validTo < validFrom) return actionError("La date de fin doit être après la date de début");

  const today = toLocalDateKey(new Date());
  if (validTo < today) return actionError("La période ne peut pas être entièrement dans le passé");

  const supabase = await createClient();

  let hubStoreId: string | null = null;
  let storeIds: string[] = [];

  if (isManager(profile)) {
    const validated = await validateStoreIdsForManager(profile, input.storeIds || []);
    if ("error" in validated) return validated;
    storeIds = validated;
  } else if (isHub(profile)) {
    if (!profile.city) return actionError("Ville du dépôt introuvable");
    const hubStore = await getHubStoreByCity(profile.city);
    if (!hubStore) return actionError("Entrepôt dépôt introuvable");
    hubStoreId = hubStore.id;
  }

  const { data: request, error } = await supabase
    .from("stock_modify_access_requests")
    .insert({
      requester_id: profile.id,
      requester_role: profile.role === "hub" ? "hub" : "manager",
      valid_from: validFrom,
      valid_to: validTo,
      hub_store_id: hubStoreId,
      request_note: input.requestNote?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !request) {
    console.error("[stock-modify-access] create:", error?.message);
    return actionError(error?.message || "Erreur lors de la demande");
  }

  if (storeIds.length > 0) {
    const { error: linkError } = await supabase.from("stock_modify_access_request_stores").insert(
      storeIds.map((storeId) => ({
        request_id: request.id,
        store_id: storeId,
      }))
    );
    if (linkError) {
      console.error("[stock-modify-access] link stores:", linkError.message);
      return actionError(linkError.message);
    }
  }

  revalidateStockAccessPaths();
  return { success: true, requestId: request.id };
}

export async function reviewStockModifyAccessRequest(input: {
  requestId: string;
  approve: boolean;
  reviewNote?: string;
}): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return actionError("Seul le directeur peut valider les demandes");

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("stock_modify_access_requests")
    .select("id, status")
    .eq("id", input.requestId)
    .maybeSingle();

  if (fetchError) return actionError(fetchError.message);
  if (!existing) return actionError("Demande introuvable");
  if (existing.status !== "pending") return actionError("Cette demande a déjà été traitée");

  const { error } = await supabase
    .from("stock_modify_access_requests")
    .update({
      status: input.approve ? "approved" : "rejected",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      review_note: input.reviewNote?.trim() || null,
    })
    .eq("id", input.requestId);

  if (error) return actionError(error.message);

  revalidateStockAccessPaths();
  return { success: true };
}

export async function getManagerStoresForAccessRequest(
  profile: Profile
): Promise<{ id: string; name: string; city: string }[]> {
  if (!isManager(profile)) return [];
  const { getActiveStores } = await import("@/lib/inventory");
  const { getCityFilter } = await import("@/lib/permissions");
  const stores = filterRetailStoresByProfile(await getActiveStores(getCityFilter(profile)), profile);
  return stores.map((s) => ({ id: s.id, name: s.name, city: s.city }));
}

export async function canRequestStockModifyAccess(profile: Profile): Promise<boolean> {
  return isManager(profile) || isHub(profile);
}

export async function directorCanReviewStockAccess(profile: Profile): Promise<boolean> {
  return isDirector(profile);
}
