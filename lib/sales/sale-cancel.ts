export const MANAGER_SALE_CANCEL_WINDOW_MS = 60 * 60 * 1000;

export function canCancelSaleAsManager(
  sale: Pick<{ cancelled_at?: string | null; created_at: string }, "cancelled_at" | "created_at">
): boolean {
  if (sale.cancelled_at) return false;
  return Date.now() - new Date(sale.created_at).getTime() <= MANAGER_SALE_CANCEL_WINDOW_MS;
}

export function canCancelSaleAsDirector(
  sale: Pick<{ cancelled_at?: string | null }, "cancelled_at">
): boolean {
  return !sale.cancelled_at;
}

export function managerSaleCancelBlockedMessage(): string {
  return "Annulation impossible après 1 h — contactez le directeur";
}
