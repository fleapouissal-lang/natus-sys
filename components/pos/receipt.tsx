"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import { computeTvaBreakdown, TVA_RATE } from "@/lib/constants/sales";
import type { PaymentMethod } from "@/lib/types";

export interface ReceiptData {
  saleId: string;
  total: number;
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
  paymentLabel?: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
};

export function Receipt({ data }: { data: ReceiptData }) {
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);

  return (
    <div id="receipt-print" className="receipt mx-auto w-[280px] bg-white p-4 text-black">
      <div className="text-center">
        <p className="text-lg font-bold tracking-wide">natus</p>
        <p className="text-[10px] tracking-[0.3em] text-gray-600">MARRAKECH</p>
        <p className="mt-2 text-xs text-gray-500">{PRODUCT_BRAND} Cosmétiques</p>
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-1 text-xs">
        <p>Ticket : #{data.saleId.slice(0, 8).toUpperCase()}</p>
        {data.shopifyOrderNumber && (
          <p>Commande web : {data.shopifyOrderNumber}</p>
        )}
        {data.customerName && <p>Client : {data.customerName}</p>}
        <p>Date : {formatDate(data.createdAt)}</p>
        <p>Caissier : {data.cashierName}</p>
        <p>Paiement : {data.paymentLabel ?? PAYMENT_LABELS[data.paymentMethod]}</p>
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-2 text-xs">
        {data.items.map((item, i) => (
          <div key={i}>
            <p className="font-medium">{item.name}</p>
            <div className="flex justify-between text-gray-600">
              <span>{item.quantity} × {formatCurrency(item.unitPrice)}</span>
              <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Total HT</span>
          <span>{formatCurrency(ht)}</span>
        </div>
        <div className="flex justify-between">
          <span>TVA ({tvaPercent} %)</span>
          <span>{formatCurrency(tva)}</span>
        </div>
      </div>

      <div className="mt-2 flex justify-between text-sm font-bold">
        <span>TOTAL TTC</span>
        <span>{formatCurrency(ttc)}</span>
      </div>

      <div className="my-3 border-t border-dashed border-gray-400" />

      <p className="text-center text-[10px] text-gray-500">
        Merci de votre visite !
      </p>
    </div>
  );
}

export function printReceipt() {
  window.print();
}
