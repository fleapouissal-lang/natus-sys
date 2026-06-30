"use client";

import { MapPin, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearNotificationViewContext,
  readNotificationViewContext,
  type NotificationViewContext,
} from "@/lib/notifications/notification-view-context";
import { cn } from "@/lib/utils";

export function NotificationViewBanner({ className }: { className?: string }) {
  const pathname = usePathname();
  const [context, setContext] = useState<NotificationViewContext | null>(null);

  useEffect(() => {
    setContext(readNotificationViewContext(pathname));
  }, [pathname]);

  if (!context) return null;

  function dismiss() {
    clearNotificationViewContext();
    setContext(null);
  }

  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-champagne/70 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(179,140,74,0.12)] animate-fade-in",
        className
      )}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-dark">
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {context.headline}
          {context.title ? (
            <span className="font-medium text-foreground/85"> — {context.title}</span>
          ) : null}
        </p>
        <p className="mt-0.5 text-sm text-primary-dark">{context.location}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-muted hover:bg-primary/10 hover:text-foreground cursor-pointer"
        aria-label="Masquer le contexte de notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
