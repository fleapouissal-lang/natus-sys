"use client";

import { Bell, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { CountBadge } from "@/components/ui/count-badge";
import { navigateFromNotification } from "@/lib/notifications/navigate-from-notification";
import {
  formatNotificationMeta,
  notificationHeadline,
} from "@/lib/notifications/display";
import { formatTimeAgo } from "@/lib/notifications/format-time-ago";
import { isPersistentNotification } from "@/lib/notifications/notification-counts";
import type { CashierNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export function CashierNotificationBar({
  onViewNotification,
}: {
  /** Caisse POS : action selon le type de notification */
  onViewNotification?: (notification: CashierNotification) => void;
}) {
  const router = useRouter();
  const ctx = useCashierNotifications();
  if (!ctx?.barVisible || !ctx.latestUnread) return null;

  const { latestUnread, openNotification, dismissBar, badgeCount } = ctx;
  const meta = formatNotificationMeta(latestUnread);
  const persistentAlertActive = isPersistentNotification(latestUnread);

  function handleView() {
    if (onViewNotification) {
      openNotification(latestUnread.id);
      onViewNotification(latestUnread);
      return;
    }
    navigateFromNotification(latestUnread, router, { openNotification });
  }

  return (
    <div
      role="alert"
      className="natus-notification-bar flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 animate-fade-in"
    >
      <button
        type="button"
        onClick={handleView}
        className="natus-notification-bar__main flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-full bg-champagne shadow-[inset_0_0_0_1px_rgba(179,140,74,0.22)]">
          <Bell className="h-4 w-4 text-primary-dark" strokeWidth={2.25} />
          <CountBadge count={badgeCount} className="-right-1 -top-1" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="natus-notification-bar__title text-sm font-semibold leading-tight text-primary-dark">
              {notificationHeadline(latestUnread)}
            </p>
            {badgeCount > 1 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/12 px-1.5 text-[10px] font-bold text-primary-dark">
                {badgeCount}
              </span>
            )}
          </div>
          <p className="truncate text-sm text-foreground/85">
            <span className="font-medium text-foreground">{latestUnread.title}</span>
            {latestUnread.subtitle ? (
              <span className="text-muted"> — {latestUnread.subtitle}</span>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted">
            {[meta, formatTimeAgo(latestUnread.receivedAt)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {badgeCount > 1 && (
          <span className="hidden text-xs font-medium text-primary-dark/80 sm:inline">
            {badgeCount} alertes actives
          </span>
        )}
        <button
          type="button"
          onClick={handleView}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-champagne px-3 py-1.5",
            "text-sm font-medium text-foreground shadow-[0_1px_0_rgba(179,140,74,0.12)]",
            "hover:brightness-95 cursor-pointer"
          )}
        >
          Voir
          <ChevronRight className="h-3.5 w-3.5 text-primary-dark" aria-hidden />
        </button>
        {!persistentAlertActive ? (
          <button
            type="button"
            onClick={dismissBar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark cursor-pointer"
            aria-label="Masquer la barre"
            title="Masquer"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
