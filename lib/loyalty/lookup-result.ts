import type { CustomerNote, LoyaltyCustomer } from "@/lib/types";

export type LoyaltyLookupBlocked = "deactivated" | "pending";

export type LoyaltyLookupResult =
  | { customer: LoyaltyCustomer; notes: CustomerNote[] }
  | { customer: LoyaltyCustomer; notes: CustomerNote[]; blocked: LoyaltyLookupBlocked }
  | { error: string };

export function resolveLoyaltyLookupResult(
  customer: LoyaltyCustomer,
  notes: CustomerNote[]
): LoyaltyLookupResult {
  if (customer.is_active === false) {
    return { customer, notes, blocked: "deactivated" };
  }
  if (customer.is_pro_client && !customer.pro_client_active) {
    return { customer, notes, blocked: "pending" };
  }
  return { customer, notes };
}

export function loyaltyLookupBlockedMessage(blocked: LoyaltyLookupBlocked): string {
  if (blocked === "deactivated") return "Carte désactivée";
  return "Compte Pro en attente";
}
