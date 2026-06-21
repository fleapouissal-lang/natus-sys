"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import {
  formatNotificationMeta,
  notificationHeadline,
  notificationHref,
} from "@/lib/notifications/display";
import { formatTimeAgo } from "@/lib/notifications/format-time-ago";
import type { CashierNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/count-badge";

export function CashierNotificationBell({
  onSelect,
}: {
  /** Sur la caisse : action personnalisée (ex. panneau commandes) */
  onSelect?: (notification: CashierNotification) => void;
}) {
  const ctx = useCashierNotifications();
  if (!ctx) return null;

  const {
    unreadCount,
    notifications,
    openPanel,
    setOpenPanel,
    openNotification,
    markAllRead,
  } = ctx;

  function handleSelect(notification: CashierNotification) {
    openNotification(notification.id);
    onSelect?.(notification);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenPanel(!openPanel);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center overflow-visible rounded-md border-0 bg-champagne text-primary hover:brightness-95 cursor-pointer"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4 text-primary" />
        <CountBadge count={unreadCount} className="-right-1 -top-1" />
        {unreadCount > 0 && (
          <span className="sr-only">
            {unreadCount} notification{unreadCount > 1 ? "s" : ""} non lue
            {unreadCount > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {openPanel && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default"
            aria-label="Fermer les notifications"
            onClick={() => setOpenPanel(false)}
          />
          <div className="absolute right-0 top-full z-[70] mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <p className="text-xs text-muted">
                  {unreadCount > 0
                    ? `${unreadCount} info${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                    : "Aucune nouvelle info"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  Tout marquer lu
                </button>
              )}
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted">
                  Alertes commandes, réceptions hub et stock faible / rupture.
                </li>
              ) : (
                notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(!n.read && "bg-primary-light/40")}
                  >
                    {onSelect ? (
                      <button
                        type="button"
                        onClick={() => handleSelect(n)}
                        className="block w-full px-4 py-3 text-left hover:bg-primary-light/30 cursor-pointer"
                      >
                        <NotificationItemContent notification={n} />
                      </button>
                    ) : (
                      <Link
                        href={notificationHref(n.kind, n.audience ?? "store")}
                        onClick={() => handleSelect(n)}
                        className="block px-4 py-3 hover:bg-primary-light/30"
                      >
                        <NotificationItemContent notification={n} />
                      </Link>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationItemContent({
  notification: n,
}: {
  notification: CashierNotification;
}) {
  const meta = formatNotificationMeta(n);

  return (
    <div className="flex items-start gap-2">
      {!n.read && (
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
          aria-hidden
        />
      )}
      <div className={cn("min-w-0 flex-1", n.read && "pl-4")}>
        <p className="text-sm font-medium text-foreground">
          {notificationHeadline(n.kind, true)}
        </p>
        <p className="text-sm text-muted">
          {n.title}
          {n.subtitle ? ` — ${n.subtitle}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {[meta, formatTimeAgo(n.receivedAt)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </div>
  );
}
