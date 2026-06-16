import { LOYALTY_POINTS_PER_MAD, LOYALTY_POINT_VALUE_MAD } from "@/lib/loyalty/config";

export function pointsEarnedForAmount(amountMad: number): number {
  if (amountMad <= 0) return 0;
  return Math.floor(amountMad / LOYALTY_POINTS_PER_MAD);
}

export function maxRedeemablePoints(
  customerPoints: number,
  subtotalMad: number
): number {
  const maxByTotal = Math.floor(subtotalMad / LOYALTY_POINT_VALUE_MAD);
  return Math.max(0, Math.min(customerPoints, maxByTotal));
}

export function discountFromPoints(points: number): number {
  return points * LOYALTY_POINT_VALUE_MAD;
}

export function payableAfterRedemption(subtotalMad: number, pointsToRedeem: number): number {
  return Math.max(0, subtotalMad - discountFromPoints(pointsToRedeem));
}
