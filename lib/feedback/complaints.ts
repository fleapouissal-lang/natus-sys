import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export type StoreComplaintSource = "shopify_delivery" | "pos_sale";

export type StoreComplaint = {
  id: string;
  store_id: string;
  source: StoreComplaintSource;
  shopify_order_id: string | null;
  sale_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  message: string;
  status: "new" | "resolved";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  stores?: { name: string; city: string } | null;
  shopify_orders?: { order_number: string } | null;
};

export async function createStoreComplaint(input: {
  storeId: string;
  source: StoreComplaintSource;
  shopifyOrderId?: string | null;
  saleId?: string | null;
  customerPhone: string;
  customerName?: string | null;
  message: string;
}): Promise<StoreComplaint | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("store_complaints")
    .insert({
      store_id: input.storeId,
      source: input.source,
      shopify_order_id: input.shopifyOrderId ?? null,
      sale_id: input.saleId ?? null,
      customer_phone: input.customerPhone,
      customer_name: input.customerName?.trim() || null,
      message: input.message.trim(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("[complaints] insert:", error.message);
    return null;
  }

  return data as StoreComplaint;
}

export async function getStoreComplaintsForProfile(
  profile: Profile
): Promise<StoreComplaint[]> {
  if (profile.role === "cashier" || profile.role === "livreur" || profile.role === "hub") {
    return [];
  }

  const admin = createAdminClient();
  let query = admin
    .from("store_complaints")
    .select(
      `
      *,
      stores ( name, city ),
      shopify_orders ( order_number )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (profile.role === "manager" && profile.city) {
    const { data: stores } = await admin
      .from("stores")
      .select("id")
      .eq("city", profile.city);
    const storeIds = (stores || []).map((s) => s.id);
    if (storeIds.length === 0) return [];
    query = query.in("store_id", storeIds);
  } else if (profile.role !== "directeur" && profile.role !== "admin") {
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error("[complaints] list:", error.message);
    return [];
  }

  return (data || []) as StoreComplaint[];
}

export async function countNewStoreComplaintsForProfile(
  profile: Profile
): Promise<number> {
  const complaints = await getStoreComplaintsForProfile(profile);
  return complaints.filter((c) => c.status === "new").length;
}
