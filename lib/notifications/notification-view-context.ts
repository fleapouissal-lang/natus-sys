import { notificationHeadline } from "@/lib/notifications/display";
import {
  isManagementNotificationAudience,
  notificationLocationSummary,
} from "@/lib/notifications/notification-location";
import type { CashierNotification } from "@/lib/notifications/types";

const STORAGE_KEY = "natus-notification-view-context";

export type NotificationViewContext = {
  headline: string;
  title: string;
  location: string;
  href: string;
  ts: number;
};

export function saveNotificationViewContext(
  notification: CashierNotification,
  href: string
) {
  if (typeof window === "undefined") return;
  if (!isManagementNotificationAudience(notification.audience)) return;

  const location = notificationLocationSummary(notification);
  if (!location) return;

  const payload: NotificationViewContext = {
    headline: notificationHeadline(notification, true),
    title: notification.title,
    location,
    href,
    ts: Date.now(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readNotificationViewContext(
  pathname: string
): NotificationViewContext | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NotificationViewContext;
    const targetPath = parsed.href.split("?")[0];
    const age = Date.now() - parsed.ts;
    if (age > 120_000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (pathname !== targetPath && !pathname.startsWith(`${targetPath}/`)) {
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearNotificationViewContext() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
