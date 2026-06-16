import type { LoyaltyTier } from "@/lib/types";

export function loyaltyTierFromPoints(points: number): LoyaltyTier {
  if (points >= 500) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
}

export function loyaltyTierLabel(tier: LoyaltyTier): string {
  switch (tier) {
    case "gold":
      return "Gold";
    case "silver":
      return "Silver";
    default:
      return "Bronze";
  }
}

export function loyaltyTierGradient(tier: LoyaltyTier): string {
  switch (tier) {
    case "gold":
      return "from-amber-500 via-yellow-400 to-amber-600";
    case "silver":
      return "from-slate-400 via-gray-200 to-slate-500";
    default:
      return "from-orange-800 via-amber-700 to-orange-900";
  }
}
