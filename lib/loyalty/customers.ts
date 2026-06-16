import { createClient } from "@/lib/supabase/server";
import type { LoyaltyCustomer, LoyaltyTransaction } from "@/lib/types";
import { normalizeLoyaltyCardNumber } from "@/lib/loyalty/qr";

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

export async function getPublicLoyaltyCustomer(
  qrToken: string
): Promise<
  | {
      customer: LoyaltyCustomer;
      transactions: LoyaltyTransaction[];
    }
  | null
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_loyalty_customer_by_qr_token", {
    p_token: qrToken,
  });

  if (error || !data) return null;

  const customer = data as LoyaltyCustomer;
  const transactions = await getCustomerTransactions(supabase, customer.id, 15);
  return { customer, transactions };
}
