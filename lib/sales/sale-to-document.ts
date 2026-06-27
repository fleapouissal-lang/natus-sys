import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import {
  saleInvoiceCustomerName,
  saleInvoiceCustomerPhone,
  saleInvoiceCustomerEmail,
  saleInvoiceCustomerIce,
} from "@/lib/sales/invoice-customer";
import type { Sale } from "@/lib/types";

export type InvoiceSale = Sale & {
  shopify_orders?: { order_number: string } | null;
};

export function saleToDocumentData(sale: InvoiceSale): SaleDocumentData {
  const items = (sale.sale_items || []).map((item) => ({
    name: item.products?.name || "Article",
    quantity: item.quantity,
    unitPrice: Number(item.unit_price),
  }));

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return {
    saleId: sale.id,
    total: Number(sale.total),
    subtotal,
    loyaltyDiscount: Number(sale.loyalty_discount) || undefined,
    proClientDiscount: Number(sale.pro_client_discount) || undefined,
    promoCode: sale.promo_code || undefined,
    promoDiscount: Number(sale.promo_discount) || undefined,
    pointsEarned: sale.loyalty_points_earned || undefined,
    pointsRedeemed: sale.loyalty_points_redeemed || undefined,
    loyaltyCardNumber: sale.customers?.card_number,
    paymentMethod: sale.payment_method,
    cashierName:
      sale.profiles?.full_name || sale.profiles?.email || "—",
    items,
    createdAt: sale.created_at,
    shopifyOrderNumber: sale.shopify_orders?.order_number,
    customerName: saleInvoiceCustomerName(sale),
    customerPhone: saleInvoiceCustomerPhone(sale) || undefined,
    customerEmail: saleInvoiceCustomerEmail(sale) || undefined,
    customerIce: saleInvoiceCustomerIce(sale) || undefined,
    storeName: sale.stores?.name || undefined,
  };
}
