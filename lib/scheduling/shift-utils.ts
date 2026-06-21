import type { CashierShift } from "@/lib/scheduling/shifts";
import { formatTimeLabel } from "@/lib/scheduling/week";

export function findCashierShiftOnDate(
  shifts: CashierShift[],
  cashierId: string,
  date: string
): CashierShift | undefined {
  return shifts.find((s) => s.cashier_id === cashierId && s.shift_date === date);
}

export function shiftConflictMessage(existing: CashierShift): string {
  const store = existing.stores?.name;
  const hours = `${formatTimeLabel(existing.start_time)} – ${formatTimeLabel(existing.end_time)}`;
  const where = store ? ` au magasin ${store}` : "";
  return `Ce caissier a déjà un créneau ce jour${where} (${hours}). Un seul créneau par jour est autorisé.`;
}
