"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { navigateFromNotification } from "@/lib/notifications/navigate-from-notification";
import {
  formatNotificationMeta,
  notificationAccent,
  notificationHeadline,
} from "@/lib/notifications/display";
import { formatTimeAgo } from "@/lib/notifications/format-time-ago";
import {
  groupNotificationsByCategory,
  notificationCategory,
  notificationPriority,
} from "@/lib/notifications/notification-priority";
import {
  isPersistentNotification,
  notificationNeedsAttention,
} from "@/lib/notifications/notification-counts";
import type { CashierNotification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { CountBadge } from "@/components/ui/count-badge";

const CATEGORY_ICONS = {
  stock: AlertTriangle,
  order: ShoppingBag,
  transfer: Truck,
} as const;

export function CashierNotificationBell({
  onSelect,
}: {
  /** Sur la caisse : action personnalisée (ex. panneau commandes) */
  onSelect?: (notification: CashierNotification) => void;
}) {
  const router = useRouter();
  const ctx = useCashierNotifications();
  if (!ctx) return null;

  const {
    badgeCount,
    unreadCount,
    stockAlertCount,
    notifications,
    openPanel,
    setOpenPanel,
    openNotification,
    markRead,
    markAllRead,
  } = ctx;

  const totalCount = notifications.length;
  const groups = groupNotificationsByCategory(notifications);

  function panelSubtitle() {
    if (badgeCount === 0) {
      return totalCount > 0
        ? `${totalCount} notification${totalCount > 1 ? "s" : ""} lue${totalCount > 1 ? "s" : ""}`
        : "Aucune notification";
    }

    const parts: string[] = [];
    if (stockAlertCount > 0) {
      parts.push(
        `${stockAlertCount} alerte${stockAlertCount > 1 ? "s" : ""} stock`
      );
    }
    if (unreadCount > 0) {
      parts.push(`${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`);
    }
    if (totalCount > badgeCount) {
      parts.push(`${totalCount} au total`);
    }
    return parts.join(" · ");
  }

  function navigateTo(notification: CashierNotification) {
    navigateFromNotification(notification, router, {
      openNotification,
      onSelect,
    });
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
        aria-label={
          badgeCount > 0
            ? `Notifications, ${badgeCount} alerte${badgeCount > 1 ? "s" : ""} active${badgeCount > 1 ? "s" : ""}`
            : "Notifications"
        }
        title={
          badgeCount > 0
            ? `${badgeCount} alerte${badgeCount > 1 ? "s" : ""} active${badgeCount > 1 ? "s" : ""}`
            : "Notifications"
        }
      >
        <Bell className="h-4 w-4 text-primary" />
        <CountBadge count={badgeCount} className="-right-1 -top-1" />
      </button>

      {openPanel && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default"
            aria-label="Fermer les notifications"
            onClick={() => setOpenPanel(false)}
          />
          <div className="natus-notification-panel absolute right-0 top-full z-[70] mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-primary/15 bg-surface shadow-[0_18px_50px_rgba(36,24,8,0.14)]">
            <div className="natus-notification-panel__header flex items-start justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-sm font-semibold tracking-[0.01em] text-foreground">
                    Notifications
                  </p>
                  {badgeCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">{panelSubtitle()}</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="shrink-0 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-primary/35" />
                  <p className="text-sm text-muted">
                    Commandes, transferts de stock et alertes en temps réel.
                  </p>
                </div>
              ) : (
                groups.map((group) => {
                  const Icon = CATEGORY_ICONS[group.category];
                  return (
                    <section key={group.category} className="border-t border-primary/10">
                      <div className="flex items-center gap-2 bg-primary-light/20 px-4 py-2">
                        <Icon className="h-3.5 w-3.5 text-primary-dark/80" />
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-dark/80">
                          {group.label}
                        </p>
                        <span className="ml-auto text-[11px] text-muted">
                          {group.items.length}
                        </span>
                      </div>
                      <ul>
                        {group.items.map((notification) => (
                          <NotificationListItem
                            key={notification.id}
                            notification={notification}
                            onNavigate={() => navigateTo(notification)}
                            onMarkRead={() => markRead(notification.id)}
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationListItem({
  notification,
  onNavigate,
  onMarkRead,
}: {
  notification: CashierNotification;
  onNavigate: () => void;
  onMarkRead: () => void;
}) {
  const active = notificationNeedsAttention(notification);
  const persistent = isPersistentNotification(notification);
  const accent = notificationAccent(notification);
  const priority = notificationPriority(notification);
  const meta = formatNotificationMeta(notification);
  const category = notificationCategory(notification.kind);

  return (
    <li
      className={cn(
        "group border-b border-primary/6 last:border-b-0",
        active && "bg-primary-light/25"
      )}
    >
      <div className="flex items-start gap-2 px-4 py-3">
        <span
          className={cn(
            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            accent === "danger" && "bg-red-50 text-red-700",
            accent === "warning" && "bg-amber-50 text-amber-800",
            accent === "success" && "bg-emerald-50 text-emerald-700",
            accent === "info" && "bg-sky-50 text-sky-800",
            accent === "default" && "bg-champagne text-primary-dark"
          )}
        >
          {category === "stock" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : category === "transfer" ? (
            <Truck className="h-4 w-4" />
          ) : (
            <ShoppingBag className="h-4 w-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-foreground">
                {notificationHeadline(notification, true)}
              </p>
              <p className="mt-0.5 truncate text-sm text-foreground/85">
                {notification.title}
              </p>
              {notification.subtitle ? (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                  {notification.subtitle}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-muted">
                {[meta, formatTimeAgo(notification.receivedAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {priority === "urgent" && (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                Urgent
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigate}
              className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-champagne px-2.5 py-1 text-xs font-medium text-foreground hover:brightness-95 cursor-pointer"
            >
              Voir
              <ArrowRight className="h-3 w-3" />
            </button>
            {!persistent && !notification.read && (
              <button
                type="button"
                onClick={onMarkRead}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-primary-light/40 hover:text-foreground cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Marquer lu
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
