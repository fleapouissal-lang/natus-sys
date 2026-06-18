export type AppliedPosPromo = {
  code: string;
  label: string;
  discountPercent: number;
  isWinback: boolean;
};

export function promoDiscountAmount(
  subtotalAfterLoyalty: number,
  discountPercent: number
): number {
  if (subtotalAfterLoyalty <= 0 || discountPercent <= 0) return 0;
  return Math.round(subtotalAfterLoyalty * (discountPercent / 100) * 100) / 100;
}

export function checkoutTotal(
  subtotal: number,
  loyaltyDiscount: number,
  promo: AppliedPosPromo | null
): number {
  const afterLoyalty = Math.max(0, subtotal - loyaltyDiscount);
  const promoOff = promo
    ? promoDiscountAmount(afterLoyalty, promo.discountPercent)
    : 0;
  return Math.max(0, Math.round((afterLoyalty - promoOff) * 100) / 100);
}
