import type { LoyaltyCustomer } from "@/lib/types";
import {
  promoDiscountAmount,
  type AppliedPosPromo,
} from "@/lib/marketing/pos-promo";

export const PRO_CLIENT_DISCOUNT_PERCENT = 34;
export const PRO_CLIENT_DISCOUNT_LABEL = "Remise Client Pro";

/** Proposition commerciale — palier premium (non activé en caisse pour l'instant) */
export const PRO_PLUS_DISCOUNT_PERCENT = 40;
export const PRO_PLUS_LABEL = "Client Pro Plus";
export const PRO_PLUS_TAGLINE = "Programme premium pour partenaires stratégiques";

export function isActiveProClient(
  customer: Pick<LoyaltyCustomer, "is_pro_client" | "pro_client_active"> | null | undefined
): boolean {
  return Boolean(customer?.is_pro_client && customer?.pro_client_active);
}

export function isProClientCustomer(
  customer: Pick<LoyaltyCustomer, "is_pro_client"> | null | undefined
): boolean {
  return Boolean(customer?.is_pro_client);
}

export function proClientRemiseDisplay(active: boolean): string {
  return active ? `-${PRO_CLIENT_DISCOUNT_PERCENT}%` : `-${PRO_CLIENT_DISCOUNT_PERCENT}% (en attente)`;
}

export function proClientDiscountAmount(subtotalAfterLoyalty: number): number {
  return promoDiscountAmount(subtotalAfterLoyalty, PRO_CLIENT_DISCOUNT_PERCENT);
}

export function computePosCheckoutDiscounts(
  subtotal: number,
  loyaltyDiscount: number,
  promo: AppliedPosPromo | null,
  customer: LoyaltyCustomer | null
): {
  total: number;
  proClientDiscount: number;
  promoDiscount: number;
} {
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);

  if (isActiveProClient(customer)) {
    const proClientDiscount = proClientDiscountAmount(afterLoyalty);
    return {
      proClientDiscount,
      promoDiscount: 0,
      total: Math.max(0, Math.round((afterLoyalty - proClientDiscount) * 100) / 100),
    };
  }

  const promoDiscount = promo
    ? promoDiscountAmount(afterLoyalty, promo.discountPercent)
    : 0;

  return {
    proClientDiscount: 0,
    promoDiscount,
    total: Math.max(0, Math.round((afterLoyalty - promoDiscount) * 100) / 100),
  };
}
