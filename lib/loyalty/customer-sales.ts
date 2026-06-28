import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import type { PaymentMethod } from "@/lib/types";

export type CustomerSaleSummary = {
  id: string;
  total: number;
  created_at: string;
  payment_method: string;
  store_name: string | null;
  cancelled_at: string | null;
  invoice_validated_at: string | null;
  pro_client_discount: number;
};

export type CustomerSaleDetail = {
  id: string;
  total: number;
  created_at: string;
  payment_method: string;
  loyalty_discount: number;
  pro_client_discount: number;
  promo_discount: number;
  promo_code: string | null;
  customer_name: string;
  store_name: string | null;
  cashier_name: string;
  cancelled_at: string | null;
  invoice_validated_at: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
};

export function customerOrderToDocumentData(order: CustomerSaleDetail): SaleDocumentData {
  const items = (order.items || []).map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
  }));

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return {
    saleId: order.id,
    total: Number(order.total),
    subtotal,
    loyaltyDiscount: Number(order.loyalty_discount) || undefined,
    proClientDiscount: Number(order.pro_client_discount) || undefined,
    promoCode: order.promo_code || undefined,
    promoDiscount: Number(order.promo_discount) || undefined,
    paymentMethod: order.payment_method as PaymentMethod,
    cashierName: order.cashier_name,
    items,
    createdAt: order.created_at,
    customerName: order.customer_name,
    storeName: order.store_name || undefined,
  };
}
