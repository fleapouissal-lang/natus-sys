import type { LoyaltyCardVariant } from "@/lib/types";

export const LOYALTY_CARD_VARIANTS: {
  id: LoyaltyCardVariant;
  label: string;
  description: string;
}[] = [
  {
    id: "champagne",
    label: "Prestige Champagne",
    description: "Ivoire & bronze — carte à tampons",
  },
  {
    id: "noir",
    label: "Natus Noir",
    description: "Noir & or — style carte bancaire",
  },
];

export function resolveLoyaltyCardVariant(
  variant: LoyaltyCardVariant | string | null | undefined
): LoyaltyCardVariant {
  if (variant === "noir") return "noir";
  return "champagne";
}

export function loyaltyCardVariantLabel(variant: LoyaltyCardVariant): string {
  return LOYALTY_CARD_VARIANTS.find((v) => v.id === variant)?.label ?? "Prestige Champagne";
}
