import { toLocalDateKey } from "@/lib/utils";

/** Compte caisse magasin (is_store_pos) — factures consultables sur 45 jours. */
export const STORE_POS_INVOICE_HISTORY_DAYS = 45;

export function getStorePosInvoiceHistoryDateBounds(now = new Date()): {
  minDate: string;
  maxDate: string;
} {
  const maxDate = toLocalDateKey(now);
  const min = new Date(now);
  min.setDate(min.getDate() - (STORE_POS_INVOICE_HISTORY_DAYS - 1));
  return { minDate: toLocalDateKey(min), maxDate };
}

export function getStorePosInvoiceCreatedAfter(now = new Date()): string {
  const min = new Date(now);
  min.setDate(min.getDate() - (STORE_POS_INVOICE_HISTORY_DAYS - 1));
  min.setHours(0, 0, 0, 0);
  return min.toISOString();
}

export function isWithinStorePosInvoiceHistory(
  isoDate: string,
  now = new Date()
): boolean {
  return new Date(isoDate).getTime() >= new Date(getStorePosInvoiceCreatedAfter(now)).getTime();
}
