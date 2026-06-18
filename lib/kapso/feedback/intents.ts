/** Client écrit « réclamation » / « plainte » sans détail (souvent avant le msg auto 2h). */
export function isReclamationIntent(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;

  return (
    /\b(r[eé]clamation|r[eé]clam|plainte?s?)\b/i.test(t) ||
    /\b(bghit|bghiti|ndir|dir|bghina)\b.*\b(r[eé]clamation|plainte|mochkil)\b/i.test(t) ||
    /\b(je\s+(veux|voudrais)|j'?aimerais)\b.*\b(r[eé]clamation|plainte)\b/i.test(t) ||
    /^(mochkil|probl[eè]me|probleme)$/i.test(t) ||
    /^(réclamation|reclamation|réclam|reclam)$/i.test(t)
  );
}

/** Message court = intention seule → on demande « quelle est votre réclamation ? » */
export function isReclamationIntentOnly(text: string): boolean {
  if (!isReclamationIntent(text)) return false;
  const trimmed = text.trim();
  if (trimmed.length <= 50) return true;
  return false;
}

/** Texte assez long avec intention = réclamation déjà décrite */
export function isReclamationWithDetail(text: string): boolean {
  return isReclamationIntent(text) && text.trim().length > 50;
}
