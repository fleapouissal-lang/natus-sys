/** Détecte si la saisie caisse ressemble à un code promo (vs téléphone / carte). */
export function looksLikePromoCode(input: string): boolean {
  const raw = input.trim();
  if (!raw || raw.length < 4) return false;

  if (/^0\d{9}$/.test(raw)) return false;
  if (/^\+?212\d{8,9}$/.test(raw.replace(/\s/g, ""))) return false;
  if (/^FID-/i.test(raw)) return false;
  if (raw.includes(":")) return false;

  const t = raw.toUpperCase();
  if (/^NATUS-[A-Z0-9]{4,10}$/.test(t)) return true;
  if (/^[A-Z][A-Z0-9]{3,11}$/.test(t) && /[A-Z]/.test(t) && /\d/.test(t)) return true;

  return false;
}
