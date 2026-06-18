import type { BotLanguage } from "@/lib/kapso/whatsapp-bot/language";

const STAR_CHARS = /[⭐★🌟]/g;

export function formatStarRating(rating: number): string {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return `${"⭐".repeat(n)} (${n}/5)`;
}

/** Le client a envoyé une note explicite (étoiles ou chiffre 1–5). */
export function hasExplicitStarRating(text: string): boolean {
  return parseRatingFromText(text) !== null;
}

export function isWhatsAppReviewIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t || t.length < 1) return false;

  const reclamation =
    /\b(r[eé]clamation|r[eé]clam|plainte|mochkil|probl[eè]me)\b/i.test(t);
  if (reclamation) return false;

  return hasExplicitStarRating(text);
}

/** Retourne la note envoyée par le client, ou null si aucune note explicite. */
export function parseRatingFromText(text: string): number | null {
  const t = text.trim();
  if (!t) return null;

  const slashMatch = t.match(/\b([1-5])\s*\/\s*5\b/);
  if (slashMatch) return Number(slashMatch[1]);

  const starMatch = t.match(/\b([1-5])\s*(?:étoile|etoile|star|stars|njma|njoum)\b/i);
  if (starMatch) return Number(starMatch[1]);

  const stars = (t.match(STAR_CHARS) || []).length;
  if (stars >= 1 && stars <= 5) return stars;

  if (/^[1-5]$/.test(t)) return Number(t);

  return null;
}

export function askStarRatingMessage(lang: BotLanguage): string {
  if (lang === "darija") {
    return [
      "Shukran ! Bach nsjl avis dyalek, 3tina note b ⭐ :",
      "",
      "⭐ = 1 njma",
      "⭐⭐⭐ = 3 njoum",
      "⭐⭐⭐⭐⭐ = 5 njoum",
    ].join("\n");
  }

  return [
    "Merci ! Pour enregistrer votre avis, envoyez votre note en étoiles :",
    "",
    "⭐ = 1 étoile",
    "⭐⭐⭐ = 3 étoiles",
    "⭐⭐⭐⭐⭐ = 5 étoiles",
  ].join("\n");
}
