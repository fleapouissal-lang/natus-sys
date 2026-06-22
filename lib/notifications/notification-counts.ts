import type { CashierNotification } from "@/lib/notifications/types";

export function isStockAlertNotification(n: CashierNotification): boolean {
  return n.kind === "stock_low" || n.kind === "stock_out";
}

export function notificationNeedsAttention(n: CashierNotification): boolean {
  return isStockAlertNotification(n) || !n.read;
}

export function computeNotificationCounts(notifications: CashierNotification[]) {
  const stockAlertCount = notifications.filter(isStockAlertNotification).length;
  const otherUnreadCount = notifications.filter(
    (n) => !isStockAlertNotification(n) && !n.read
  ).length;

  return {
    stockAlertCount,
    otherUnreadCount,
    badgeCount: stockAlertCount + otherUnreadCount,
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
