"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";

const FAB_PATHS = ["/director/fabrication-products", "/hub/fabrication-products"];

function revalidateFabricationPages() {
  for (const path of FAB_PATHS) {
    revalidatePath(path);
  }
}

async function assertFabricationHubAccess(
  hubStoreId: string
): Promise<{ error?: string }> {
  const profile = await requireRole(["directeur", "admin", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, city, is_hub")
    .eq("id", hubStoreId)
    .eq("is_active", true)
    .maybeSingle();

  if (!store?.is_hub) return { error: "Dépôt introuvable" };

  if (profile.role === "hub" && profile.city !== store.city) {
    return { error: "Accès refusé à ce dépôt" };
  }

  return {};
}

export async function createFabricationProduct(input: {
  name: string;
  productCode?: string | null;
  unit?: string;
  category?: string | null;
  description?: string | null;
  hubStoreId: string;
  initialStock?: number;
}): Promise<{ success: true; id: string } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const name = input.name.trim();
  if (!name) return { error: "Le nom est requis" };

  const access = await assertFabricationHubAccess(input.hubStoreId);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();
  const { data: product, error } = await admin
    .from("fabrication_products")
    .insert({
      name,
      product_code: input.productCode?.trim() || null,
      unit: input.unit?.trim() || "unité",
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const initialStock = Math.max(0, input.initialStock ?? 0);
  const { error: invError } = await admin.from("fabrication_inventory").upsert(
    {
      hub_store_id: input.hubStoreId,
      fabrication_product_id: product.id,
      stock: initialStock,
    },
    { onConflict: "hub_store_id,fabrication_product_id" }
  );

  if (invError) return { error: invError.message };

  revalidateFabricationPages();
  return { success: true, id: product.id };
}

export async function updateFabricationProduct(input: {
  id: string;
  name: string;
  productCode?: string | null;
  unit?: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
}): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };

  const name = input.name.trim();
  if (!name) return { error: "Le nom est requis" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("fabrication_products")
    .update({
      name,
      product_code: input.productCode?.trim() || null,
      unit: input.unit?.trim() || "unité",
      category: input.category?.trim() || null,
      description: input.description?.trim() || null,
      is_active: input.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidateFabricationPages();
  return { success: true };
}

export async function setFabricationProductStock(
  productId: string,
  hubStoreId: string,
  stock: number
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "Stock invalide" };
  }

  const access = await assertFabricationHubAccess(hubStoreId);
  if (access.error) return { error: access.error };

  const admin = createAdminClient();
  const { error } = await admin.from("fabrication_inventory").upsert(
    {
      hub_store_id: hubStoreId,
      fabrication_product_id: productId,
      stock: Math.floor(stock),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "hub_store_id,fabrication_product_id" }
  );

  if (error) return { error: error.message };

  revalidateFabricationPages();
  return { success: true };
}

export async function addFabricationProductStock(
  productId: string,
  hubStoreId: string,
  quantity: number
): Promise<{ success: true } | { error: string }> {
  const profile = await requireRole(["directeur", "admin", "hub"]);
  if (!profile) return { error: "Non autorisé" };

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantité invalide" };
  }

  const access = await assertFabricationHubAccess(hubStoreId);
  if (access.error) return { error: access.error };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("fabrication_inventory")
    .select("stock")
    .eq("hub_store_id", hubStoreId)
    .eq("fabrication_product_id", productId)
    .maybeSingle();

  const current = row?.stock ?? 0;
  return setFabricationProductStock(productId, hubStoreId, current + Math.floor(quantity));
}
