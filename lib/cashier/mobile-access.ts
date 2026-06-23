import type { SupabaseClient } from "@supabase/supabase-js";
import { isMobileUserAgent } from "@/lib/layout/mobile-request";
import {
  CASHIER_PLANNING_PATH,
  isCashierPlanningRoute,
  isPersonalCashierPlanningMode,
} from "@/lib/cashier/access";

type CashierProfile = {
  id: string;
  role: string;
  is_store_pos?: boolean | null;
  store_id?: string | null;
};

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
    return isCashierPlanningRoute(pathname) ? null : CASHIER_PLANNING_PATH;
  }

  if (await isPersonalCashierPlanningMode(supabase, profile)) {
    return isCashierPlanningRoute(pathname) ? null : CASHIER_PLANNING_PATH;
  }

  return null;
}
