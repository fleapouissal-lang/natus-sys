import type {
  CashierNotification,
  NotificationAudience,
} from "@/lib/notifications/types";

export function isManagementNotificationAudience(
  audience: NotificationAudience | undefined
): audience is "director" | "city" | "hub" {
  return audience === "director" || audience === "city" || audience === "hub";
}

export function siteTypeLabel(isHub?: boolean): "Dépôt" | "Magasin" {
  return isHub ? "Dépôt" : "Magasin";
}

export function formatSiteLabel(
  name: string | null | undefined,
  isHub?: boolean
): string | null {
  if (!name) return null;
  return `${siteTypeLabel(isHub)} ${name}`;
}

export function notificationLocationSummary(
  notification: CashierNotification
): string | null {
  if (!isManagementNotificationAudience(notification.audience)) return null;

  switch (notification.kind) {
    case "hub_transfer":
    case "hub_transfer_sent":
    case "store_transfer": {
      const from = formatSiteLabel(
        notification.fromStoreName,
        notification.fromIsHub
      );
      const to = formatSiteLabel(notification.toStoreName, notification.toIsHub);
      if (from && to) return `${from} → ${to}`;
      return from ?? to;
    }
    case "stock_low":
    case "stock_out":
      return formatSiteLabel(notification.storeName, notification.isHubStore);
    case "order_new":
    case "order_transferred":
    case "order_status":
      return formatSiteLabel(notification.storeName, false);
    default:
      return formatSiteLabel(notification.storeName, notification.isHubStore);
  }
}

function mergeSearchParams(base: string, extra: URLSearchParams): string {
  const [pathname, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  extra.forEach((value, key) => {
    params.set(key, value);
  });
  const next = params.toString();
  return next ? `${pathname}?${next}` : pathname;
}

function appendTransferQueryParams(
  params: URLSearchParams,
  notification: CashierNotification,
  audience: NotificationAudience
) {
  if (audience === "director") {
    if (notification.fromStoreId) {
      if (notification.fromIsHub) {
        params.set("src", "hub");
        params.set("fromHub", notification.fromStoreId);
      } else {
        params.set("src", "store");
        params.set("from", notification.fromStoreId);
      }
    }
    if (notification.toStoreId) {
      if (notification.toIsHub) {
        params.set("dest", "hub");
        params.set("toHub", notification.toStoreId);
      } else {
        params.set("dest", "store");
        params.set("to", notification.toStoreId);
      }
    }
    return;
  }

  if (audience === "city") {
    if (notification.fromStoreId) params.set("from", notification.fromStoreId);
    if (notification.toStoreId) {
      if (notification.toIsHub) {
        params.set("dest", "hub");
        params.set("hub", notification.toStoreId);
      } else {
        params.set("to", notification.toStoreId);
      }
    }
    return;
  }

  if (audience === "hub") {
    if (notification.kind === "store_transfer") {
      if (notification.toStoreId && !notification.toIsHub) {
        params.set("to", notification.toStoreId);
      }
      if (notification.toIsHub && notification.toStoreId) {
        params.set("dest", "hub");
        params.set("hub", notification.toStoreId);
      }
      return;
    }

    if (notification.toIsHub && notification.toStoreId) {
      params.set("store", notification.toStoreId);
      return;
    }

    if (notification.fromStoreId && !notification.fromIsHub) {
      params.set("store", notification.fromStoreId);
    }
  }
}

export function appendNotificationContextParams(
  notification: CashierNotification,
  baseHref: string
): string {
  const audience = notification.audience;
  if (!isManagementNotificationAudience(audience)) return baseHref;

  const params = new URLSearchParams();

  switch (notification.kind) {
    case "order_new":
    case "order_transferred":
    case "order_status":
      if (notification.storeId) params.set("store", notification.storeId);
      break;
    case "stock_low":
    case "stock_out":
      if (notification.storeId) params.set("store", notification.storeId);
      break;
    case "hub_transfer":
    case "hub_transfer_sent":
    case "store_transfer":
      appendTransferQueryParams(params, notification, audience);
      break;
  }

  if ([...params.keys()].length === 0) return baseHref;
  return mergeSearchParams(baseHref, params);
}
