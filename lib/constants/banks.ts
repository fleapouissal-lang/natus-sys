/** Principales banques marocaines pour saisie chèque en caisse. */
export const MOROCCAN_BANKS = [
  "Attijariwafa bank",
  "Banque Populaire",
  "CIH Bank",
  "BMCE Bank of Africa",
  "Crédit Agricole du Maroc",
  "Société Générale Maroc",
  "Al Barid Bank",
  "Crédit du Maroc",
  "BMCI",
  "CFG Bank",
  "Umnia Bank",
  "Bank Assafa",
  "Arab Bank Maroc",
  "Bank Al Yousr",
  "Bank of Africa",
  "CDG Capital",
  "Wafa Assurance — Banque",
  "Autre",
] as const;

export type MoroccanBank = (typeof MOROCCAN_BANKS)[number];
