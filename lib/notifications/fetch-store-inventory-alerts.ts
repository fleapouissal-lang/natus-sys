import type { SupabaseClient } from "@supabase/supabase-js";
import { HUB_LOW_STOCK_THRESHOLD, RETAIL_LOW_STOCK_THRESHOLD } from "@/lib/notifications/stock-alert";

const PAGE_SIZE = 1000;

export type StoreInventoryAlertRow = {
  store_id: string;
  product_id: string;
  stock: number;
};

type StoreRef = { id: string; is_hub?: boolean | null };

async function fetchPaginatedInventory(
  supabase: SupabaseClient,
  buildQuery: (
    client: SupabaseClient
  ) => {
    range: (from: number, to: number) => PromiseLike<{
      data: { store_id: string; product_id: string; stock: number | null }[] | null;
      error: { message: string } | null;
    }>;
  }
): Promise<StoreInventoryAlertRow[]> {
  const rows: StoreInventoryAlertRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(supabase).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      rows.push({
        store_id: row.store_id,
        product_id: row.product_id,
        stock: Number(row.stock) || 0,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

/** Lignes d'inventaire déjà en alerte (rupture ou sous seuil), avec pagination. */
export async function fetchStoreInventoryAlertRows(
  supabase: SupabaseClient,
  stores: StoreRef[]
): Promise<StoreInventoryAlertRow[]> {
  const retailIds = stores.filter((s) => !s.is_hub).map((s) => s.id);
  const hubIds = stores.filter((s) => s.is_hub).map((s) => s.id);
  const rows: StoreInventoryAlertRow[] = [];

  if (retailIds.length > 0) {
    const retailRows = await fetchPaginatedInventory(supabase, (client) =>
      client
        .from("store_inventory")
        .select("store_id, product_id, stock")
        .in("store_id", retailIds)
        .or(`stock.lte.0,stock.lt.${RETAIL_LOW_STOCK_THRESHOLD}`)
    );
    rows.push(...retailRows);
  }

  if (hubIds.length > 0) {
    const hubRows = await fetchPaginatedInventory(supabase, (client) =>
      client
        .from("store_inventory")
        .select("store_id, product_id, stock")
        .in("store_id", hubIds)
        .lt("stock", HUB_LOW_STOCK_THRESHOLD)
    );
    rows.push(...hubRows);
  }

  return rows;
}

/** Inventaire complet d'un magasin (pagination si > 1000 références). */
export async function fetchStoreInventoryRows(
  supabase: SupabaseClient,
  storeId: string
): Promise<StoreInventoryAlertRow[]> {
  return fetchPaginatedInventory(supabase, (client) =>
    client
      .from("store_inventory")
      .select("store_id, product_id, stock")
      .eq("store_id", storeId)
  );
}
