import type { LoyaltySettings } from "@/lib/types";

export const LOYALTY_POINTS_PER_MAD = 10;
export const LOYALTY_POINT_VALUE_MAD = 1;
export const LOYALTY_MIN_POINTS_TO_REDEEM = 200;

export const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  pointsPerMad: LOYALTY_POINTS_PER_MAD,
  pointValueMad: LOYALTY_POINT_VALUE_MAD,
  minPointsToRedeem: LOYALTY_MIN_POINTS_TO_REDEEM,
};
