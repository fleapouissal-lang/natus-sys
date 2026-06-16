"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import { formatCurrency } from "@/lib/utils";

export function CashierNotificationBar() {
  const ctx = useCashierNotifications();
  if (!ctx?.barVisible || !ctx.latestUnread) return null;

  const { latestUnread, dismissBar, markRead } = ctx;
  const label =
    latestUnread.kind === "transferred"
      ? "Commande transférée vers votre magasin"
      : "Nouvelle commande reçue";

  return (
    <div
      role="alert"
      className="natus-notification-bar flex shrink-0 items-center justify-between gap-4 border-b border-primary/30 bg-primary px-4 py-3 text-white shadow-sm animate-fade-in"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="truncate text-sm text-white/90">
            {latestUnread.orderNumber}
            {latestUnread.customerName ? ` — ${latestUnread.customerName}` : ""}
            {" · "}
            {formatCurrency(latestUnread.total)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/cashier/orders"
          onClick={() => {
            markRead(latestUnread.id);
            dismissBar();
          }}
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-white/90"
        >
          Voir
        </Link>
        <button
          type="button"
          onClick={() => {
            markRead(latestUnread.id);
            dismissBar();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/15 cursor-pointer"
          aria-label="Fermer la notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
