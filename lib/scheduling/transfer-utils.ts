import { addDays } from "@/lib/scheduling/week";
import type { CashierWithStore } from "@/lib/scheduling/shifts";

export type CashierStoreTransfer = {
  id: string;
  cashier_id: string;
  from_store_id: string;
  to_store_id: string;
  kind: "permanent" | "temporary";
  start_date: string;
  end_date: string | null;
  created_at: string;
};

export function transferCoversDate(
  transfer: CashierStoreTransfer,
  date: string
): boolean {
  if (date < transfer.start_date) return false;
  if (transfer.kind === "permanent" && !transfer.end_date) return true;
  if (!transfer.end_date) return date >= transfer.start_date;
  return date >= transfer.start_date && date <= transfer.end_date;
}

export function cashierWorksAtStoreOnDate(input: {
  cashier: Pick<CashierWithStore, "id" | "store_id">;
  storeId: string;
  date: string;
  transfers: CashierStoreTransfer[];
}): boolean {
  if (input.cashier.store_id === input.storeId) return true;

  return input.transfers.some(
    (transfer) =>
      transfer.cashier_id === input.cashier.id &&
      transfer.to_store_id === input.storeId &&
      transferCoversDate(transfer, input.date)
  );
}

export function getPlanningCashiersForStore(input: {
  storeId: string;
  weekStart: string;
  allCashiers: CashierWithStore[];
  transfers: CashierStoreTransfer[];
}): CashierWithStore[] {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(input.weekStart, i));
  const seen = new Map<string, CashierWithStore>();

  for (const cashier of input.allCashiers) {
    if (cashier.store_id === input.storeId) {
      seen.set(cashier.id, cashier);
      continue;
    }

    const borrowed = weekDays.some((day) =>
      cashierWorksAtStoreOnDate({
        cashier,
        storeId: input.storeId,
        date: day,
        transfers: input.transfers,
      })
    );

    if (borrowed) {
      seen.set(cashier.id, {
        ...cashier,
        store_name: `${cashier.store_name} · prêté`,
      });
    }
  }

  return [...seen.values()].sort((a, b) =>
    (a.full_name || a.email).localeCompare(b.full_name || b.email, "fr")
  );
}

export function availableCashiersForShift(input: {
  storeId: string;
  shiftDate: string;
  cashiers: CashierWithStore[];
  allShifts: { cashier_id: string; shift_date: string }[];
  weekOffs: { cashier_id: string; off_date: string }[];
  transfers: CashierStoreTransfer[];
}): CashierWithStore[] {
  return input.cashiers.filter((cashier) => {
    if (
      !cashierWorksAtStoreOnDate({
        cashier,
        storeId: input.storeId,
        date: input.shiftDate,
        transfers: input.transfers,
      })
    ) {
      return false;
    }

    if (input.weekOffs.some((o) => o.cashier_id === cashier.id && o.off_date === input.shiftDate)) {
      return false;
    }

    return !input.allShifts.some(
      (shift) => shift.cashier_id === cashier.id && shift.shift_date === input.shiftDate
    );
  });
}
