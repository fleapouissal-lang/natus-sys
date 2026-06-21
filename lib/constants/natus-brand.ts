/** Palette crème / or — alignée carte fidélité modèle crème. */
export const NATUS_BRAND = {
  gold: "#B38C4A",
  goldDeep: "#8F6B38",
  goldLight: "#C9A066",
  cream: "#FFF6EC",
  creamSoft: "#FFFDF9",
  ink: "#4A443F",
  inkSoft: "#6B635C",
  border: "rgba(179,140,74,0.28)",
  borderSoft: "rgba(179,140,74,0.15)",
} as const;

export const NATUS_BRAND_GRADIENTS = {
  goldStrip: `linear-gradient(165deg, ${NATUS_BRAND.goldLight} 0%, ${NATUS_BRAND.gold} 42%, ${NATUS_BRAND.goldDeep} 100%)`,
  creamBg: `radial-gradient(ellipse 120% 90% at 88% 8%, rgba(179,140,74,0.07) 0%, transparent 55%), linear-gradient(180deg, ${NATUS_BRAND.creamSoft} 0%, ${NATUS_BRAND.cream} 100%)`,
} as const;

export const NATUS_BRAND_SERIF = "Georgia, 'Times New Roman', Times, serif";
