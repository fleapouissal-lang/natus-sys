import type { SupabaseClient } from "@supabase/supabase-js";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import type { Sale } from "@/lib/types";

export async function fetchCashierSales(
  supabase: SupabaseClient,
  cashierId: string,
  limit = 1000
): Promise<{ sales: Sale[]; error: string | null }> {
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("cashier_id", cashierId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as Sale[], error: null };
}

export async function fetchStoreSales(
  supabase: SupabaseClient,
  storeId: string,
  limit = 1000
): Promise<{ sales: Sale[]; error: string | null }> {
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as Sale[], error: null };
}
