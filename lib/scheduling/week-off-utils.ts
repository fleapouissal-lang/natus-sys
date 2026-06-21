import { addDays } from "@/lib/scheduling/week";

export type CashierWeekOff = {
  id: string;
  cashier_id: string;
  week_start: string;
  off_date: string;
  profiles?: { full_name: string | null; email: string } | null;
};

export function isCashierOffOnDate(
  weekOffs: CashierWeekOff[],
  cashierId: string,
  date: string
): boolean {
  return weekOffs.some((o) => o.cashier_id === cashierId && o.off_date === date);
}

export function weekOffsForDate(
  weekOffs: CashierWeekOff[],
  date: string
): CashierWeekOff[] {
  return weekOffs.filter((o) => o.off_date === date);
}

export function isDateInWeek(date: string, weekStart: string): boolean {
  const weekEnd = addDays(weekStart, 6);
  return date >= weekStart && date <= weekEnd;
}
