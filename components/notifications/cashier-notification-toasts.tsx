"use client";

import { Bell, X } from "lucide-react";
import { useCashierNotifications } from "@/components/notifications/cashier-notifications-context";
import {
  formatNotificationMeta,
  notificationHeadline,
} from "@/lib/notifications/display";
import { formatTimeAgo } from "@/lib/notifications/format-time-ago";

export function CashierNotificationToasts() {
  const ctx = useCashierNotifications();
  if (!ctx || ctx.toasts.length === 0) return null;

  const { toasts, dismissToast, openNotification } = ctx;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((n) => {
        const meta = formatNotificationMeta(n);
        return (
          <div
            key={n.id}
            role="alert"
            className="pointer-events-auto animate-fade-in overflow-hidden rounded-lg border border-primary/20 bg-surface shadow-lg"
          >
            <button
              type="button"
              onClick={() => openNotification(n.id)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-primary-light/20 cursor-pointer"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {notificationHeadline(n, true)}
                </p>
                <p className="truncate text-sm text-muted">
                  {n.title}
                  {n.subtitle ? ` — ${n.subtitle}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {[meta, formatTimeAgo(n.receivedAt)].filter(Boolean).join(" · ")}
                </p>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(n.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    dismissToast(n.id);
                  }
                }}
                className="shrink-0 rounded-md p-1 text-muted hover:bg-primary-light/30 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
