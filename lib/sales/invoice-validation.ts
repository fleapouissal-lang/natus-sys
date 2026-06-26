import type { Sale } from "@/lib/types";

export function isSaleInvoiceValidated(
  sale: Pick<Sale, "invoice_validated_at">
): boolean {
  return Boolean(sale.invoice_validated_at);
}
