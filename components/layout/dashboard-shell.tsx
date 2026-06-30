"use client";

import { usePathname } from "next/navigation";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import {
  isMobilePlanningOnlyMode,
  isMobileStorePosGateMode,
  isMobileBottomNavVisible,
  isMobilePosDesktopOnlyRole,
} from "@/lib/layout/mobile-planning";
import { useIsMobileViewport } from "@/lib/hooks/use-mobile-viewport";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileBottomNav, MobileTopBar } from "@/components/layout/mobile-nav";
import {
  MobilePlanningRedirect,
  MobileStorePosGateRedirect,
  MobileManagementPosRedirect,
} from "@/components/layout/mobile-planning-redirect";
import { SessionGuard } from "@/components/auth/session-guard";
import { RealtimeRefresh } from "@/components/realtime/realtime-refresh";
import { CashierNotificationsProvider } from "@/components/notifications/cashier-notifications-context";
import { CashierNotificationBar } from "@/components/notifications/cashier-notification-bar";
import { CashierNotificationBell } from "@/components/notifications/cashier-notification-bell";
import { NotificationViewBanner } from "@/components/notifications/notification-view-banner";
import type { NotificationScope } from "@/lib/notifications/notification-scope";
import { resolveNotificationScope } from "@/lib/notifications/notification-scope";
import { getSettingsPath } from "@/lib/layout/settings-path";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

export function DashboardShell({
  role,
  userName,
  avatarUrl,
  cityLabel,
  storeName,
  storeId,
  city,
  hubStoreId,
  livreurId,
  isStorePos = false,
  isPersonalCashier = false,
  hasPosOperator = false,
  posOperatorName,
  posOperatorAvatarUrl,
  accessPreset,
  allowedPages,
  requireManagerCode = true,
  children,
}: {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  cityLabel?: string;
  storeName?: string;
  storeId?: string | null;
  city?: string | null;
  hubStoreId?: string | null;
  livreurId?: string | null;
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
  posOperatorName?: string | null;
  posOperatorAvatarUrl?: string | null;
  accessPreset?: string | null;
  allowedPages?: string[] | null;
  requireManagerCode?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobileViewport();
  const isPos = isCashierPosRoute(pathname);

  const mobilePlanningOnly = isMobilePlanningOnlyMode({
    isPersonalCashier,
    isStorePos,
  });

  const planningOnlyActive = isMobile && mobilePlanningOnly;

  const mobileStorePosGate = isMobileStorePosGateMode({
    isStorePos,
    hasPosOperator,
    isMobile,
  });

  const scope = planningOnlyActive
    ? null
    : resolveNotificationScope({
        role,
        storeId,
        city: city ?? cityLabel,
        hubStoreId,
        livreurId,
      });

  const profileSubtitle = storeName || cityLabel || null;
  const operatorActive = isStorePos && hasPosOperator && Boolean(posOperatorName);
  const displayUserName = operatorActive ? posOperatorName! : userName;
  const displayAvatarUrl = operatorActive ? posOperatorAvatarUrl : avatarUrl;

  const mobileSubtitle = planningOnlyActive
    ? "Horaires · lecture seule"
    : profileSubtitle;

  const showMobileTopBar =
    (planningOnlyActive || !mobileStorePosGate) && !isPos;

  const showMobileBottomNav =
    isMobileBottomNavVisible({
      isStorePos,
      isPersonalCashier,
      hasPosOperator,
    }) && !isPos;

  const managementPosDesktopOnly = isMobile && isMobilePosDesktopOnlyRole(role);

  const shell = (
    <>
      <SessionGuard disableIdleLogout={isPos && isStorePos} isStorePos={isStorePos} />
      <RealtimeRefresh />
      <MobileStorePosGateRedirect enabled={mobileStorePosGate} />
      <MobilePlanningRedirect enabled={planningOnlyActive} isStorePos={isStorePos} />
      <MobileManagementPosRedirect enabled={managementPosDesktopOnly} role={role} />

      <div className="flex h-[100dvh] overflow-hidden bg-page">
        <div className="hidden h-full shrink-0 md:flex">
          <Sidebar
            role={role}
            userName={userName}
            avatarUrl={avatarUrl}
            cityLabel={cityLabel}
            storeName={storeName}
            storeId={storeId}
            isStorePos={isStorePos}
            isPersonalCashier={isPersonalCashier}
            hasPosOperator={hasPosOperator}
            posOperatorName={posOperatorName}
            posOperatorAvatarUrl={posOperatorAvatarUrl}
            accessPreset={accessPreset}
            allowedPages={allowedPages}
            requireManagerCode={requireManagerCode}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showMobileTopBar && (
            <MobileTopBar
              userName={displayUserName}
              avatarUrl={displayAvatarUrl}
              settingsHref={getSettingsPath(role)}
              subtitle={mobileSubtitle}
              isStorePos={isStorePos}
              alwaysVisible={planningOnlyActive}
            />
          )}

          <main
            className={cn(
              "natus-content min-h-0 flex-1 bg-page",
              isPos && !planningOnlyActive
                ? "flex min-h-0 flex-col overflow-hidden p-0 md:p-0"
                : "overflow-y-auto p-4 md:p-8",
              showMobileBottomNav && "natus-main-mobile-nav",
              mobileStorePosGate && "max-md:p-0 max-md:!pb-0"
            )}
          >
            {scope && !isPos && (
              <>
                <div className="mb-4 flex shrink-0 justify-end overflow-visible">
                  <CashierNotificationBell />
                </div>
                <CashierNotificationBar />
                <NotificationViewBanner />
              </>
            )}
            {isPos && !planningOnlyActive ? (
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
          accessPreset={accessPreset}
          allowedPages={allowedPages}
          requireManagerCode={requireManagerCode}
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
