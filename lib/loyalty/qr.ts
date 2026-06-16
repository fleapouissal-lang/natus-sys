const QR_PREFIX = "NATUS:LOYALTY:";

export function buildLoyaltyQrPayload(qrToken: string): string {
  return `${QR_PREFIX}${qrToken}`;
}

export function parseLoyaltyQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith(QR_PREFIX)) {
    return trimmed.slice(QR_PREFIX.length);
  }
  if (/^FID-\d{6}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return null;
}

/** Valeur encodée dans le code-barres carte fidélité */
export function loyaltyCardBarcodeValue(cardNumber: string): string {
  return cardNumber.toUpperCase();
}

export function loyaltyCardPublicUrl(qrToken: string, baseUrl?: string): string {
  const origin =
    baseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "";
  return `${origin.replace(/\/$/, "")}/carte/${qrToken}`;
}
