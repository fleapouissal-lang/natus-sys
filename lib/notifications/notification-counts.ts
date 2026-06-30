import type { CashierNotification } from "@/lib/notifications/types";

export function isStockAlertNotification(n: CashierNotification): boolean {
  return n.kind === "stock_low" || n.kind === "stock_out";
}

export function isPendingTransferNotification(n: CashierNotification): boolean {
  return (
    n.kind === "hub_transfer" ||
    (n.kind === "store_transfer" && n.transferPhase === "received")
  );
}

/** Reste affichée jusqu'à résolution (stock réapprovisionné ou transfert reçu). */
export function isPersistentNotification(n: CashierNotification): boolean {
  return isStockAlertNotification(n) || isPendingTransferNotification(n);
}

export function notificationNeedsAttention(n: CashierNotification): boolean {
  return isPersistentNotification(n) || !n.read;
}

export function computeNotificationCounts(notifications: CashierNotification[]) {
  const stockAlertCount = notifications.filter(isStockAlertNotification).length;
  const pendingTransferCount = notifications.filter(isPendingTransferNotification).length;
  const otherUnreadCount = notifications.filter(
    (n) => !isPersistentNotification(n) && !n.read
  ).length;

  return {
    stockAlertCount,
    pendingTransferCount,
    otherUnreadCount,
    badgeCount: stockAlertCount + pendingTransferCount + otherUnreadCount,
  };
}

export function latestAttentionNotification(
  notifications: CashierNotification[]
): CashierNotification | null {
  return notifications.find(notificationNeedsAttention) ?? null;
}

export function hasNotificationAttention(notifications: CashierNotification[]): boolean {
  return notifications.some(notificationNeedsAttention);
}
