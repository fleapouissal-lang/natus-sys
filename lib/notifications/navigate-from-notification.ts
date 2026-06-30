import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { notificationTargetHref } from "@/lib/notifications/display";
import { saveNotificationViewContext } from "@/lib/notifications/notification-view-context";
import type { CashierNotification } from "@/lib/notifications/types";

export function navigateFromNotification(
  notification: CashierNotification,
  router: AppRouterInstance,
  options: {
    openNotification: (id: string) => void;
    onSelect?: (notification: CashierNotification) => void;
  }
) {
  options.openNotification(notification.id);
  if (options.onSelect) {
    options.onSelect(notification);
    return;
  }

  const href = notificationTargetHref(notification);
  saveNotificationViewContext(notification, href);
  router.push(href);
}
