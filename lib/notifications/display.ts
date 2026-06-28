import type {
  CashierNotification,
  CashierNotificationKind,
  NotificationAudience,
} from "@/lib/notifications/types";
import {
  HUB_LOW_STOCK_THRESHOLD,
  RETAIL_LOW_STOCK_THRESHOLD,
} from "@/lib/notifications/stock-alert";
import { formatCurrency } from "@/lib/utils";

export function notificationHeadline(
  kind: CashierNotificationKind,
  short = false
): string {
  switch (kind) {
    case "order_new":
      return short ? "Nouvelle commande reçue" : "Nouvelle commande reçue en magasin";
    case "order_transferred":
      return short ? "Commande transférée" : "Commande transférée vers votre magasin";
    case "hub_transfer":
      return short ? "Commande dépôt" : "Commande ou livraison dépôt";
    case "stock_low":
      return short ? "Stock faible" : "Produit sous le seuil de stock";
    case "stock_out":
      return short ? "Rupture de stock" : "Produit en rupture de stock";
  }
}

export function notificationHref(
  kind: CashierNotificationKind,
  audience: NotificationAudience = "store"
): string {
  switch (kind) {
    case "hub_transfer":
      if (audience === "hub") return "/hub/stock-transfers/received";
      if (audience === "livreur") return "/livreur/transfers";
      return "/cashier/transfers/received";
    case "stock_low":
    case "stock_out":
      if (audience === "director") return "/director/stock";
      if (audience === "livreur") return "/livreur/transfers";
      if (audience === "hub") return "/hub/stock-transfers/received";
      if (audience === "city") return "/manager/stock";
      return "/cashier/pos";
    default:
      if (audience === "director") return "/director/orders";
      if (audience === "livreur") return "/livreur/orders";
      if (audience === "city") return "/manager/orders";
      return "/cashier/orders";
  }
}

export function notificationSoundKind(
  kind: CashierNotificationKind
): "new" | "transferred" | "stock_low" | "stock_out" {
  switch (kind) {
    case "order_new":
      return "new";
    case "stock_out":
      return "stock_out";
    case "stock_low":
      return "stock_low";
    default:
      return "transferred";
  }
}

export function formatNotificationMeta(notification: CashierNotification): string | null {
  switch (notification.kind) {
    case "hub_transfer":
      if (notification.amount == null || notification.amount <= 0) return null;
      return `${notification.amount} unité${notification.amount > 1 ? "s" : ""}`;
    case "stock_low":
      if (notification.amount == null) return null;
      return `${notification.amount} restante${notification.amount !== 1 ? "s" : ""} (< ${notification.isHubStore ? HUB_LOW_STOCK_THRESHOLD : RETAIL_LOW_STOCK_THRESHOLD})`;
    case "stock_out":
      return "0 en stock — rupture";
    default:
      if (notification.amount == null) return null;
      return formatCurrency(notification.amount);
  }
}

export function formatNotificationSummary(notification: CashierNotification): string {
  const parts = [notification.title];
  if (notification.subtitle) parts.push(notification.subtitle);
  const meta = formatNotificationMeta(notification);
  if (meta) parts.push(meta);
  return parts.join(" · ");
}
