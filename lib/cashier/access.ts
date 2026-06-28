import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/types";
import { getHomePath } from "@/lib/permissions";
import { getCustomHomePath } from "@/lib/user-page-access";

export const CASHIER_PLANNING_PATH = "/cashier/planning";
export const CASHIER_STORE_NOTES_PATH = "/cashier/notes";
export const CASHIER_HISTORY_PATH = "/cashier/history";
/** @deprecated Ancienne route — redirige vers {@link CASHIER_HISTORY_PATH} */
export const CASHIER_POS_CLOSURES_PATH = "/cashier/pos-closures";

export type CashierProfile = Pick<Profile, "role" | "is_store_pos" | "store_id">;

export function isCashierPlanningRoute(pathname: string): boolean {
  return (
    pathname === CASHIER_PLANNING_PATH ||
    pathname.startsWith(`${CASHIER_PLANNING_PATH}/`)
  );
}

/** Mobile compte magasin : planning, notes et historique */
export function isCashierStorePosMobileRoute(pathname: string): boolean {
  return (
    isCashierPlanningRoute(pathname) ||
    pathname === CASHIER_STORE_NOTES_PATH ||
    pathname.startsWith(`${CASHIER_STORE_NOTES_PATH}/`) ||
    pathname === CASHIER_HISTORY_PATH ||
    pathname.startsWith(`${CASHIER_HISTORY_PATH}/`) ||
    pathname === CASHIER_POS_CLOSURES_PATH ||
    pathname.startsWith(`${CASHIER_POS_CLOSURES_PATH}/`)
  );
}

export async function storeHasActivePosAccount(
  supabase: SupabaseClient,
  storeId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("store_id", storeId)
    .eq("is_store_pos", true)
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function isPersonalCashierPlanningMode(
  supabase: SupabaseClient,
  profile: CashierProfile | null | undefined
): Promise<boolean> {
  if (!profile || profile.role !== "cashier" || profile.is_store_pos || !profile.store_id) {
    return false;
  }

  return storeHasActivePosAccount(supabase, profile.store_id);
}

export async function resolveStaffHomePath(
  supabase: SupabaseClient,
  profile: CashierProfile & Pick<Profile, "access_preset" | "allowed_pages"> & { role: UserRole },
  options?: { isMobile?: boolean }
): Promise<string> {
  const customHome = getCustomHomePath(profile);
  if (customHome) return customHome;

  if (profile.role !== "cashier") {
    return getHomePath(profile.role, profile);
  }

  if (profile.is_store_pos) {
    return options?.isMobile ? CASHIER_PLANNING_PATH : "/cashier/pos";
  }

  if (profile.store_id && (await storeHasActivePosAccount(supabase, profile.store_id))) {
    return options?.isMobile ? CASHIER_PLANNING_PATH : "/cashier/pos";
  }

  return "/cashier/pos";
}
