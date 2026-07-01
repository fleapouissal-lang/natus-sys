import type { UserRole } from "@/lib/types";
import { getHomePath, getManagementBasePath, hasDirectorAccess } from "@/lib/permissions";

/** Mobile : compte caisse magasin ou caissier perso → planning seul */
export function isMobilePlanningOnlyMode(input: {
  isPersonalCashier?: boolean;
  isStorePos?: boolean;
}): boolean {
  return Boolean(input.isPersonalCashier || input.isStorePos);
}

/** Caisse POS réservée au desktop pour direction et hub inventaire */
export function isMobilePosDesktopOnlyRole(role: UserRole): boolean {
  return hasDirectorAccess(role) || role === "hub";
}

export function getMobilePosRedirectPath(role: UserRole): string {
  return getManagementBasePath(role) ?? getHomePath(role);
}

/** Mobile compte magasin sans caissier connecté : gate caisse (desktop uniquement) */
export function isMobileStorePosGateMode(input: {
  isStorePos?: boolean;
  hasPosOperator?: boolean;
  isMobile?: boolean;
}): boolean {
  return Boolean(input.isStorePos && !input.hasPosOperator && !input.isMobile);
}

/** Barre du bas mobile visible (directeur, gérant, hub, caissier standard…) */
export function isMobileBottomNavVisible(input: {
  isStorePos?: boolean;
  isPersonalCashier?: boolean;
  hasPosOperator?: boolean;
}): boolean {
  if (input.isStorePos) return false;
  return !isMobilePlanningOnlyMode(input);
}

export const CASHIER_PLANNING_PATH = "/cashier/planning";
export const CASHIER_POS_PATH = "/cashier/pos";
