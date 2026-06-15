/** TVA marocaine — prix catalogue TTC */
export const TVA_RATE = 0.2;

export function computeTvaBreakdown(ttc: number) {
  const ht = ttc / (1 + TVA_RATE);
  const tva = ttc - ht;
  return { ht, tva, ttc };
}
