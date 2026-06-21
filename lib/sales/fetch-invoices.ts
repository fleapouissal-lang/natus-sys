import type { SupabaseClient } from "@supabase/supabase-js";
import { INVOICE_SALE_SELECT } from "@/lib/sales/invoice-select";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import type { Sale } from "@/lib/types";

const INVOICE_FETCH_LIMIT = 500;

export async function fetchInvoicesByStoreIds(
  supabase: SupabaseClient,
  storeIds: string[]
): Promise<{ sales: InvoiceSale[]; error: string | null }> {
  if (storeIds.length === 0) {
    return { sales: [], error: null };
  }

  const { data, error } = await supabase
    .from("sales")
    .select(INVOICE_SALE_SELECT)
    .in("store_id", storeIds)
    .order("created_at", { ascending: false })
    .limit(INVOICE_FETCH_LIMIT);

  if (error) {
    return { sales: [], error: error.message };
  }

  return { sales: (data || []) as InvoiceSale[], error: null };
}

export async function fetchInvoiceById(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ sale: InvoiceSale | null; error: string | null }> {
  const { data, error } = await supabase
    .from("sales")
    .select(INVOICE_SALE_SELECT)
    .eq("id", saleId)
    .maybeSingle();

  if (error) {
    return { sale: null, error: error.message };
  }

  return { sale: (data as InvoiceSale | null) ?? null, error: null };
}

export function invoiceTypeLabel(sale: Pick<Sale, "shopify_order_id">): string {
  return sale.shopify_order_id ? "Commande" : "Caisse";
}
