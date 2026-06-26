import { createClient } from "@/lib/supabase/server";
import type { ProductSalesQtyMap } from "@/lib/pos/product-sales-rank";

export async function getStoreProductSalesQuantities(
  storeId: string
): Promise<ProductSalesQtyMap> {
  if (!storeId) return {};

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_store_product_sales_qty", {
    p_store_id: storeId,
  });

  if (error) {
    console.error("[pos] product sales rank:", error.message);
    return {};
  }

  if (!data || typeof data !== "object") return {};

  const map: ProductSalesQtyMap = {};
  for (const [productId, qty] of Object.entries(data as Record<string, unknown>)) {
    const n = Number(qty);
    if (Number.isFinite(n) && n > 0) map[productId] = n;
  }
  return map;
}
