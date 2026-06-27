import type { LoyaltyCustomer } from "@/lib/types";

/** Clients fidélité : plus de points en premier. */
export function sortLoyaltyCustomersByFidelity(
  customers: LoyaltyCustomer[]
): LoyaltyCustomer[] {
  return [...customers].sort((a, b) => {
    const pointsDiff = b.loyalty_points - a.loyalty_points;
    if (pointsDiff !== 0) return pointsDiff;
    return a.full_name.localeCompare(b.full_name, "fr");
  });
}

/** Clients Pro : actifs d'abord, puis ancienneté (plus fidèles en premier). */
export function sortProClientsByFidelity(
  customers: LoyaltyCustomer[]
): LoyaltyCustomer[] {
  return [...customers].sort((a, b) => {
    const activeDiff =
      Number(Boolean(b.pro_client_active)) - Number(Boolean(a.pro_client_active));
    if (activeDiff !== 0) return activeDiff;

    const tenureDiff =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (tenureDiff !== 0) return tenureDiff;

    return a.full_name.localeCompare(b.full_name, "fr");
  });
}
