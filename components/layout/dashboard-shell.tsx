"use client";

import { usePathname } from "next/navigation";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionGuard } from "@/components/auth/session-guard";
import { CashierNotificationsProvider } from "@/components/notifications/cashier-notifications-context";
import { CashierNotificationBar } from "@/components/notifications/cashier-notification-bar";
import { CashierNotificationBell } from "@/components/notifications/cashier-notification-bell";
import type { NotificationScope } from "@/lib/notifications/notification-scope";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

function resolveNotificationScope(
  role: UserRole,
  storeId?: string | null,
  city?: string | null
): NotificationScope | null {
  if (storeId) return { mode: "store", storeId };
  if (role === "manager" && city) return { mode: "city", city };
  return null;
}

export function DashboardShell({
  role,
  userName,
  cityLabel,
  storeId,
  city,
  children,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
  storeId?: string | null;
  /** Ville du gérant — alertes stock multi-magasins */
  city?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPos = isCashierPosRoute(pathname);
  const scope = resolveNotificationScope(role, storeId, city ?? cityLabel);

  const shell = (
    <>
      <SessionGuard />
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar role={role} userName={userName} cityLabel={cityLabel} />
        <main
          className={cn(
            "natus-content flex min-h-0 min-w-0 flex-1 flex-col bg-page",
            isPos ? "overflow-hidden p-0" : "overflow-y-auto p-8"
          )}
        >
          {scope && !isPos && (
            <>
              <div className="mb-4 flex shrink-0 justify-end overflow-visible">
                <CashierNotificationBell />
              </div>
              <CashierNotificationBar />
            </>
          )}
          <div className={cn("min-h-0 flex-1", isPos && "flex flex-col overflow-hidden")}>
            {children}
          </div>
        </main>
      </div>
    </>
  );

  if (!scope) return shell;

  return (
    <CashierNotificationsProvider scope={scope}>{shell}</CashierNotificationsProvider>
  );
}
