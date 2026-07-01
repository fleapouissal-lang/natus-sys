import type {
  CashierNotification,
  CashierNotificationKind,
  NotificationAudience,
} from "@/lib/notifications/types";
import {
  appendNotificationContextParams,
  isManagementNotificationAudience,
  notificationLocationSummary,
} from "@/lib/notifications/notification-location";
import {
  HUB_LOW_STOCK_THRESHOLD,
  RETAIL_LOW_STOCK_THRESHOLD,
} from "@/lib/notifications/stock-alert";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import type { ShopifyWorkflowStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function notificationHeadline(
  notification: CashierNotification | CashierNotificationKind,
  short = false
): string {
  const kind =
    typeof notification === "string" ? notification : notification.kind;
  const workflowStatus =
    typeof notification === "string" ? undefined : notification.workflowStatus;
  const transferPhase =
    typeof notification === "string" ? undefined : notification.transferPhase;

  switch (kind) {
    case "order_new":
      return short ? "Nouvelle commande" : "Nouvelle commande reçue en magasin";
    case "order_transferred":
      return short ? "Commande transférée" : "Commande transférée vers votre magasin";
    case "order_status":
      if (workflowStatus) {
        return short
          ? workflowStatusLabel(workflowStatus)
          : `Commande — ${workflowStatusLabel(workflowStatus)}`;
      }
      return short ? "Mise à jour commande" : "Mise à jour du statut de commande";
    case "hub_transfer":
      return short
        ? transferPhase === "received"
          ? "Transfert à recevoir"
          : "Transfert dépôt"
        : "Transfert dépôt en attente de réception";
    case "hub_transfer_sent":
      return short ? "Transfert envoyé" : "Transfert dépôt envoyé";
    case "store_transfer":
      if (transferPhase === "received") {
        return short ? "Transfert à recevoir" : "Transfert magasin à recevoir";
      }
      return short ? "Transfert envoyé" : "Transfert magasin envoyé";
    case "stock_low":
      return short
        ? "Réappro. recommandé"
        : "Réapprovisionnement recommandé";
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
    case "hub_transfer_sent":
      if (audience === "director") return "/director/stock-transfers";
      if (audience === "hub") return "/hub/stock-transfers/received";
      if (audience === "livreur") return "/livreur/orders";
      if (audience === "city") return "/manager/stock-transfers";
      return "/cashier/transfers/received";
    case "store_transfer":
      if (audience === "director") return "/director/stock-transfers";
      if (audience === "city") return "/manager/stock-transfers";
      if (audience === "hub") return "/hub/stock-transfers";
      return "/cashier/transfers/received";
    case "stock_low":
    case "stock_out":
      if (audience === "director") return "/director/stock";
      if (audience === "livreur") return "/livreur/orders";
      if (audience === "hub") return "/hub/stock-transfers/received";
      if (audience === "city") return "/manager/stock";
      return "/cashier/pos";
    default:
      if (audience === "director") return "/director/orders";
      if (audience === "livreur") return "/livreur/orders";
      if (audience === "city") return "/manager/shopify-orders";
      if (audience === "hub") return "/hub/stock-transfers";
      return "/cashier/shopify-orders";
  }
}

export function notificationTargetHref(notification: CashierNotification): string {
  if (notification.href) {
    return appendNotificationContextParams(notification, notification.href);
  }

  const base = notificationHref(
    notification.kind,
    notification.audience ?? "store"
  );

  let href = base;

  if (
    notification.entityId &&
    (notification.kind === "order_new" ||
      notification.kind === "order_transferred" ||
      notification.kind === "order_status")
  ) {
    const separator = base.includes("?") ? "&" : "?";
    href = `${base}${separator}highlight=${encodeURIComponent(notification.entityId)}`;
  }

  return appendNotificationContextParams(notification, href);
}

export function notificationSoundKind(
  kind: CashierNotificationKind
): "new" | "transferred" | "stock_low" | "stock_out" {
  switch (kind) {
    case "order_new":
    case "order_status":
      return "new";
    case "stock_out":
      return "stock_out";
    case "stock_low":
      return "stock_low";
    default:
      return "transferred";
  }
}

export function orderStatusAccent(
  status: ShopifyWorkflowStatus | undefined
): "default" | "warning" | "success" | "danger" | "info" {
  switch (status) {
    case "pending":
      return "warning";
    case "preparing":
      return "info";
    case "ready":
      return "warning";
    case "shipping":
      return "info";
    case "delivered":
      return "success";
    case "cancelled":
    case "returned":
      return "danger";
    case "paid":
      return "success";
    default:
      return "default";
  }
}

export function notificationAccent(
  notification: CashierNotification
): "default" | "warning" | "success" | "danger" | "info" {
  switch (notification.kind) {
    case "stock_out":
      return "danger";
    case "stock_low":
      return "warning";
    case "order_status":
      return orderStatusAccent(notification.workflowStatus);
    case "hub_transfer":
    case "store_transfer":
      return notification.transferPhase === "received" ? "warning" : "info";
    case "hub_transfer_sent":
      return "info";
    case "order_new":
    case "order_transferred":
      return "warning";
    default:
      return "default";
  }
}

export function formatNotificationMeta(notification: CashierNotification): string | null {
  const location =
    isManagementNotificationAudience(notification.audience)
      ? notificationLocationSummary(notification)
      : null;

  switch (notification.kind) {
    case "hub_transfer":
    case "hub_transfer_sent":
    case "store_transfer":
      if (location) return location;
      if (notification.fromStoreName && notification.toStoreName) {
        return `${notification.fromStoreName} → ${notification.toStoreName}`;
      }
      if (notification.amount == null || notification.amount <= 0) return null;
      return `${notification.amount} unité${notification.amount > 1 ? "s" : ""}`;
    case "stock_low":
      if (notification.amount == null) return location;
      return [
        location,
        `${notification.amount} restante${notification.amount !== 1 ? "s" : ""} (< ${notification.isHubStore ? HUB_LOW_STOCK_THRESHOLD : RETAIL_LOW_STOCK_THRESHOLD})`,
      ]
        .filter(Boolean)
        .join(" · ");
    case "stock_out":
      return [location, "0 en stock — rupture"].filter(Boolean).join(" · ");
    case "order_status":
      if (notification.workflowStatus) {
        return [location, workflowStatusLabel(notification.workflowStatus)]
          .filter(Boolean)
          .join(" · ");
      }
      return location;
    default:
      if (notification.amount == null) return location;
      return [location, formatCurrency(notification.amount)].filter(Boolean).join(" · ");
  }
}

export function formatNotificationSummary(notification: CashierNotification): string {
  const parts = [notificationHeadline(notification, true), notification.title];
  if (notification.subtitle) parts.push(notification.subtitle);
  const meta = formatNotificationMeta(notification);
  if (meta) parts.push(meta);
  return parts.join(" · ");
}
