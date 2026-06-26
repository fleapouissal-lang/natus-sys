import { createClient } from "@/lib/supabase/server";
import type { LoyaltyCustomer, LoyaltyTransaction, Profile } from "@/lib/types";
import { normalizeLoyaltyCardNumber } from "@/lib/loyalty/qr";
import { getCityFilter, isDirector, isManager } from "@/lib/permissions";
import {
  isValidLoyaltyQrToken,
  toPublicLoyaltyCustomer,
  toPublicLoyaltyTransactions,
  type PublicLoyaltyCustomer,
  type PublicLoyaltyTransaction,
} from "@/lib/loyalty/public";

export async function getCustomerByPhone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  phone: string
): Promise<LoyaltyCustomer | null> {
  const { normalizePhone } = await import("@/lib/loyalty/phone");
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", normalized)
    .maybeSingle();

  if (error) return null;
  return data as LoyaltyCustomer | null;
}

export async function getCustomerByCardOrToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string
): Promise<LoyaltyCustomer | null> {
  const isCard = /^FID-?\d+$/i.test(identifier);
  const column = isCard ? "card_number" : "qr_token";
  const value = isCard
    ? normalizeLoyaltyCardNumber(identifier.replace(/^FID-?/i, "FID-"))
    : identifier;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq(column, value)
    .maybeSingle();

  if (error) return null;
  return data as LoyaltyCustomer | null;
}

export async function getCustomerTransactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  limit = 20
): Promise<LoyaltyTransaction[]> {
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as LoyaltyTransaction[];
}

export async function canStaffAccessLoyaltyCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: Profile,
  customer: Pick<LoyaltyCustomer, "store_id">
): Promise<boolean> {
  if (isDirector(profile)) return true;

  if (isManager(profile)) {
    const city = getCityFilter(profile);
    if (!city) return false;
    if (!customer.store_id) return true;

    const { data: store } = await supabase
      .from("stores")
      .select("city")
      .eq("id", customer.store_id)
      .maybeSingle();

    return store?.city === city;
  }

  return false;
}

export async function getLoyaltyCustomerForStaff(
  profile: Profile,
  customerId: string
): Promise<{ customer: LoyaltyCustomer; transactions: LoyaltyTransaction[]; notes: import("@/lib/types").CustomerNote[] } | null> {
  const supabase = await createClient();

  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customer) return null;

  const allowed = await canStaffAccessLoyaltyCustomer(
    supabase,
    profile,
    customer as LoyaltyCustomer
  );
  if (!allowed) return null;

  const transactions = await getCustomerTransactions(supabase, customer.id, 50);
  const { getCustomerNotes } = await import("@/lib/loyalty/customer-notes");
  const notes = await getCustomerNotes(supabase, customer.id, 30);

  return {
    customer: customer as LoyaltyCustomer,
    transactions,
    notes,
  };
}

export async function getPublicLoyaltyCustomer(
  qrToken: string
): Promise<
  | {
      customer: PublicLoyaltyCustomer;
      transactions: PublicLoyaltyTransaction[];
    }
  | null
> {
  if (!isValidLoyaltyQrToken(qrToken)) return null;

  const supabase = await createClient();

  const { data: cardRows, error: cardError } = await supabase.rpc("get_public_loyalty_card", {
    p_token: qrToken,
  });

  if (cardError || !cardRows?.length) return null;

  const row = cardRows[0] as PublicLoyaltyCustomer & { card_variant?: string | null };

  const { data: txRows, error: txError } = await supabase.rpc(
    "get_public_loyalty_transactions",
    {
      p_token: qrToken,
      p_limit: 30,
    }
  );

  if (txError) return null;

  return {
    customer: {
      id: row.id,
      full_name: row.full_name,
      card_number: row.card_number,
      loyalty_points: row.loyalty_points,
      qr_token: row.qr_token,
      card_variant: (row.card_variant ?? "champagne") as PublicLoyaltyCustomer["card_variant"],
      created_at: row.created_at,
      is_pro_client: Boolean(row.is_pro_client),
      pro_client_active: Boolean(row.pro_client_active),
      pro_client_type: (row.pro_client_type as PublicLoyaltyCustomer["pro_client_type"]) ?? null,
      company_name: row.company_name ?? null,
    },
    transactions: toPublicLoyaltyTransactions(
      (txRows || []) as LoyaltyTransaction[]
    ),
  };
}

export async function getPublicCustomerInvoices(
  qrToken: string,
  limit = 20
): Promise<import("@/lib/loyalty/public").PublicCustomerInvoice[]> {
  if (!isValidLoyaltyQrToken(qrToken)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_customer_invoices", {
    p_token: qrToken,
    p_limit: limit,
  });

  if (error || !data) return [];

  return (Array.isArray(data) ? data : []) as import("@/lib/loyalty/public").PublicCustomerInvoice[];
}

export async function getPublicCustomerInvoice(
  qrToken: string,
  saleId: string
): Promise<import("@/lib/loyalty/public").PublicCustomerInvoiceDetail | null> {
  if (!isValidLoyaltyQrToken(qrToken)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_customer_invoice", {
    p_token: qrToken,
    p_sale_id: saleId,
  });

  if (error || !data) return null;
  return data as import("@/lib/loyalty/public").PublicCustomerInvoiceDetail;
}
