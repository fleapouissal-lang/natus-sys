import type {
  CashierNotification,
  CashierNotificationKind,
  NotificationCategory,
  NotificationPriority,
} from "@/lib/notifications/types";

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  stock: "Stock & réapprovisionnement",
  order: "Commandes en ligne",
  transfer: "Mouvements de stock",
};

const CATEGORY_ORDER: NotificationCategory[] = ["stock", "order", "transfer"];

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function notificationCategory(
  kind: CashierNotificationKind
): NotificationCategory {
  switch (kind) {
    case "stock_low":
    case "stock_out":
      return "stock";
    case "hub_transfer":
    case "hub_transfer_sent":
    case "store_transfer":
      return "transfer";
    default:
      return "order";
  }
}

export function categoryLabel(category: NotificationCategory): string {
  return CATEGORY_LABELS[category];
}

export function notificationPriority(
  notification: CashierNotification
): NotificationPriority {
  if (notification.priority) return notification.priority;

  switch (notification.kind) {
    case "stock_out":
      return "urgent";
    case "stock_low":
      return "high";
    case "hub_transfer":
    case "store_transfer":
      return notification.transferPhase === "received" ? "high" : "normal";
    case "order_new":
      return "high";
    case "order_status":
      if (
        notification.workflowStatus === "pending" ||
        notification.workflowStatus === "ready"
      ) {
        return "high";
      }
      if (notification.workflowStatus === "preparing") return "normal";
      return "normal";
    case "order_transferred":
      return "high";
    case "hub_transfer_sent":
      return "normal";
    default:
      return "normal";
  }
}

export function compareNotifications(
  a: CashierNotification,
  b: CashierNotification
): number {
  const priorityDiff =
    PRIORITY_RANK[notificationPriority(a)] -
    PRIORITY_RANK[notificationPriority(b)];
  if (priorityDiff !== 0) return priorityDiff;

  const categoryDiff =
    CATEGORY_ORDER.indexOf(notificationCategory(a.kind)) -
    CATEGORY_ORDER.indexOf(notificationCategory(b.kind));
  if (categoryDiff !== 0) return categoryDiff;

  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

export function sortNotifications(
  notifications: CashierNotification[]
): CashierNotification[] {
  return [...notifications].sort(compareNotifications);
}

export function groupNotificationsByCategory(
  notifications: CashierNotification[]
): { category: NotificationCategory; label: string; items: CashierNotification[] }[] {
  const sorted = sortNotifications(notifications);
  const buckets = new Map<NotificationCategory, CashierNotification[]>();

  for (const category of CATEGORY_ORDER) {
    buckets.set(category, []);
  }

  for (const notification of sorted) {
    const category = notificationCategory(notification.kind);
    buckets.get(category)?.push(notification);
  }

  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: buckets.get(category) ?? [],
  })).filter((group) => group.items.length > 0);
}
