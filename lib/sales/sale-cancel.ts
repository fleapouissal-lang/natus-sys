import { toLocalDateKey } from "@/lib/utils";

export const CASHIER_SALE_CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;
export const MANAGER_SALE_CANCEL_WINDOW_MS = 8 * 60 * 60 * 1000;

type SaleCancelCheck = Pick<
  { cancelled_at?: string | null; created_at: string },
  "cancelled_at" | "created_at"
>;

function saleAgeMs(sale: SaleCancelCheck): number {
  return Date.now() - new Date(sale.created_at).getTime();
}

export function canCancelSaleAsCashier(sale: SaleCancelCheck): boolean {
  if (sale.cancelled_at) return false;
  return saleAgeMs(sale) <= CASHIER_SALE_CANCEL_WINDOW_MS;
}

export function canCancelSaleAsManager(sale: SaleCancelCheck): boolean {
  if (sale.cancelled_at) return false;
  if (toLocalDateKey(sale.created_at) !== toLocalDateKey(new Date())) return false;
  return saleAgeMs(sale) <= MANAGER_SALE_CANCEL_WINDOW_MS;
}

export function canCancelSaleAsDirector(
  sale: Pick<{ cancelled_at?: string | null }, "cancelled_at">
): boolean {
  return !sale.cancelled_at;
}

export function cashierSaleCancelBlockedMessage(): string {
  return "Annulation impossible après 2 h — contactez le gérant";
}

export function managerSaleCancelBlockedMessage(sale: Pick<{ created_at: string }, "created_at">): string {
  if (toLocalDateKey(sale.created_at) !== toLocalDateKey(new Date())) {
    return "Annulation impossible : la vente n'est pas du jour — contactez le directeur";
  }
  return "Annulation impossible après 8 h — contactez le directeur";
}
