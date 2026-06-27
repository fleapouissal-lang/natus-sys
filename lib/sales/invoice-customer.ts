import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import type { Sale } from "@/lib/types";

export type SaleInvoiceClientProfile = "pro" | "fidele" | "passager";

const CLIENT_PROFILE_LABELS: Record<SaleInvoiceClientProfile, string> = {
  pro: "Pro",
  fidele: "Fidèle",
  passager: "Passager",
};

export function saleInvoiceClientProfile(
  sale: Pick<Sale, "customer_id" | "customers">
): SaleInvoiceClientProfile {
  if (sale.customers?.is_pro_client) return "pro";
  if (sale.customer_id || sale.customers?.card_number) return "fidele";
  return "passager";
}

export function saleInvoiceClientProfileLabel(
  sale: Pick<Sale, "customer_id" | "customers">
): string {
  return CLIENT_PROFILE_LABELS[saleInvoiceClientProfile(sale)];
}

export function saleInvoiceCustomerName(sale: Pick<Sale, "customer_name" | "customers">): string {
  const stored = sale.customer_name?.trim();
  if (stored) return stored;
  return sale.customers?.full_name?.trim() || INVOICE_CLIENT_DIVERS;
}

export function saleInvoiceCustomerPhone(sale: Pick<Sale, "customer_phone" | "customers">): string | null {
  return sale.customer_phone?.trim() || sale.customers?.phone?.trim() || null;
}

export function saleInvoiceCustomerEmail(
  sale: Pick<Sale, "customer_email" | "customers"> & {
    customers?: { email?: string | null } | null;
  }
): string | null {
  return sale.customer_email?.trim() || sale.customers?.email?.trim() || null;
}

export function saleInvoiceCustomerIce(sale: Pick<Sale, "customer_ice">): string | null {
  return sale.customer_ice?.trim() || null;
}
