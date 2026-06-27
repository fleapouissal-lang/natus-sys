"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CASHIER_PLANNING_PATH,
  CASHIER_POS_PATH,
  getMobilePosRedirectPath,
} from "@/lib/layout/mobile-planning";
import { isCashierPlanningRoute, isCashierStorePosMobileRoute } from "@/lib/cashier/access";
import { isCashierPosRoute } from "@/lib/layout/sidebar-state";
import type { UserRole } from "@/lib/types";

function isMobileViewport() {
  return window.matchMedia("(max-width: 767px)").matches;
}

export function MobilePlanningRedirect({
  enabled,
  isStorePos = false,
}: {
  enabled: boolean;
  isStorePos?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (!isMobileViewport()) return;
    if (isStorePos ? isCashierStorePosMobileRoute(pathname) : isCashierPlanningRoute(pathname)) {
      return;
    }

    router.replace(CASHIER_PLANNING_PATH);
  }, [enabled, isStorePos, pathname, router]);

  return null;
}

/** Compte magasin mobile sans caissier → caisse / connexion caissier */
export function MobileStorePosGateRedirect({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (!isMobileViewport()) return;
    if (pathname === CASHIER_POS_PATH || pathname.startsWith(`${CASHIER_POS_PATH}/`)) {
      return;
    }

    router.replace(CASHIER_POS_PATH);
  }, [enabled, pathname, router]);

  return null;
}

/** Direction / gérant / hub : caisse indisponible sur mobile */
export function MobileManagementPosRedirect({
  enabled,
  role,
}: {
  enabled: boolean;
  role: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (!isMobileViewport()) return;
    if (!isCashierPosRoute(pathname)) return;

    router.replace(getMobilePosRedirectPath(role));
  }, [enabled, pathname, role, router]);

  return null;
}
