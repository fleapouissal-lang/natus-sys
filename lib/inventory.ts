import { createClient } from "@/lib/supabase/server";
import type { CashierSummary, Product, Store, StoreWithStats } from "@/lib/types";

export async function getActiveStores(city?: string | null): Promise<Store[]> {
  const supabase = await createClient();
  let query = supabase.from("stores").select("*").eq("is_active", true).order("name");

  if (city) {
    query = query.eq("city", city);
  }

  const { data } = await query;
  return data || [];
}

export async function getCashiersByStore(): Promise<Record<string, CashierSummary[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active, store_id")
    .eq("role", "cashier")
    .not("store_id", "is", null);

  const map: Record<string, CashierSummary[]> = {};

  for (const cashier of data || []) {
    if (!cashier.store_id) continue;
    if (!map[cashier.store_id]) map[cashier.store_id] = [];
    map[cashier.store_id].push({
      id: cashier.id,
      full_name: cashier.full_name,
      email: cashier.email,
      is_active: cashier.is_active,
    });
  }

  return map;
}

export async function getProductsWithStoreStock(storeId: string): Promise<Product[]> {
  const supabase = await createClient();

  const [{ data: products }, { data: inventory }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    supabase
      .from("store_inventory")
      .select("product_id, stock")
      .eq("store_id", storeId),
  ]);

  const stockMap = new Map(
    (inventory || []).map((row) => [row.product_id, row.stock as number])
  );

  return (products || []).map((product) => ({
    ...product,
    stock: stockMap.get(product.id) ?? 0,
  }));
}

export async function getStoreInventory(storeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_inventory")
    .select("*, products(*)")
    .eq("store_id", storeId)
    .order("stock", { ascending: true });

  return data || [];
}

export async function getStoresWithStats(city?: string | null): Promise<StoreWithStats[]> {
  const supabase = await createClient();
  const stores = await getActiveStores(city);
  const cashiersByStore = await getCashiersByStore();

  const stats = await Promise.all(
    stores.map(async (store) => {
      const { data: inventory } = await supabase
        .from("store_inventory")
        .select("stock")
        .eq("store_id", store.id);

      const rows = inventory || [];
      const totalUnits = rows.reduce((sum, row) => sum + row.stock, 0);
      const lowStockCount = rows.filter((row) => row.stock > 0 && row.stock < 10).length;
      const productCount = rows.filter((row) => row.stock > 0).length;

      return {
        ...store,
        productCount,
        totalUnits,
        lowStockCount,
        cashiers: cashiersByStore[store.id] || [],
      };
    })
  );

  return stats;
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").eq("id", storeId).maybeSingle();
  return data;
}
