import type { SupabaseClient } from "@supabase/supabase-js";
import { isMobileUserAgent } from "@/lib/layout/mobile-request";
import {
  CASHIER_PLANNING_PATH,
  isCashierPlanningRoute,
} from "@/lib/cashier/access";
import { CASHIER_POS_PATH } from "@/lib/layout/mobile-planning";

type CashierProfile = {
  id: string;
  role: string;
  is_store_pos?: boolean | null;
  store_id?: string | null;
};

function isCashierPosRoute(pathname: string): boolean {
  return pathname === CASHIER_POS_PATH || pathname.startsWith(`${CASHIER_POS_PATH}/`);
}

async function storePosHasActiveOperator(
  supabase: SupabaseClient,
  terminalUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("pos_operator_sessions")
    .select("operator_id")
    .eq("terminal_user_id", terminalUserId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .maybeSingle();

  return Boolean(data?.operator_id);
}

/**
 * Mobile : terminal magasin avec caissier connecté → planning seul ;
 * terminal sans caissier → caisse / connexion caissier uniquement.
 */
export async function getCashierMobileRedirectPath(
  supabase: SupabaseClient,
  profile: CashierProfile,
  pathname: string,
  userAgent: string | null | undefined
): Promise<string | null> {
  if (!isMobileUserAgent(userAgent)) return null;
  if (profile.role !== "cashier" || !profile.is_store_pos) return null;

  const hasOperator = await storePosHasActiveOperator(supabase, profile.id);
  if (hasOperator) {
    return isCashierPlanningRoute(pathname) ? null : CASHIER_PLANNING_PATH;
  }
  return isCashierPosRoute(pathname) ? null : CASHIER_POS_PATH;
}
