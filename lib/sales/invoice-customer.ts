import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import type { Sale } from "@/lib/types";

export function saleInvoiceCustomerName(sale: Pick<Sale, "customer_name" | "customers">): string {
  const stored = sale.customer_name?.trim();
  if (stored) return stored;
  return sale.customers?.full_name?.trim() || INVOICE_CLIENT_DIVERS;
}

export function saleInvoiceCustomerPhone(sale: Pick<Sale, "customer_phone" | "customers">): string | null {
  return sale.customer_phone?.trim() || sale.customers?.phone?.trim() || null;
}
