import { LOYALTY_POINTS_PER_MAD, LOYALTY_POINT_VALUE_MAD, LOYALTY_MIN_POINTS_TO_REDEEM } from "@/lib/loyalty/config";

export function canRedeemLoyaltyPoints(customerPoints: number): boolean {
  return customerPoints >= LOYALTY_MIN_POINTS_TO_REDEEM;
}

export function pointsUntilRedemption(customerPoints: number): number {
  return Math.max(0, LOYALTY_MIN_POINTS_TO_REDEEM - customerPoints);
}

export function pointsEarnedForAmount(amountMad: number): number {
  if (amountMad <= 0) return 0;
  return Math.floor(amountMad / LOYALTY_POINTS_PER_MAD);
}

export function maxRedeemablePoints(
  customerPoints: number,
  subtotalMad: number
): number {
  if (!canRedeemLoyaltyPoints(customerPoints)) return 0;
  const maxByTotal = Math.floor(subtotalMad / LOYALTY_POINT_VALUE_MAD);
  return Math.max(0, Math.min(customerPoints, maxByTotal));
}

export function discountFromPoints(points: number): number {
  return points * LOYALTY_POINT_VALUE_MAD;
}

export function payableAfterRedemption(subtotalMad: number, pointsToRedeem: number): number {
  return Math.max(0, subtotalMad - discountFromPoints(pointsToRedeem));
}
