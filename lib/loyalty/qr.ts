import { publicSubdomainOrigin } from "@/lib/public-subdomain";

const QR_PREFIX = "NATUS:LOYALTY:";

export function normalizeLoyaltyCardNumber(cardNumber: string): string {
  const trimmed = cardNumber.trim().toUpperCase();
  const match = trimmed.match(/^FID-(\d+)$/i);
  if (!match) return trimmed;
  return `FID-${match[1].padStart(6, "0")}`;
}

export function buildLoyaltyQrPayload(qrToken: string): string {
  return `${QR_PREFIX}${qrToken}`;
}

export function parseLoyaltyQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (upper.startsWith(QR_PREFIX)) {
    return trimmed.slice(QR_PREFIX.length);
  }
  const fidMatch = trimmed.match(/^FID-?(\d+)$/i);
  if (fidMatch) {
    return normalizeLoyaltyCardNumber(`FID-${fidMatch[1]}`);
  }
  const carteToken = extractLoyaltyCarteToken(trimmed);
  if (carteToken) return carteToken;
  return null;
}

/** Token extrait d'une URL publique …/carte/{token} */
export function extractLoyaltyCarteToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.includes("/carte/")) return null;

  try {
    const path = trimmed.includes("://") ? new URL(trimmed).pathname : trimmed;
    const match = path.match(/\/carte\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  } catch {
    const match = trimmed.match(/\/carte\/([0-9a-f-]{36})/i);
    return match ? match[1] : null;
  }
}

/** Valeur encodée dans le code-barres carte fidélité */
export function loyaltyCardBarcodeValue(cardNumber: string): string {
  return normalizeLoyaltyCardNumber(cardNumber);
}

/** Payload court pour QR caisse — même valeur que le code-barres */
export function loyaltyCardScanPayload(cardNumber: string): string {
  return loyaltyCardBarcodeValue(cardNumber);
}

/**
 * URL publique de l'espace client (/carte/{token}).
 * Les clients Pro sont servis sur le sous-domaine `pro.*`, les clients
 * fidélité sur `loyalty.*`.
 */
export function customerCardUrl(
  qrToken: string,
  isProClient: boolean,
  baseUrl?: string
): string {
  const origin = publicSubdomainOrigin(isProClient ? "pro" : "loyalty", baseUrl);
  return `${origin.replace(/\/$/, "")}/carte/${qrToken}`;
}

export function loyaltyCardPublicUrl(qrToken: string, baseUrl?: string): string {
  return customerCardUrl(qrToken, false, baseUrl);
}
