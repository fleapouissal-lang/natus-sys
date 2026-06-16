import { fetchShopifyOrders, isShopifyConfigured } from "@/lib/shopify/client";
import { processShopifyOrder } from "@/lib/shopify/process-order";

export interface ShopifySyncResult {
  synced: number;
  failed: number;
}

export async function runShopifyOrdersSync(
  limit = 100
): Promise<
  ({ success: true } & ShopifySyncResult) | { success: false; error: string }
> {
  if (!isShopifyConfigured()) {
    return { success: false, error: "Shopify non configuré (variables d'environnement)" };
  }

  try {
    const orders = await fetchShopifyOrders(limit);
    let synced = 0;
    let failed = 0;

    for (const order of orders) {
      const result = await processShopifyOrder(order);
      if (result.ok) synced++;
      else failed++;
    }

    return { success: true, synced, failed };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur sync Shopify",
    };
  }
}
