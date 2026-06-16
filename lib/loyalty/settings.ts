import type { LoyaltySettings } from "@/lib/types";

export type LoyaltySettingsRow = {
  points_per_mad: number | string;
  point_value_mad: number | string;
  min_points_to_redeem: number;
};

export function mapLoyaltySettings(row: LoyaltySettingsRow): LoyaltySettings {
  return {
    pointsPerMad: Number(row.points_per_mad),
    pointValueMad: Number(row.point_value_mad),
    minPointsToRedeem: row.min_points_to_redeem,
  };
}

export function pointsValueInMad(points: number, settings: LoyaltySettings): number {
  return points * settings.pointValueMad;
}

export function formatLoyaltyEarnRule(settings: LoyaltySettings): string {
  const mad = settings.pointsPerMad;
  const formatted = Number.isInteger(mad) ? String(mad) : mad.toFixed(2).replace(/\.?0+$/, "");
  return `${formatted} MAD d'achat = 1 point`;
}

export function formatLoyaltyRedeemRule(settings: LoyaltySettings): string {
  const mad = settings.pointValueMad;
  const formatted = Number.isInteger(mad) ? String(mad) : mad.toFixed(2).replace(/\.?0+$/, "");
  return `1 point = ${formatted} MAD de réduction`;
}
