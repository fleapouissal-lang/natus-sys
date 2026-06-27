import type { PaymentMethod } from "@/lib/types";

export interface SaleDocumentData {
  saleId: string;
  total: number;
  subtotal?: number;
  loyaltyDiscount?: number;
  proClientDiscount?: number;
  promoCode?: string;
  promoDiscount?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  loyaltyCardNumber?: string;
  paymentMethod: PaymentMethod;
  cashierName: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
  createdAt: string;
  shopifyOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerIce?: string;
  paymentLabel?: string;
  storeName?: string;
}

export function saleDocumentNumber(saleId: string): string {
  return saleId.slice(0, 8).toUpperCase();
}
