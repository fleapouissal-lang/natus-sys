import type { LoyaltyCustomer } from "@/lib/types";

/** Client inscrit dans ce magasin (sans tenir compte des achats ailleurs). */
export function customerRegisteredAtStore(
  customer: Pick<LoyaltyCustomer, "store_id">,
  storeId: string
): boolean {
  return customer.store_id === storeId;
}
