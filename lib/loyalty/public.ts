import type { LoyaltyCardVariant, LoyaltyCustomer, LoyaltyTransaction } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidLoyaltyQrToken(token: string): boolean {
  return UUID_RE.test(token.trim());
}

/** Données visibles sur la page publique /carte — sans PII sensible */
export type PublicLoyaltyCustomer = Pick<
  LoyaltyCustomer,
  | "id"
  | "full_name"
  | "card_number"
  | "loyalty_points"
  | "qr_token"
  | "card_variant"
  | "created_at"
>;

export function toPublicLoyaltyCustomer(
  row: PublicLoyaltyCustomer
): LoyaltyCustomer {
  return {
    ...row,
    card_variant: (row.card_variant ?? "champagne") as LoyaltyCardVariant,
    phone: "",
    email: null,
    store_id: null,
    apple_wallet_pass_id: null,
    google_wallet_pass_id: null,
    updated_at: row.created_at,
  };
}

export type PublicLoyaltyTransaction = Pick<
  LoyaltyTransaction,
  "id" | "type" | "points" | "description" | "created_at"
>;

export function toPublicLoyaltyTransactions(
  rows: Array<
    LoyaltyTransaction & {
      customer_id?: string;
      sale_id?: string | null;
      created_by?: string | null;
    }
  >
): PublicLoyaltyTransaction[] {
  return rows.map(({ id, type, points, description, created_at }) => ({
    id,
    type,
    points,
    description,
    created_at,
  }));
}
