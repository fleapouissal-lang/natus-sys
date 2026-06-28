import { toLocalDateKey } from "@/lib/utils";

/** Nombre de jours consultables : aujourd'hui + 3 jours précédents. */
export const MANAGER_SALES_HISTORY_DAYS = 4;

export function getManagerSalesHistoryDateBounds(now = new Date()): {
  minDate: string;
  maxDate: string;
} {
  const maxDate = toLocalDateKey(now);
  const min = new Date(now);
  min.setDate(min.getDate() - (MANAGER_SALES_HISTORY_DAYS - 1));
  return { minDate: toLocalDateKey(min), maxDate };
}

/** Même fenêtre que le gérant — caissier : aujourd'hui + 3 jours précédents. */
export const getCashierSalesHistoryDateBounds = getManagerSalesHistoryDateBounds;

export function clampDateToManagerSalesWindow(
  value: string,
  bounds: { minDate: string; maxDate: string }
): string {
  if (!value) return value;
  if (value < bounds.minDate) return bounds.minDate;
  if (value > bounds.maxDate) return bounds.maxDate;
  return value;
}

export const clampDateToCashierSalesWindow = clampDateToManagerSalesWindow;
