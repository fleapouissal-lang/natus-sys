import { buildStockNotification } from "@/lib/notifications/stock-notification";
import {
  stockAlertLevel,
  stockNotificationId,
  type StockAlertKind,
} from "@/lib/notifications/stock-alert";
import type { CashierNotification, NotificationAudience } from "@/lib/notifications/types";

function alertKindForStock(stock: number): StockAlertKind | null {
  const level = stockAlertLevel(stock);
  if (level === "out") return "stock_out";
  if (level === "low") return "stock_low";
  return null;
}

export type InventoryAlertRow = {
  storeId: string;
  productId: string;
  stock: number;
  productName: string;
  storeName?: string | null;
};

/** Aligne les notifications stock avec l'inventaire actuel (ruptures / stock faible déjà en place). */
export function mergeActiveStockAlerts(input: {
  notifications: CashierNotification[];
  inventory: InventoryAlertRow[];
  audience: NotificationAudience;
}): CashierNotification[] {
  const nonStock = input.notifications.filter(
    (n) => n.kind !== "stock_low" && n.kind !== "stock_out"
  );

  const existingStockById = new Map(
    input.notifications
      .filter((n) => n.kind === "stock_low" || n.kind === "stock_out")
      .map((n) => [n.id, n] as const)
  );

  const activeStock: CashierNotification[] = [];

  for (const row of input.inventory) {
    const kind = alertKindForStock(row.stock);
    if (!kind) continue;

    const id = stockNotificationId(row.storeId, row.productId, kind);
    const prev = existingStockById.get(id);

    activeStock.push(
      prev
        ? { ...prev, amount: row.stock, title: row.productName, read: false }
        : buildStockNotification({
            storeId: row.storeId,
            productId: row.productId,
            productName: row.productName,
            storeName: row.storeName ?? null,
            stock: row.stock,
            kind,
            audience: input.audience,
          })
    );
  }

  const merged = [...nonStock, ...activeStock];
  merged.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
  return merged.slice(0, 50);
}

export function stockAlertsChanged(
  before: CashierNotification[],
  after: CashierNotification[]
): boolean {
  if (before.length !== after.length) return true;

  const stockSignature = (list: CashierNotification[]) =>
    list
      .filter((n) => n.kind === "stock_low" || n.kind === "stock_out")
      .map((n) => `${n.id}:${n.read ? 1 : 0}:${n.amount ?? ""}`)
      .sort()
      .join("|");

  if (stockSignature(before) !== stockSignature(after)) return true;

  const beforeIds = before.map((n) => n.id).join("|");
  const afterIds = after.map((n) => n.id).join("|");
  return beforeIds !== afterIds;
}
