import type { CashierNotification, NotificationAudience } from "@/lib/notifications/types";
import {
  lowStockThreshold,
  stockNotificationId,
  type StockAlertKind,
} from "@/lib/notifications/stock-alert";

export function buildStockNotification(params: {
  storeId: string;
  productId: string;
  productName: string;
  storeName: string | null;
  stock: number;
  kind: StockAlertKind;
  audience: NotificationAudience;
  isHub?: boolean;
}): CashierNotification {
  const isHub = params.isHub ?? false;
  const threshold = lowStockThreshold(isHub);
  const entityId = `${params.storeId}-${params.productId}`;
  const locationLabel = isHub ? "Entrepôt" : "Magasin";

  return {
    id: stockNotificationId(params.storeId, params.productId, params.kind),
    kind: params.kind,
    entityId,
    title: params.productName,
    subtitle:
      params.audience === "city" || params.audience === "director"
        ? [params.storeName, locationLabel].filter(Boolean).join(" · ")
        : params.kind === "stock_out"
          ? `Rupture — ${locationLabel.toLowerCase()}`
          : `Seuil : moins de ${threshold} unités`,
    amount: params.stock,
    receivedAt: new Date().toISOString(),
    read: false,
    audience: params.audience,
    storeId: params.storeId,
    storeName: params.storeName,
    productId: params.productId,
    isHubStore: isHub,
  };
}
