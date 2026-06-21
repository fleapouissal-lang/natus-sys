import type { CashierNotification, NotificationAudience } from "@/lib/notifications/types";
import type { StockAlertKind } from "@/lib/notifications/stock-alert";
import { stockNotificationId } from "@/lib/notifications/stock-alert";

export function buildStockNotification(params: {
  storeId: string;
  productId: string;
  productName: string;
  storeName: string | null;
  stock: number;
  kind: StockAlertKind;
  audience: NotificationAudience;
}): CashierNotification {
  const entityId = `${params.storeId}-${params.productId}`;

  return {
    id: stockNotificationId(params.storeId, params.productId, params.kind),
    kind: params.kind,
    entityId,
    title: params.productName,
    subtitle:
      params.audience === "city"
        ? params.storeName
        : params.kind === "stock_out"
          ? "Rupture en magasin"
          : `Seuil : moins de 10 unités`,
    amount: params.stock,
    receivedAt: new Date().toISOString(),
    read: false,
    audience: params.audience,
    storeId: params.storeId,
    storeName: params.storeName,
    productId: params.productId,
  };
}
