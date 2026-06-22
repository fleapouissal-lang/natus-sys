import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/scheduling/week";
import type { CashierSummary, Store } from "@/lib/types";

export type CashierShift = {
  id: string;
  store_id: string;
  cashier_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string } | null;
  stores?: Pick<Store, "name" | "city"> | null;
};

type CashierShiftRow = Omit<CashierShift, "profiles" | "stores"> & {
  cashier?: CashierShift["profiles"];
  store?: CashierShift["stores"];
};

export type CashierWithStore = CashierSummary & {
  store_id: string;
  store_name: string;
};

export async function getCityCashiers(storeIds: string[]): Promise<CashierWithStore[]> {
  if (storeIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active, store_id, stores(name)")
    .eq("role", "cashier")
    .eq("is_store_pos", false)
    .in("store_id", storeIds)
    .order("full_name");

  if (error) {
    console.error("[shifts] cashiers:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const storeRel = row.stores as unknown;
    const storeRow = Array.isArray(storeRel)
      ? (storeRel[0] as { name?: string } | undefined)
      : (storeRel as { name?: string } | null);
    return {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      is_active: row.is_active,
      store_id: row.store_id as string,
      store_name: storeRow?.name || "—",
    };
  });
}

export async function getCashierShifts(input: {
  weekStart: string;
  storeId?: string | null;
  cashierId?: string | null;
  storeIds: string[];
}): Promise<CashierShift[]> {
  if (input.storeIds.length === 0) return [];

  const weekEnd = addDays(input.weekStart, 6);
  const supabase = await createClient();

  let query = supabase
    .from("cashier_shifts")
    .select(
      `
      *,
      cashier:profiles!cashier_id ( full_name, email ),
      store:stores!store_id ( name, city )
    `
    )
    .gte("shift_date", input.weekStart)
    .lte("shift_date", weekEnd)
    .in("store_id", input.storeIds)
    .order("shift_date")
    .order("start_time");

  if (input.storeId) {
    query = query.eq("store_id", input.storeId);
  }

  if (input.cashierId) {
    query = query.eq("cashier_id", input.cashierId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[shifts] list:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const { cashier, store, ...shift } = row as CashierShiftRow;
    return {
      ...shift,
      profiles: cashier ?? null,
      stores: store ?? null,
    };
  });
}

export async function getMyCashierShifts(input: {
  weekStart: string;
  cashierId: string;
}): Promise<CashierShift[]> {
  const weekEnd = addDays(input.weekStart, 6);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cashier_shifts")
    .select(
      `
      *,
      cashier:profiles!cashier_id ( full_name, email ),
      store:stores!store_id ( name, city )
    `
    )
    .eq("cashier_id", input.cashierId)
    .gte("shift_date", input.weekStart)
    .lte("shift_date", weekEnd)
    .order("shift_date")
    .order("start_time");

  if (error) {
    console.error("[shifts] my schedule:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const { cashier, store, ...shift } = row as CashierShiftRow;
    return {
      ...shift,
      profiles: cashier ?? null,
      stores: store ?? null,
    };
  });
}
