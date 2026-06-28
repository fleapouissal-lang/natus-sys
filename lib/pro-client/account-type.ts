import type { LoyaltyCustomer } from "@/lib/types";

export function isProParticulierCustomer(
  customer: Pick<LoyaltyCustomer, "is_pro_client" | "pro_client_type"> | null | undefined
): boolean {
  return Boolean(
    customer?.is_pro_client && customer.pro_client_type === "particulier"
  );
}

export function isProEntrepriseCustomer(
  customer: Pick<LoyaltyCustomer, "is_pro_client" | "pro_client_type"> | null | undefined
): boolean {
  return Boolean(
    customer?.is_pro_client && customer.pro_client_type === "entreprise"
  );
}
