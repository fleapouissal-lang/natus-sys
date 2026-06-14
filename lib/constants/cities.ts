export const NATUS_CITIES = [
  "Marrakech",
  "Casablanca",
  "Rabat",
  "Fès",
  "Tanger",
  "Agadir",
] as const;

export type NatusCity = (typeof NATUS_CITIES)[number];
