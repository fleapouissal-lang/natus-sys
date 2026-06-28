import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Sale } from "@/lib/types";
import { isValidLoyaltyQrToken } from "@/lib/loyalty/public";
import { SALE_HISTORY_SELECT } from "@/lib/sales/sale-select";
import type { CustomerSaleDetail, CustomerSaleSummary } from "@/lib/loyalty/customer-sales";

function mapOrderRow(row: Record<string, unknown>): CustomerSaleSummary {
  return {
    id: String(row.id),
    total: Number(row.total),
    created_at: String(row.created_at),
    payment_method: String(row.payment_method),
    store_name: (row.store_name as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    invoice_validated_at: (row.invoice_validated_at as string | null) ?? null,
    pro_client_discount: Number(row.pro_client_discount) || 0,
  };
}

export async function getCustomerSalesForStaff(
  customerId: string,
  limit = 50
): Promise<CustomerSaleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, total, created_at, payment_method, cancelled_at, invoice_validated_at, pro_client_discount, stores(name)"
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCustomerSalesForStaff:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
    return mapOrderRow({
      id: row.id,
      total: row.total,
      created_at: row.created_at,
      payment_method: row.payment_method,
      cancelled_at: row.cancelled_at,
      invoice_validated_at: row.invoice_validated_at,
      pro_client_discount: row.pro_client_discount,
      store_name: (store as { name?: string } | null)?.name ?? null,
    });
  });
}

export async function getCustomerSaleForStaff(
  customerId: string,
  saleId: string
): Promise<Sale | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_HISTORY_SELECT)
    .eq("id", saleId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Sale;
}

export async function getPublicCustomerOrders(
  qrToken: string,
  limit = 30
): Promise<CustomerSaleSummary[]> {
  if (!isValidLoyaltyQrToken(qrToken)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_customer_orders", {
    p_token: qrToken,
    p_limit: limit,
  });

  if (error || !data) {
    if (error) console.error("getPublicCustomerOrders:", error.message);
    return [];
  }

  return (Array.isArray(data) ? data : []).map((row) =>
    mapOrderRow(row as Record<string, unknown>)
  );
}

export async function getPublicCustomerOrderDetail(
  qrToken: string,
  saleId: string
): Promise<CustomerSaleDetail | null> {
  if (!isValidLoyaltyQrToken(qrToken)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_customer_order", {
    p_token: qrToken,
    p_sale_id: saleId,
  });

  if (error || !data) {
    if (error) console.error("getPublicCustomerOrderDetail:", error.message);
    return null;
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    total: Number(row.total),
    created_at: String(row.created_at),
    payment_method: String(row.payment_method),
    loyalty_discount: Number(row.loyalty_discount) || 0,
    pro_client_discount: Number(row.pro_client_discount) || 0,
    promo_discount: Number(row.promo_discount) || 0,
    promo_code: (row.promo_code as string | null) ?? null,
    customer_name: String(row.customer_name || ""),
    store_name: (row.store_name as string | null) ?? null,
    cashier_name: String(row.cashier_name || "Natus"),
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    invoice_validated_at: (row.invoice_validated_at as string | null) ?? null,
    items: Array.isArray(row.items)
      ? (row.items as { name: string; quantity: number; unit_price: number }[])
      : [],
  };
}
