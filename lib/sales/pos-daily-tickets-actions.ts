"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { getStorePosDayState } from "@/lib/sales/store-day-closure-actions";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import { toLocalDateKey } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export async function listPosDailyTickets(
  storeId: string
): Promise<{ sales: Sale[]; businessDate: string } | { error: string }> {
  const profile = await requireRole(["cashier"]);
  if (!profile) return { error: "Non autorisé" };
  if (!storeId) return { error: "Magasin requis" };
  if (profile.store_id && profile.store_id !== storeId) {
    return { error: "Magasin non autorisé" };
  }

  const stateResult = await getStorePosDayState(storeId);
  const businessDate =
    "state" in stateResult ? stateResult.state.business_date : toLocalDateKey(new Date());

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("store_id", storeId)
    .eq("business_date", businessDate)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    console.error("[pos-daily-tickets] list:", error.message);
    return { error: error.message };
  }

  return { sales: (data || []) as Sale[], businessDate };
}
