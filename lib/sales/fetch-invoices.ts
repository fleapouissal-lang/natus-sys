import type { SupabaseClient } from "@supabase/supabase-js";
import { INVOICE_SALE_SELECT, INVOICE_SALE_SELECT_BASE } from "@/lib/sales/invoice-select";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import type { Sale } from "@/lib/types";

const INVOICE_FETCH_LIMIT = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSaleLookupId(raw: string): string {
  return raw.trim();
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function fetchInvoicesByStoreIds(
  supabase: SupabaseClient,
  storeIds: string[],
  options?: { includePending?: boolean; createdAfter?: string }
): Promise<{ sales: InvoiceSale[]; error: string | null }> {
  if (storeIds.length === 0) {
    return { sales: [], error: null };
  }

  let query = supabase
    .from("sales")
    .select(INVOICE_SALE_SELECT)
    .in("store_id", storeIds);

  if (!options?.includePending) {
    query = query.not("invoice_validated_at", "is", null);
  }

  if (options?.createdAfter) {
    query = query.gte("created_at", options.createdAfter);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(INVOICE_FETCH_LIMIT);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as InvoiceSale[], error: null };
}

async function attachShopifyOrderNumbers(
  supabase: SupabaseClient,
  sale: InvoiceSale
): Promise<InvoiceSale> {
  if (!sale.shopify_order_id || sale.shopify_orders?.order_number) {
    return sale;
  }

  const { data } = await supabase
    .from("shopify_orders")
    .select("order_number")
    .eq("id", sale.shopify_order_id)
    .maybeSingle();

  if (!data?.order_number) {
    return sale;
  }

  return {
    ...sale,
    shopify_orders: { order_number: data.order_number },
  };
}

export async function fetchInvoiceById(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ sale: InvoiceSale | null; error: string | null }> {
  const lookup = normalizeSaleLookupId(saleId);
  if (!lookup) {
    return { sale: null, error: "Identifiant facture manquant" };
  }

  async function querySale(select: string) {
    let builder = supabase.from("sales").select(select);

    if (isUuid(lookup)) {
      builder = builder.eq("id", lookup);
    } else {
      builder = builder.ilike("id", `${lookup.toLowerCase()}%`);
    }

    return builder.maybeSingle();
  }

  let { data, error } = await querySale(INVOICE_SALE_SELECT);

  if (error) {
    const fallback = await querySale(INVOICE_SALE_SELECT_BASE);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return { sale: null, error: error.message };
  }

  if (!data) {
    return { sale: null, error: null };
  }

  const sale = await attachShopifyOrderNumbers(supabase, data as unknown as InvoiceSale);
  return { sale, error: null };
}

export function invoiceTypeLabel(sale: Pick<Sale, "shopify_order_id">): string {
  return sale.shopify_order_id ? "Commande" : "Caisse";
}
