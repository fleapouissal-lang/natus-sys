import type { Profile, LoyaltyCustomer } from "@/lib/types";
import { fetchCustomersForStoreAccount } from "@/lib/loyalty/store-customer-scope";
import {
  sortLoyaltyCustomersByFidelity,
  sortProClientsByFidelity,
} from "@/lib/loyalty/sort-customers";

export async function getLoyaltyCustomers(
  profile: Profile,
  opts: { storeOnly?: boolean; limit?: number } = {}
): Promise<LoyaltyCustomer[]> {
  void opts.storeOnly;
  const rows = await fetchCustomersForStoreAccount(profile, false, opts.limit ?? 500);
  return sortLoyaltyCustomersByFidelity(rows);
}

export async function getProClientsForStaff(
  profile: Profile,
  opts: { storeOnly?: boolean; limit?: number } = {}
): Promise<LoyaltyCustomer[]> {
  void opts.storeOnly;
  const rows = await fetchCustomersForStoreAccount(profile, true, opts.limit ?? 500);
  return sortProClientsByFidelity(rows);
}
