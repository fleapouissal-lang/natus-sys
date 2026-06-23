import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/loyalty/phone";
import { formatCurrency } from "@/lib/utils";
import type { CustomerNote, LoyaltyCustomer, ShopifyLineItemRow } from "@/lib/types";

export type CustomerNoteSource = CustomerNote["source"];

export function buildShopifyOrderNoteBody(input: {
  orderNumber: string;
  total: number;
  lineItems: ShopifyLineItemRow[];
  shippingAddress?: string | null;
  shopifyNote?: string | null;
}): string {
  const lines = [
    `Commande en ligne ${input.orderNumber}`,
    `Total : ${formatCurrency(input.total)}`,
  ];

  const products = (input.lineItems || [])
    .map((item) => `• ${item.title} × ${item.quantity}`)
    .join("\n");
  if (products) {
    lines.push("", "Produits :", products);
  }

  if (input.shippingAddress?.trim()) {
    lines.push("", `Livraison : ${input.shippingAddress.trim()}`);
  }

  const note = input.shopifyNote?.trim();
  if (note) {
    lines.push("", `Note client : ${note}`);
  }

  return lines.join("\n");
}

export async function findLoyaltyCustomerByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<LoyaltyCustomer | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as LoyaltyCustomer;
}

export async function appendCustomerNote(
  supabase: SupabaseClient,
  input: {
    customerId: string;
    body: string;
    source: CustomerNoteSource;
    shopifyOrderId?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Note vide" };

  const { error } = await supabase.from("customer_notes").insert({
    customer_id: input.customerId,
    shopify_order_id: input.shopifyOrderId ?? null,
    source: input.source,
    body,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function syncShopifyOrderNoteToLoyaltyCard(
  supabase: SupabaseClient,
  input: {
    shopifyOrderId: string;
    orderNumber: string;
    customerPhone: string;
    lineItems: ShopifyLineItemRow[];
    total: number;
    shippingAddress?: string | null;
    shopifyNote?: string | null;
  }
): Promise<{ linked: boolean; customerId?: string }> {
  const customer = await findLoyaltyCustomerByPhone(supabase, input.customerPhone);
  if (!customer) return { linked: false };

  await supabase
    .from("shopify_orders")
    .update({
      customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.shopifyOrderId)
    .is("customer_id", null);

  const body = buildShopifyOrderNoteBody({
    orderNumber: input.orderNumber,
    total: input.total,
    lineItems: input.lineItems,
    shippingAddress: input.shippingAddress,
    shopifyNote: input.shopifyNote,
  });

  await appendCustomerNote(supabase, {
    customerId: customer.id,
    shopifyOrderId: input.shopifyOrderId,
    source: "shopify_order",
    body,
  });

  return { linked: true, customerId: customer.id };
}

export async function syncCashierFollowUpNoteToLoyaltyCard(
  supabase: SupabaseClient,
  input: {
    shopifyOrderId: string;
    orderNumber: string;
    customerPhone?: string | null;
    customerId?: string | null;
    note: string;
    source?: Extract<CustomerNoteSource, "cashier_follow_up" | "whatsapp">;
  }
): Promise<void> {
  const trimmed = input.note.trim();
  if (!trimmed) return;

  let customerId = input.customerId ?? null;
  if (!customerId && input.customerPhone) {
    const customer = await findLoyaltyCustomerByPhone(supabase, input.customerPhone);
    customerId = customer?.id ?? null;
  }
  if (!customerId) return;

  const body = `[${input.orderNumber}] ${trimmed}`;

  await appendCustomerNote(supabase, {
    customerId,
    shopifyOrderId: input.shopifyOrderId,
    source: input.source ?? "cashier_follow_up",
    body,
  });
}

export async function getCustomerNotes(
  supabase: SupabaseClient,
  customerId: string,
  limit = 20
): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from("customer_notes")
    .select("id, customer_id, shopify_order_id, source, body, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as CustomerNote[];
}
