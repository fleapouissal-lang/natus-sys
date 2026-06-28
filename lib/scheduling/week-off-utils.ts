import { addDays } from "@/lib/scheduling/week";

export type CashierWeekOff = {
  id: string;
  cashier_id: string;
  week_start: string;
  off_date: string;
  profiles?: { full_name: string | null; email: string } | null;
};

export function normalizePlanningDate(date: string): string {
  return date.slice(0, 10);
}

export function isCashierOffOnDate(
  weekOffs: CashierWeekOff[],
  cashierId: string,
  date: string
): boolean {
  const day = normalizePlanningDate(date);
  return weekOffs.some(
    (o) => o.cashier_id === cashierId && normalizePlanningDate(o.off_date) === day
  );
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
