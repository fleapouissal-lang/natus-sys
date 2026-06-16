import type { LoyaltyCardVariant } from "@/lib/types";

export const LOYALTY_CARD_VARIANTS: {
  id: LoyaltyCardVariant;
  label: string;
  description: string;
}[] = [
  {
    id: "champagne",
    label: "Prestige Champagne",
    description: "Ivoire & bronze — recto seul",
  },
  {
    id: "noir",
    label: "Natus Noir",
    description: "Noir & or — style carte bancaire",
  },
  {
    id: "creme",
    label: "Natus Crème",
    description: "Bandeau doré, QR code & filigrane N",
  },
];

export function resolveLoyaltyCardVariant(
  variant: LoyaltyCardVariant | string | null | undefined
): LoyaltyCardVariant {
  if (variant === "noir") return "noir";
  if (variant === "creme") return "creme";
  return "champagne";
}

export function loyaltyCardVariantLabel(variant: LoyaltyCardVariant): string {
  return LOYALTY_CARD_VARIANTS.find((v) => v.id === variant)?.label ?? "Prestige Champagne";
}
