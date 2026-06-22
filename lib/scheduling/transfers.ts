import "server-only";

import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/scheduling/week";
import type { CashierStoreTransfer } from "@/lib/scheduling/transfer-utils";

export type { CashierStoreTransfer } from "@/lib/scheduling/transfer-utils";

export async function getCashierStoreTransfers(input: {
  weekStart: string;
  storeIds: string[];
}): Promise<CashierStoreTransfer[]> {
  if (input.storeIds.length === 0) return [];

  const weekEnd = addDays(input.weekStart, 6);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cashier_store_transfers")
    .select("*")
    .or(
      `from_store_id.in.(${input.storeIds.join(",")}),to_store_id.in.(${input.storeIds.join(",")})`
    );

  if (error) {
    console.error("[transfers] list:", error.message);
    return [];
  }

  return (data || []).filter((row) => {
    const start = row.start_date as string;
    const end = row.end_date as string | null;
    if (start > weekEnd) return false;
    if (end && end < input.weekStart) return false;
    return true;
  }) as CashierStoreTransfer[];
}
