import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CashierWeekOff } from "@/lib/scheduling/week-off-utils";

export type { CashierWeekOff } from "@/lib/scheduling/week-off-utils";

type WeekOffRow = Omit<CashierWeekOff, "profiles"> & {
  cashier?: CashierWeekOff["profiles"];
};

export async function getCashierWeekOffs(input: {
  weekStart: string;
  cashierIds: string[];
}): Promise<CashierWeekOff[]> {
  if (input.cashierIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cashier_week_offs")
    .select(
      `
      id,
      cashier_id,
      week_start,
      off_date,
      cashier:profiles!cashier_id ( full_name, email )
    `
    )
    .eq("week_start", input.weekStart)
    .in("cashier_id", input.cashierIds);

  if (error) {
    console.error("[week-offs] list:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const raw = row as unknown as WeekOffRow & {
      cashier?: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
    };
    const cashierRel = raw.cashier;
    const cashier = Array.isArray(cashierRel) ? cashierRel[0] : cashierRel;
    const { cashier: _c, ...rest } = raw;
    return { ...rest, profiles: cashier ?? null };
  });
}
