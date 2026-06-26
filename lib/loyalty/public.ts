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
  | "is_pro_client"
  | "pro_client_active"
  | "pro_client_type"
  | "company_name"
>;

export type PublicCustomerInvoice = {
  id: string;
  total: number;
  created_at: string;
  payment_method: string;
  store_name: string | null;
  cancelled_at: string | null;
};

export type PublicCustomerInvoiceDetail = {
  id: string;
  total: number;
  created_at: string;
  payment_method: string;
  loyalty_discount: number;
  pro_client_discount: number;
  promo_discount: number;
  promo_code: string | null;
  customer_name: string;
  store_name: string | null;
  cashier_name: string;
  cancelled_at: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
};

export function toPublicLoyaltyCustomer(
  row: PublicLoyaltyCustomer
): LoyaltyCustomer {
  return {
    ...row,
    card_variant: (row.card_variant ?? "champagne") as LoyaltyCardVariant,
    phone: "",
    email: null,
    store_id: null,
    is_pro_client: row.is_pro_client ?? false,
    pro_client_active: row.pro_client_active ?? false,
    pro_client_type: row.pro_client_type ?? null,
    company_name: row.company_name ?? null,
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
