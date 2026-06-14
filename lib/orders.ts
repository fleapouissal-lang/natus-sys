import { createClient } from "@/lib/supabase/server";
import type { Profile, ShopifyOrder } from "@/lib/types";
import { getCityFilter, isDirector } from "@/lib/permissions";

export interface OrdersQuery {
  city?: string | null;
  storeId?: string | null;
  limit?: number;
}

export async function getShopifyOrders(
  profile: Profile,
  query: OrdersQuery = {}
): Promise<ShopifyOrder[]> {
  const supabase = await createClient();
  const limit = query.limit ?? 100;

  let dbQuery = supabase
    .from("shopify_orders")
    .select("*, stores(name, city)")
    .order("shopify_created_at", { ascending: false })
    .limit(limit);

  if (profile.role === "cashier") {
    if (!profile.store_id) return [];
    dbQuery = dbQuery.eq("store_id", profile.store_id);
  } else if (profile.role === "manager") {
    const city = profile.city;
    if (!city) return [];
    dbQuery = dbQuery.eq("city", city);
    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
  } else if (isDirector(profile)) {
    if (query.city) dbQuery = dbQuery.eq("city", query.city);
    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("getShopifyOrders:", error.message);
    return [];
  }

  return (data || []) as ShopifyOrder[];
}

export function resolveOrdersStoreIds(
  stores: { id: string; city: string }[],
  opts: { city?: string | null; storeId?: string | null }
): string[] {
  if (opts.storeId) return [opts.storeId];
  if (opts.city) return stores.filter((s) => s.city === opts.city).map((s) => s.id);
  return stores.map((s) => s.id);
}

export function getOrdersScopeLabel(
  profile: Profile,
  opts: {
    city?: string;
    storeName?: string;
  }
): string {
  if (profile.role === "cashier") {
    return opts.storeName ? `Magasin — ${opts.storeName}` : "Mon magasin";
  }
  if (opts.storeName) return `${opts.storeName}${opts.city ? ` — ${opts.city}` : ""}`;
  if (opts.city) return `Tous les magasins — ${opts.city}`;
  if (isDirector(profile)) return "Toutes les commandes";
  return profile.city ? `Ville — ${profile.city}` : "Commandes";
}

export { getCityFilter };
