import type { SupabaseClient } from "@supabase/supabase-js";
import { getCashierSalesHistoryDateBounds } from "@/lib/sales/manager-sales-window";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import type { Sale } from "@/lib/types";

type FetchCashierSalesOptions = {
  limit?: number;
  minDate?: string;
  maxDate?: string;
};

function resolveHistoryBounds(options: FetchCashierSalesOptions) {
  if (options.minDate && options.maxDate) {
    return { minDate: options.minDate, maxDate: options.maxDate };
  }
  return getCashierSalesHistoryDateBounds();
}

export async function fetchCashierSales(
  supabase: SupabaseClient,
  cashierId: string,
  options: FetchCashierSalesOptions = {}
): Promise<{ sales: Sale[]; error: string | null }> {
  const bounds = resolveHistoryBounds(options);

  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("cashier_id", cashierId)
    .gte("created_at", `${bounds.minDate}T00:00:00`)
    .lte("created_at", `${bounds.maxDate}T23:59:59.999`)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 500);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as Sale[], error: null };
}

export async function fetchStoreSales(
  supabase: SupabaseClient,
  storeId: string,
  options: FetchCashierSalesOptions = {}
): Promise<{ sales: Sale[]; error: string | null }> {
  const bounds = resolveHistoryBounds(options);

  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("store_id", storeId)
    .gte("created_at", `${bounds.minDate}T00:00:00`)
    .lte("created_at", `${bounds.maxDate}T23:59:59.999`)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 500);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as Sale[], error: null };
}
