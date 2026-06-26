import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import type { PaymentMethod } from "@/lib/types";
import type { PublicCustomerInvoiceDetail } from "@/lib/loyalty/public";

export function publicInvoiceToDocumentData(
  invoice: PublicCustomerInvoiceDetail
): SaleDocumentData {
  const items = (invoice.items || []).map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
  }));

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return {
    saleId: invoice.id,
    total: Number(invoice.total),
    subtotal,
    loyaltyDiscount: Number(invoice.loyalty_discount) || undefined,
    proClientDiscount: Number(invoice.pro_client_discount) || undefined,
    promoCode: invoice.promo_code || undefined,
    promoDiscount: Number(invoice.promo_discount) || undefined,
    paymentMethod: invoice.payment_method as PaymentMethod,
    cashierName: invoice.cashier_name,
    items,
    createdAt: invoice.created_at,
    customerName: invoice.customer_name,
    storeName: invoice.store_name || undefined,
  };
}
