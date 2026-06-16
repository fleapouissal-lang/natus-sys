import type { LoyaltySettings } from "@/lib/types";
import { DEFAULT_LOYALTY_SETTINGS } from "@/lib/loyalty/config";

export function canRedeemLoyaltyPoints(
  customerPoints: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): boolean {
  return customerPoints >= settings.minPointsToRedeem;
}

export function pointsUntilRedemption(
  customerPoints: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): number {
  return Math.max(0, settings.minPointsToRedeem - customerPoints);
}

export function pointsEarnedForAmount(
  amountMad: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): number {
  if (amountMad <= 0 || settings.pointsPerMad <= 0) return 0;
  return Math.floor(amountMad / settings.pointsPerMad);
}

export function maxRedeemablePoints(
  customerPoints: number,
  subtotalMad: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): number {
  if (!canRedeemLoyaltyPoints(customerPoints, settings)) return 0;
  if (settings.pointValueMad <= 0) return 0;
  const maxByTotal = Math.floor(subtotalMad / settings.pointValueMad);
  return Math.max(0, Math.min(customerPoints, maxByTotal));
}

export function discountFromPoints(
  points: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): number {
  return points * settings.pointValueMad;
}

export function payableAfterRedemption(
  subtotalMad: number,
  pointsToRedeem: number,
  settings: LoyaltySettings = DEFAULT_LOYALTY_SETTINGS
): number {
  return Math.max(0, subtotalMad - discountFromPoints(pointsToRedeem, settings));
}
