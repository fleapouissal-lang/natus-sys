import type { SupabaseClient } from "@supabase/supabase-js";
import { isMobileUserAgent } from "@/lib/layout/mobile-request";
import {
  CASHIER_PLANNING_PATH,
  isCashierPlanningRoute,
  isCashierStorePosMobileRoute,
  isPersonalCashierPlanningMode,
  type CashierProfile,
} from "@/lib/cashier/access";

/**
 * Mobile : compte caisse magasin ou caissier perso → planning seul.
 * Desktop : pas de redirection (accès complet).
 */
export async function getCashierMobileRedirectPath(
  supabase: SupabaseClient,
  profile: CashierProfile,
  pathname: string,
  userAgent: string | null | undefined
): Promise<string | null> {
  if (!isMobileUserAgent(userAgent)) return null;
  if (profile.role !== "cashier") return null;

  if (profile.is_store_pos) {
    return isCashierStorePosMobileRoute(pathname) ? null : CASHIER_PLANNING_PATH;
  }

  if (await isPersonalCashierPlanningMode(supabase, profile)) {
    return isCashierPlanningRoute(pathname) ? null : CASHIER_PLANNING_PATH;
  }

  return null;
}
