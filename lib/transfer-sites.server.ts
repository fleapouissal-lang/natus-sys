import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSellableProduct } from "@/lib/products/product-utils";
import type { Product, Profile, Store } from "@/lib/types";

export async function getAllActiveTransferSites(): Promise<Store[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data || [];
}

export async function getTransferStoreById(storeId: string): Promise<Store | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();
  return data;
}

export async function getProductsWithStoreStockForTransfer(
  storeId: string,
  options?: { includeParents?: boolean }
): Promise<Product[]> {
  const admin = createAdminClient();

  const [{ data: products }, { data: inventory }] = await Promise.all([
    admin.from("products").select("*").order("name"),
    admin
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
      parent_image_url: parent?.image_url ?? null,
      parent_category: parent?.category ?? null,
      parent_categories: parent?.categories?.length
        ? parent.categories
        : parent?.category
          ? [parent.category]
          : null,
    };
  });
}

/** Livreurs par ville pour la page transferts gérant (hubs multi-villes). */
export async function getTransferLivreurs(cities: string[]): Promise<Profile[]> {
  const uniqueCities = [
    ...new Set(cities.map((city) => city?.trim()).filter(Boolean)),
  ] as string[];
  if (uniqueCities.length === 0) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, role, city, is_active")
    .eq("role", "livreur")
    .eq("is_active", true)
    .in("city", uniqueCities)
    .order("full_name");

  if (error) {
    console.error("getTransferLivreurs:", error.message);
    return [];
  }

  return (data || []) as Profile[];
}
