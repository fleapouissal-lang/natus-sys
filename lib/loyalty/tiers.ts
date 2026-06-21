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

/** Couleurs tag statut fidélité (Bronze / Silver / Gold). */
export const LOYALTY_TIER_BADGE_COLORS: Record<
  LoyaltyTier,
  { bg: string; text: string; border: string }
> = {
  bronze: {
    bg: "#F5E6DC",
    text: "#7C4A2D",
    border: "rgba(180, 83, 9, 0.35)",
  },
  silver: {
    bg: "#E8ECEF",
    text: "#475569",
    border: "rgba(148, 163, 184, 0.55)",
  },
  gold: {
    bg: "#FAEAA1",
    text: "#8F6B38",
    border: "rgba(179, 140, 74, 0.45)",
  },
};

export function loyaltyTierBadgeClassName(tier: LoyaltyTier): string {
  switch (tier) {
    case "gold":
      return "bg-[#FAEAA1] text-[#8F6B38] border-[#B38C4A]/40";
    case "silver":
      return "bg-slate-100 text-slate-700 border-slate-300";
    default:
      return "bg-orange-100 text-orange-900 border-orange-300/70";
  }
}
