"use client";

import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import {
  formatNotificationMeta,
  notificationHeadline,
  notificationHref,
} from "@/lib/notifications/display";
import { formatTimeAgo } from "@/lib/notifications/format-time-ago";
import type { CashierNotification } from "@/lib/notifications/types";

export function CashierNotificationBar({
  onViewNotification,
}: {
  /** Caisse POS : action selon le type de notification */
  onViewNotification?: (notification: CashierNotification) => void;
}) {
  const router = useRouter();
  const ctx = useCashierNotifications();
  if (!ctx?.barVisible || !ctx.latestUnread) return null;

  const { latestUnread, openNotification, dismissBar } = ctx;
  const meta = formatNotificationMeta(latestUnread);

  function handleView() {
    openNotification(latestUnread.id);
    if (onViewNotification) {
      onViewNotification(latestUnread);
    } else {
      router.push(
        notificationHref(latestUnread.kind, latestUnread.audience ?? "store")
      );
    }
  }

  return (
    <div
      role="alert"
      className="natus-notification-bar flex shrink-0 items-center justify-between gap-4 border-b border-primary/30 bg-primary px-4 py-3 text-white shadow-sm animate-fade-in"
    >
      <button
        type="button"
        onClick={handleView}
        className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-95 cursor-pointer"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-champagne ring-2 ring-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {notificationHeadline(latestUnread.kind)}
          </p>
          <p className="truncate text-sm text-white/90">
            {latestUnread.title}
            {latestUnread.subtitle ? ` — ${latestUnread.subtitle}` : ""}
            {meta ? ` · ${meta}` : ""}
            {" · "}
            {formatTimeAgo(latestUnread.receivedAt)}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleView}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-white/90 cursor-pointer"
        >
          Voir
        </button>
        <button
          type="button"
          onClick={dismissBar}
          className="flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15 cursor-pointer"
          aria-label="Masquer la barre"
          title="Masquer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
