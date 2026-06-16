/** Affichage style carte bancaire pour le numéro FID-XXXXXX */

/** 16 chiffres dérivés du numéro FID-XXXXXX */
export function loyaltyCardDigits16(cardNumber: string): string {
  const match = cardNumber.match(/^FID-(\d+)$/i);
  const raw = match ? match[1] : cardNumber.replace(/\D/g, "");
  return raw.slice(-16).padStart(16, "0");
}

export function formatLoyaltyCardNumber(cardNumber: string): string {
  const num = loyaltyCardDigits16(cardNumber);
  return num.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Chiffres très espacés style carte prestige : 0 0 0 0  0 0 0 0  0 0 0 1 */
export function formatLoyaltyCardNumberLuxury(cardNumber: string): string {
  const match = cardNumber.match(/^FID-(\d+)$/i);
  if (!match) return cardNumber;
  const digits = match[1].padStart(12, "0").split("");
  const groups = [
    digits.slice(0, 4).join(" "),
    digits.slice(4, 8).join(" "),
    digits.slice(8, 12).join(" "),
  ];
  return groups.join("   ");
}

export function formatMemberSince(isoDate: string): string {
  const d = new Date(isoDate);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

/** Format affichage carte : 06 / 26 */
export function formatMemberSinceLuxury(isoDate: string): string {
  const d = new Date(isoDate);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm} / ${yy}`;
}
