import { isKapsoSandboxMode } from "@/lib/kapso/config";
import { toWhatsAppRecipient } from "@/lib/kapso/phone";

export function resolveKapsoRecipient(customerPhone: string): string | null {
  if (isKapsoSandboxMode()) {
    const override = process.env.KAPSO_SANDBOX_OVERRIDE_TO?.trim();
    if (override) return toWhatsAppRecipient(override);
  }
  return toWhatsAppRecipient(customerPhone);
}

/** Numéro entrant webhook → clé session (digits WhatsApp). */
export function inboundPhoneKey(from: string): string | null {
  return toWhatsAppRecipient(from);
}
