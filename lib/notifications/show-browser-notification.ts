import type { CashierNotification } from "@/lib/notifications/types";
import {
  formatNotificationSummary,
  notificationHeadline,
} from "@/lib/notifications/display";

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserOrderNotification(notification: CashierNotification) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    const n = new Notification(`${notificationHeadline(notification, true)} — Natus`, {
      body: formatNotificationSummary(notification),
      tag: notification.id,
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // ignore
  }
}
