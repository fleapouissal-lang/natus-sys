"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { formatCurrency, cn } from "@/lib/utils";

export function CashierNotificationBell({
  onSelect,
}: {
  /** Sur la caisse : ouvrir le panneau commandes au lieu de naviguer */
  onSelect?: () => void;
}) {
  const ctx = useCashierNotifications();
  if (!ctx) return null;

  const { unreadCount, notifications, openPanel, setOpenPanel, markRead, markAllRead } =
    ctx;

  function handleSelect(notificationId: string) {
    markRead(notificationId);
    setOpenPanel(false);
    onSelect?.();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenPanel(!openPanel);
        }}
        className="relative inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-primary-light/40 cursor-pointer"
        aria-label="Notifications commandes"
        title="Notifications commandes"
      >
        <Bell className="h-4 w-4 text-primary" />
        {unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
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
              <p className="text-sm font-semibold text-foreground">Notifications</p>
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
                  Aucune notification
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
                        onClick={() => handleSelect(n.id)}
                        className="block w-full px-4 py-3 text-left hover:bg-primary-light/30 cursor-pointer"
                      >
                        <NotificationItemContent notification={n} />
                      </button>
                    ) : (
                      <Link
                        href="/cashier/orders"
                        onClick={() => handleSelect(n.id)}
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
  notification: {
    kind: "new" | "transferred";
    orderNumber: string;
    customerName: string | null;
    total: number;
  };
}) {
  return (
    <>
      <p className="text-sm font-medium text-foreground">
        {n.kind === "transferred" ? "Commande transférée" : "Nouvelle commande"}
      </p>
      <p className="text-sm text-muted">
        {n.orderNumber}
        {n.customerName ? ` — ${n.customerName}` : ""}
      </p>
      <p className="mt-0.5 text-xs text-muted">{formatCurrency(n.total)}</p>
    </>
  );
}
