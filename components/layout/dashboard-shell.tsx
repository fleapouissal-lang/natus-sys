"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionGuard } from "@/components/auth/session-guard";
import { CashierNotificationsProvider } from "@/components/notifications/cashier-notifications-context";
import { CashierNotificationBar } from "@/components/notifications/cashier-notification-bar";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export function DashboardShell({
  role,
  userName,
  cityLabel,
  storeId,
  children,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
  storeId?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPos = pathname.startsWith("/cashier/pos");
  const orderNotifications = Boolean(storeId);

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
        {orderNotifications && !isPos && <CashierNotificationBar />}
        <div className={cn("min-h-0 flex-1", isPos && "flex flex-col overflow-hidden")}>
          {children}
        </div>
      </main>
    </div>
    </>
  );

  if (!storeId) return shell;

  return (
    <CashierNotificationsProvider storeId={storeId}>
      {shell}
    </CashierNotificationsProvider>
  );
}
