import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { FabricationProduct, Store } from "@/lib/types";

export async function getHubStoresForFabrication(
  city?: string | null
): Promise<Store[]> {
  const supabase = await createClient();
  let query = supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true)
    .order("city")
    .order("name");

  if (city) {
    query = query.eq("city", city);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fabrication] hub stores:", error.message);
    return [];
  }
  return data || [];
}

export async function getFabricationProductsWithStock(
  hubStoreId: string
): Promise<FabricationProduct[]> {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("fabrication_products")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (error) {
    console.error("[fabrication] products:", error.message);
    return [];
  }

  const { data: inventory, error: invError } = await supabase
    .from("fabrication_inventory")
    .select("fabrication_product_id, stock")
    .eq("hub_store_id", hubStoreId);

  if (invError) {
    console.error("[fabrication] inventory:", invError.message);
    return [];
  }

  const stockByProduct = new Map(
    (inventory || []).map((row) => [row.fabrication_product_id as string, row.stock as number])
  );

  return (products || []).map((product) => ({
    ...(product as Omit<FabricationProduct, "stock">),
    stock: stockByProduct.get(product.id as string) ?? 0,
  }));
}

export async function getAllFabricationProducts(): Promise<FabricationProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fabrication_products")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    console.error("[fabrication] all products:", error.message);
    return [];
  }

  return (data || []).map((product) => ({
    ...(product as Omit<FabricationProduct, "stock">),
    stock: 0,
  }));
}
