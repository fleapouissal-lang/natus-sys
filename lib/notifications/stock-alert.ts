/** Seuil stock faible — aligné sur le reste de l'app (stock-manager, dashboard). */
export const LOW_STOCK_THRESHOLD = 10;

export type StockAlertLevel = "ok" | "low" | "out";

export type StockAlertKind = "stock_low" | "stock_out";

export function stockAlertLevel(stock: number): StockAlertLevel {
  if (!Number.isFinite(stock) || stock <= 0) return "out";
  if (stock < LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

/** Alerte uniquement lors d'un changement de palier (évite le spam à chaque vente). */
export function detectStockAlertTransition(
  previousStock: number | null | undefined,
  nextStock: number
): StockAlertKind | null {
  const prevLevel =
    previousStock == null ? null : stockAlertLevel(previousStock);
  const nextLevel = stockAlertLevel(nextStock);

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
