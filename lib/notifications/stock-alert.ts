/** Seuil stock faible magasin (retail). */
export const RETAIL_LOW_STOCK_THRESHOLD = 20;

/** Seuil stock faible entrepôt / dépôt. */
export const HUB_LOW_STOCK_THRESHOLD = 100;

/** @deprecated Préférer retailLowStockThreshold() */
export const LOW_STOCK_THRESHOLD = RETAIL_LOW_STOCK_THRESHOLD;

export type StockAlertLevel = "ok" | "low" | "out";

export type StockAlertKind = "stock_low" | "stock_out";

export function lowStockThreshold(isHub = false): number {
  return isHub ? HUB_LOW_STOCK_THRESHOLD : RETAIL_LOW_STOCK_THRESHOLD;
}

export function stockAlertLevel(stock: number, isHub = false): StockAlertLevel {
  if (!Number.isFinite(stock) || stock <= 0) return "out";
  if (stock < lowStockThreshold(isHub)) return "low";
  return "ok";
}

/** Alerte lors d'un changement de palier (évite le spam à chaque vente). */
export function detectStockAlertTransition(
  previousStock: number | null | undefined,
  nextStock: number,
  isHub = false
): StockAlertKind | null {
  const prevLevel =
    previousStock == null ? null : stockAlertLevel(previousStock, isHub);
  const nextLevel = stockAlertLevel(nextStock, isHub);

  if (nextLevel === "ok") return null;
  if (prevLevel === nextLevel) return null;

  return nextLevel === "out" ? "stock_out" : "stock_low";
}

export function stockInventoryKey(storeId: string, productId: string) {
  return `${storeId}-${productId}`;
}

export function stockNotificationId(
  storeId: string,
  productId: string,
  kind: StockAlertKind
) {
  return `${stockInventoryKey(storeId, productId)}-${kind}`;
}
