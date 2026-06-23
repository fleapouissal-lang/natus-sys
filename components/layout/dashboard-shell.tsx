"use client";

import { usePathname } from "next/navigation";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import {
  isMobilePlanningOnlyMode,
  isMobileStorePosGateMode,
  isMobileBottomNavVisible,
} from "@/lib/layout/mobile-planning";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav, MobileTopBar } from "@/components/layout/mobile-nav";
import {
  MobilePlanningRedirect,
  MobileStorePosGateRedirect,
} from "@/components/layout/mobile-planning-redirect";
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
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
  posOperatorName,
  children,
}: {
  role: UserRole;
  userName: string;
  cityLabel?: string;
  storeId?: string | null;
  city?: string | null;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  posOperatorName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPos = isCashierPosRoute(pathname);

  const mobilePlanningOnly = isMobilePlanningOnlyMode({
    isPersonalCashier,
    isStorePos,
    hasPosOperator,
  });

  const mobileStorePosGate = isMobileStorePosGateMode({
    isStorePos,
    hasPosOperator,
  });

  const scope =
    isPersonalCashier || (isStorePos && hasPosOperator)
      ? null
      : resolveNotificationScope(role, storeId, city ?? cityLabel);

  const topBarName =
    isStorePos && hasPosOperator && posOperatorName ? posOperatorName : userName;

  const mobileSubtitle = mobilePlanningOnly
    ? "Planning · lecture seule"
    : hasPosOperator && posOperatorName
      ? `Caissier : ${posOperatorName}`
      : cityLabel || null;

  const showMobileTopBar =
    (isPersonalCashier || !mobileStorePosGate) && !isPos;

  const showMobileBottomNav =
    isMobileBottomNavVisible({
      isStorePos,
      isPersonalCashier,
      hasPosOperator,
    }) && !isPos;

  const shell = (
    <>
      <SessionGuard disableIdleLogout={isPos && isStorePos} isStorePos={isStorePos} />
      <MobileStorePosGateRedirect enabled={mobileStorePosGate} />
      <MobilePlanningRedirect enabled={mobilePlanningOnly} />

      <div className="flex h-[100dvh] overflow-hidden bg-page">
        {!isPersonalCashier && (
          <div className="hidden h-full shrink-0 md:flex">
            <Sidebar
              role={role}
              userName={userName}
              cityLabel={cityLabel}
              isStorePos={isStorePos}
              isPersonalCashier={isPersonalCashier}
              hasPosOperator={hasPosOperator}
              posOperatorName={posOperatorName}
            />
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showMobileTopBar && (
            <MobileTopBar
              userName={topBarName}
              subtitle={mobileSubtitle}
              isStorePos={isStorePos}
              alwaysVisible={isPersonalCashier}
            />
          )}

          <main
            className={cn(
              "natus-content min-h-0 flex-1 bg-page",
              isPos && !mobilePlanningOnly
                ? "flex min-h-0 flex-col overflow-hidden p-0 md:p-0"
                : "overflow-y-auto p-4 md:p-8",
              showMobileBottomNav && "natus-main-mobile-nav",
              mobileStorePosGate && "max-md:p-0 max-md:!pb-0"
            )}
          >
            {scope && !isPos && (
              <>
                <div className="mb-4 hidden shrink-0 justify-end overflow-visible md:flex">
                  <CashierNotificationBell />
                </div>
                <div className="hidden md:block">
                  <CashierNotificationBar />
                </div>
              </>
            )}
            {isPos && !mobilePlanningOnly ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
            ) : (
              <>
                {children}
                {showMobileBottomNav && (
                  <div className="natus-mobile-nav-spacer" aria-hidden />
                )}
              </>
            )}
          </main>
        </div>

        <MobileBottomNav
          role={role}
          isStorePos={isStorePos}
          isPersonalCashier={isPersonalCashier}
          hasPosOperator={hasPosOperator}
          hidden={isPos}
        />
      </div>
    </>
  );

  if (!scope) return shell;

  return (
    <CashierNotificationsProvider scope={scope}>{shell}</CashierNotificationsProvider>
  );
}
