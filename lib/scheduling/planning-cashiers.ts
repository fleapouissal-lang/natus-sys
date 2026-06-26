import { createClient } from "@/lib/supabase/server";
import type { CashierSummary } from "@/lib/types";

export type PlanningCashier = CashierSummary & {
  store_id: string;
  sort_order: number;
};

export type PlanningCashierWithStore = PlanningCashier & {
  store_name: string;
};

export async function getPlanningCashiersForStores(
  storeIds: string[]
): Promise<PlanningCashierWithStore[]> {
  if (storeIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_planning_cashiers")
    .select("id, full_name, is_active, store_id, sort_order, stores(name)")
    .in("store_id", storeIds)
    .eq("is_active", true)
    .order("sort_order")
    .order("full_name");

  if (error) {
    console.error("[planning-cashiers] list:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const storeRel = row.stores as unknown;
    const storeRow = Array.isArray(storeRel)
      ? (storeRel[0] as { name?: string } | undefined)
      : (storeRel as { name?: string } | null);

    return {
      id: row.id,
      full_name: row.full_name,
      email: "",
      is_active: row.is_active,
      store_id: row.store_id as string,
      sort_order: row.sort_order as number,
      store_name: storeRow?.name || "—",
    };
  });
}

export async function getStorePlanningCashiers(
  storeId: string,
  options?: { includeInactive?: boolean }
): Promise<PlanningCashier[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_planning_cashiers")
    .select("id, full_name, is_active, store_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order")
    .order("full_name");

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[planning-cashiers] store list:", error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: "",
    is_active: row.is_active,
    store_id: row.store_id,
    sort_order: row.sort_order,
  }));
}

export async function getPlanningCashiersByStore(): Promise<
  Record<string, PlanningCashier[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_planning_cashiers")
    .select("id, full_name, is_active, store_id, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("full_name");

  if (error) {
    console.error("[planning-cashiers] by store:", error.message);
    return {};
  }

  const map: Record<string, PlanningCashier[]> = {};
  for (const row of data || []) {
    if (!row.store_id) continue;
    if (!map[row.store_id]) map[row.store_id] = [];
    map[row.store_id].push({
      id: row.id,
      full_name: row.full_name,
      email: "",
      is_active: row.is_active,
      store_id: row.store_id,
      sort_order: row.sort_order,
    });
  }
  return map;
}
