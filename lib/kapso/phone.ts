import { normalizePhone } from "@/lib/loyalty/phone";

/** Numéro E.164 sans « + » pour l’API WhatsApp / Kapso. */
export function toWhatsAppRecipient(phone: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 9 ? digits : null;
}
