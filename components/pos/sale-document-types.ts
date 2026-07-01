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
  invoiceNumber?: number | null;
}

/** Numero de facture sequentiel formate sur 6 chiffres (ex: 000123). */
export function formatInvoiceNumber(invoiceNumber: number): string {
  return String(invoiceNumber).padStart(6, "0");
}

/**
 * Numero de document affiche : numero de facture sequentiel si la facture est
 * validee, sinon repli sur le prefixe de l'UUID de la vente (ticket non valide).
 */
export function saleDocumentNumber(
  saleId: string,
  invoiceNumber?: number | null
): string {
  if (invoiceNumber != null) {
    return formatInvoiceNumber(invoiceNumber);
  }
  return saleId.slice(0, 8).toUpperCase();
}
