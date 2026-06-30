import { toLocalDateKey } from "@/lib/utils";

type SaleCancelCheck = Pick<
  { cancelled_at?: string | null; created_at: string },
  "cancelled_at" | "created_at"
>;

/** Le caissier ne peut plus annuler de vente. */
export function canCancelSaleAsCashier(_sale: SaleCancelCheck): boolean {
  return false;
}

/** Gérant : ventes du jour calendaire uniquement. */
export function canCancelSaleAsManager(sale: SaleCancelCheck): boolean {
  if (sale.cancelled_at) return false;
  return toLocalDateKey(sale.created_at) === toLocalDateKey(new Date());
}

/** Directeur : toute vente non annulée. */
export function canCancelSaleAsDirector(
  sale: Pick<{ cancelled_at?: string | null }, "cancelled_at">
): boolean {
  return !sale.cancelled_at;
}

export function cashierSaleCancelBlockedMessage(): string {
  return "Seul le gérant ou le directeur peut annuler une vente";
}

export function managerSaleCancelBlockedMessage(
  _sale: Pick<{ created_at: string }, "created_at">
): string {
  return "Annulation impossible : la vente n'est pas du jour — contactez le directeur";
}
