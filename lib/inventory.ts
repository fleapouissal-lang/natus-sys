import { createClient } from "@/lib/supabase/server";
import type { CashierSummary, Product, Store, StoreWithStats } from "@/lib/types";
import { isSellableProduct } from "@/lib/products/product-utils";

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
    .eq("is_store_pos", false)
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

export async function getProductsWithStoreStock(
  storeId: string,
  options?: { includeParents?: boolean }
): Promise<Product[]> {
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

  const allProducts = products || [];
  const parentById = new Map(
    allProducts
      .filter((product) => product.product_kind === "parent")
      .map((product) => [product.id, product] as const)
  );

  const list = options?.includeParents
    ? allProducts
    : allProducts.filter(isSellableProduct);

  return list.map((product) => {
    const parent = product.parent_id ? parentById.get(product.parent_id) : null;
    return {
      ...product,
      stock: stockMap.get(product.id) ?? 0,
      parent_name: parent?.name ?? null,
    };
  });
}

/** Stock total par produit, agrégé sur tous les magasins actifs (optionnellement filtrés par ville). */
export async function getProductsWithTotalStock(
  city?: string | null
): Promise<Product[]> {
  const supabase = await createClient();
  const stores = await getActiveStores(city);
  const storeIds = stores.map((s) => s.id);

  const [{ data: products }, { data: inventory }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    storeIds.length > 0
      ? supabase
          .from("store_inventory")
          .select("product_id, stock")
          .in("store_id", storeIds)
      : Promise.resolve({ data: [] as { product_id: string; stock: number }[] }),
  ]);

  const stockMap = new Map<string, number>();
  for (const row of inventory || []) {
    stockMap.set(
      row.product_id,
      (stockMap.get(row.product_id) ?? 0) + row.stock
    );
  }

  return (products || []).map((product) => ({
    ...product,
    stock: stockMap.get(product.id) ?? 0,
  }));
}

export async function getProductCatalog(): Promise<
  Pick<Product, "id" | "name" | "barcode" | "image_url" | "category" | "price">[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, barcode, image_url, category, price")
    .order("name");
  return data || [];
}

export async function getStoreStockMap(storeId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("store_inventory")
    .select("product_id, stock")
    .eq("store_id", storeId);

  const map: Record<string, number> = {};
  for (const row of data || []) {
    map[row.product_id as string] = row.stock as number;
  }
  return map;
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

export async function getHubStore(city?: string | null): Promise<Store | null> {
  const supabase = await createClient();
  let query = supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true);

  if (city) {
    query = query.eq("city", city);
  }

  const { data } = await query.maybeSingle();
  return data;
}

/** Magasins cibles pour transfert : même ville (hors soi) + hub stock parent. */
export async function getOrderTransferTargets(fromStoreId: string): Promise<Store[]> {
  const fromStore = await getStoreById(fromStoreId);
  if (!fromStore) return [];

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: cityStores, error: cityError } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("city", fromStore.city)
    .neq("id", fromStoreId)
    .order("name");

  if (cityError) {
    console.error("getOrderTransferTargets:", cityError.message);
    return [];
  }

  const { data: hubStore, error: hubError } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true)
    .eq("city", fromStore.city)
    .maybeSingle();

  if (hubError) {
    console.error("getOrderTransferTargets hub:", hubError.message);
  }

  const targets = (cityStores || []).filter((store) => !store.is_hub);
  if (hubStore && hubStore.id !== fromStoreId) {
    targets.push(hubStore);
  }

  return targets;
}
