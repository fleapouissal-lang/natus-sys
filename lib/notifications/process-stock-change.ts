import type { NotificationAudience } from "@/lib/notifications/types";
import {
  detectStockAlertTransition,
  stockAlertLevel,
  stockInventoryKey,
} from "@/lib/notifications/stock-alert";
import { buildStockNotification } from "@/lib/notifications/stock-notification";
import type { CashierNotification } from "@/lib/notifications/types";

export type StockChangeInput = {
  storeId: string;
  productId: string;
  productName: string;
  previousStock: number;
  nextStock: number;
  storeName?: string | null;
  audience?: NotificationAudience;
};

export function evaluateStockChange(input: {
  storeId: string;
  productId: string;
  productName: string;
  storeName?: string | null;
  audience?: NotificationAudience;
  previousStock: number | null | undefined;
  nextStock: number;
}): {
  inventoryKey: string;
  notification: CashierNotification | null;
  shouldResolve: boolean;
} {
  const inventoryKey = stockInventoryKey(input.storeId, input.productId);
  const alertKind = detectStockAlertTransition(input.previousStock, input.nextStock);

  if (!alertKind) {
    return {
      inventoryKey,
      notification: null,
      shouldResolve: stockAlertLevel(input.nextStock) === "ok",
    };
  }

  return {
    inventoryKey,
    shouldResolve: false,
    notification: buildStockNotification({
      storeId: input.storeId,
      productId: input.productId,
      productName: input.productName,
      storeName: input.storeName ?? null,
      stock: input.nextStock,
      kind: alertKind,
      audience: input.audience ?? "store",
    }),
  };
}
