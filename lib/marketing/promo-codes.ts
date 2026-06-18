import { createAdminClient } from "@/lib/supabase/admin";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WINBACK_PROMO_TTL_MS = 24 * 60 * 60 * 1000;

function randomSegment(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export type WinbackPromoCode = {
  code: string;
  expiresAt: string;
};

export async function createUniqueWinbackPromoCode(
  customerId: string,
  storeId: string
): Promise<WinbackPromoCode | null> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + WINBACK_PROMO_TTL_MS).toISOString();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `NATUS-${randomSegment(6)}`;
    const { data, error } = await admin
      .from("winback_promo_codes")
      .insert({
        code,
        customer_id: customerId,
        store_id: storeId,
        expires_at: expiresAt,
      })
      .select("code, expires_at")
      .single();

    if (!error && data) {
      return { code: data.code, expiresAt: data.expires_at };
    }

    if (error && !error.message.includes("unique") && !error.message.includes("duplicate")) {
      console.error("[promo] create:", error.message);
      return null;
    }
  }

  return null;
}

export function formatPromoExpiryFr(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}
