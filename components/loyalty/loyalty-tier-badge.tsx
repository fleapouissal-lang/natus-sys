import { cn } from "@/lib/utils";
import {
  loyaltyTierBadgeClassName,
  loyaltyTierLabel,
} from "@/lib/loyalty/tiers";
import type { LoyaltyTier } from "@/lib/types";

export function LoyaltyTierBadge({
  tier,
  className,
  compact = false,
}: {
  tier: LoyaltyTier;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 font-semibold uppercase tracking-wide",
        compact ? "text-[10px]" : "text-xs",
        loyaltyTierBadgeClassName(tier),
        className
      )}
    >
      {loyaltyTierLabel(tier)}
    </span>
  );
}
