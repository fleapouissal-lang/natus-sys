import { createClient } from "@/lib/supabase/server";
import type {
  DashboardStats,
  Store,
  StoreOverviewRow,
  StoreRecentOrder,
  StoreRecentSale,
  StoreRecentStock,
  StoreSnapshot,
  StoreWithStats,
} from "@/lib/types";

const RECENT_LIMIT = 5;

function takePerStore<T extends { store_id: string | null }>(
  rows: T[],
  storeIds: string[],
  limit: number
): Map<string, T[]> {
  const map = new Map<string, T[]>(storeIds.map((id) => [id, []]));

  for (const row of rows) {
    if (!row.store_id) continue;
    const bucket = map.get(row.store_id);
    if (!bucket || bucket.length >= limit) continue;
    bucket.push(row);
  }

  return map;
}

function unwrapProfile(
  value:
    | { full_name: string | null; email: string }
    | { full_name: string | null; email: string }[]
    | null
    | undefined
): string | null {
  if (!value) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name || row?.email || null;
}

function unwrapProductName(
  value: { name: string } | { name: string }[] | null | undefined
): string {
  if (!value) return "Produit";
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name || "Produit";
}

function stockActionLabel(type: string, quantity: number): string {
  if (type === "add") return "Ajout";
  if (type === "adjustment") return "Ajustement";
  if (type === "transfer") return quantity > 0 ? "Réception hub" : "Envoi hub";
  return "Stock";
}

export async function getStoresSnapshots(
  stores: Pick<Store, "id" | "name">[]
): Promise<StoreSnapshot[]> {
  if (stores.length === 0) return [];

  const supabase = await createClient();
  const storeIds = stores.map((s) => s.id);
  const fetchLimit = Math.max(storeIds.length * RECENT_LIMIT, 25);

  const [{ data: sales }, { data: orders }, { data: movements }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, total, payment_method, created_at, store_id, profiles:cashier_id(full_name, email)"
      )
      .in("store_id", storeIds)
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("shopify_orders")
      .select(
        "id, order_number, total, payment_type, workflow_status, customer_name, created_at, shopify_created_at, store_id"
      )
      .in("store_id", storeIds)
      .order("shopify_created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("stock_movements")
      .select(
        "id, quantity, type, notes, created_at, store_id, related_store_id, products(name), profiles:created_by(full_name, email)"
      )
      .in("store_id", storeIds)
      .in("type", ["add", "adjustment", "transfer"])
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  const relatedStoreIds = [
    ...new Set(
      (movements || [])
        .map((row) => row.related_store_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const relatedStoreNameById = new Map<string, string>();
  if (relatedStoreIds.length > 0) {
    const { data: relatedStores } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", relatedStoreIds);
    for (const store of relatedStores || []) {
      relatedStoreNameById.set(store.id, store.name);
    }
  }

  const salesByStore = takePerStore(sales || [], storeIds, RECENT_LIMIT);
  const ordersByStore = takePerStore(orders || [], storeIds, RECENT_LIMIT);
  const stockByStore = takePerStore(movements || [], storeIds, RECENT_LIMIT);

  return stores.map((store) => ({
    storeId: store.id,
    storeName: store.name,
    recentSales: (salesByStore.get(store.id) || []).map((row) => ({
      id: row.id,
      total: Number(row.total),
      payment_method: row.payment_method,
      created_at: row.created_at,
      cashier_name: unwrapProfile(
        row.profiles as
          | { full_name: string | null; email: string }
          | { full_name: string | null; email: string }[]
          | null
      ),
    })) satisfies StoreRecentSale[],
    recentOrders: (ordersByStore.get(store.id) || []).map((row) => ({
      id: row.id,
      order_number: row.order_number,
      total: Number(row.total),
      payment_type: row.payment_type,
      workflow_status: row.workflow_status,
      customer_name: row.customer_name,
      created_at: row.shopify_created_at || row.created_at,
    })) satisfies StoreRecentOrder[],
    recentStockAdds: (stockByStore.get(store.id) || []).map((row) => ({
      id: row.id,
      product_name: unwrapProductName(
        row.products as { name: string } | { name: string }[] | null
      ),
      quantity: row.quantity as number,
      created_at: row.created_at,
      actor_name: unwrapProfile(
        row.profiles as
          | { full_name: string | null; email: string }
          | { full_name: string | null; email: string }[]
          | null
      ),
      action_label: stockActionLabel(row.type as string, row.quantity as number),
      related_store_name: row.related_store_id
        ? relatedStoreNameById.get(row.related_store_id as string) ?? null
        : null,
    })) satisfies StoreRecentStock[],
  }));
}

export async function getStoreOverviewStats(
  stores: StoreWithStats[]
): Promise<StoreOverviewRow[]> {
  if (stores.length === 0) return [];

  const supabase = await createClient();
  const storeIds = stores.map((s) => s.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  const { data: sales } = await supabase
    .from("sales")
    .select("store_id, total, created_at")
    .in("store_id", storeIds);

  return stores.map((store) => {
    const storeSales = (sales || []).filter((s) => s.store_id === store.id);
    const todaySalesRows = storeSales.filter(
      (s) => new Date(s.created_at) >= today
    );
    const weekSalesRows = storeSales.filter(
      (s) => new Date(s.created_at) >= weekStart
    );

    const sum = (rows: { total: number }[]) =>
      rows.reduce((acc, s) => acc + Number(s.total), 0);

    return {
      storeId: store.id,
      storeName: store.name,
      todayRevenue: sum(todaySalesRows),
      todaySales: todaySalesRows.length,
      weekRevenue: sum(weekSalesRows),
      totalRevenue: sum(storeSales),
      totalSales: storeSales.length,
      lowStockCount: store.lowStockCount,
      totalUnits: store.totalUnits,
    };
  });
}

export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: totalProducts },
    { data: sales },
    { data: todaySales },
    { data: inventory },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("sales").select("total").eq("store_id", storeId),
    supabase
      .from("sales")
      .select("total")
      .eq("store_id", storeId)
      .gte("created_at", today.toISOString()),
    supabase
      .from("store_inventory")
      .select("stock")
      .eq("store_id", storeId),
  ]);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const todayRevenue =
    todaySales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
  const lowStockCount =
    inventory?.filter((row) => row.stock > 0 && row.stock < 10).length || 0;

  return {
    totalSales: sales?.length || 0,
    totalRevenue,
    totalProducts: totalProducts || 0,
    lowStockCount,
    todaySales: todaySales?.length || 0,
    todayRevenue,
  };
}
