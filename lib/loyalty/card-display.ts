/** Affichage style carte bancaire pour le numéro FID-XXXXXX */

const NATUS_CARD_BIN = "629101";

function extractFidSequence(cardNumber: string): number {
  const match = cardNumber.match(/^FID-(\d+)$/i);
  if (match) return parseInt(match[1], 10) || 0;
  const digits = cardNumber.replace(/\D/g, "");
  return parseInt(digits.slice(-6), 10) || 0;
}

function luhnCheckDigit(digitsWithoutCheck: string): string {
  let sum = 0;
  let doubleDigit = false;
  for (let i = digitsWithoutCheck.length - 1; i >= 0; i--) {
    let digit = Number(digitsWithoutCheck[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return String((10 - (sum % 10)) % 10);
}

/** 16 chiffres affichés style carte bancaire, dérivés de FID-XXXXXX */
export function loyaltyCardDigits16(cardNumber: string): string {
  const seq = extractFidSequence(cardNumber);
  const mixed = String((seq * 16807) % 1_000_000_000).padStart(9, "0");
  const partial = NATUS_CARD_BIN + mixed;
  return partial + luhnCheckDigit(partial);
}

export function formatLoyaltyCardNumber(cardNumber: string): string {
  const num = loyaltyCardDigits16(cardNumber);
  return num.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Chiffres très espacés style carte prestige */
export function formatLoyaltyCardNumberLuxury(cardNumber: string): string {
  const num = loyaltyCardDigits16(cardNumber);
  const groups = [
    num.slice(0, 4).split("").join(" "),
    num.slice(4, 8).split("").join(" "),
    num.slice(8, 12).split("").join(" "),
    num.slice(12, 16).split("").join(" "),
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

/** Date d'expiration affichée sur le recto (2 ans après adhésion) */
export function formatLoyaltyCardExpiry(isoDate: string): string {
  const d = new Date(isoDate);
  d.setFullYear(d.getFullYear() + 2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm} / ${yy}`;
}
