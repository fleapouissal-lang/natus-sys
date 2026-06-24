"use client";

import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";

export function Ticket({ data }: { data: SaleDocumentData }) {
  const ticketNo = saleDocumentNumber(data.saleId);
  const paymentLabel = data.paymentLabel ?? PAYMENT_METHOD_LABELS[data.paymentMethod];

  return (
    <div
      id="ticket-print"
      className="natus-ticket sale-doc ticket mx-auto w-[300px] bg-[#faf7f2] p-4 text-[#2c2418] print:w-full print:max-w-[80mm] print:bg-white print:p-3"
    >
      <div className="border border-[#e0d4c2] bg-white p-4 print:border-[#d4c4a8]">
        <div className="flex flex-col items-center border-b border-[#e8dfd0] pb-3">
          <NatusDocumentBrand variant="ticket" />
          <p
            className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#b38c4a]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Ticket caisse
          </p>
          <p className="mt-1 text-[10px] text-[#8a7350]">{NATUS_INVOICE_COMPANY.legalName}</p>
        </div>

        <div className="my-3 space-y-1 text-[11px] leading-relaxed text-[#4a4034]">
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">N° ticket</span>
            <span className="font-semibold tabular-nums">{ticketNo}</span>
          </div>
          {data.shopifyOrderNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Commande</span>
              <span className="text-right font-medium">{data.shopifyOrderNumber}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">Date</span>
            <span>{formatDate(data.createdAt)}</span>
          </div>
          {data.storeName && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Magasin</span>
              <span className="text-right">{data.storeName}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">Caissier</span>
            <span className="text-right">{data.cashierName}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">Paiement</span>
            <span className="font-medium">{paymentLabel}</span>
          </div>
          {data.loyaltyCardNumber && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Carte</span>
              <span>{data.loyaltyCardNumber}</span>
            </div>
          )}
        </div>

        <table className="mb-3 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#c9b896] text-left text-[9px] font-semibold uppercase tracking-wide text-white">
              <th className="px-2 py-1.5">Article</th>
              <th className="px-1 py-1.5 text-center">Qté</th>
              <th className="px-2 py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-[#ece4d6] text-[#2c2418]">
                <td className="px-2 py-1.5 font-medium leading-tight">{item.name}</td>
                <td className="px-1 py-1.5 text-center tabular-nums">{item.quantity}</td>
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {((data.pointsRedeemed ?? 0) > 0 || (data.pointsEarned ?? 0) > 0) && (
          <div className="mb-3 space-y-0.5 text-[10px] text-[#4a4034]">
            {data.pointsRedeemed ? (
              <p className="flex justify-between">
                <span>Points utilisés</span>
                <span>{data.pointsRedeemed}</span>
              </p>
            ) : null}
            {data.pointsEarned ? (
              <p className="flex justify-between">
                <span>Points gagnés</span>
                <span>+{data.pointsEarned}</span>
              </p>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between bg-[#2c2418] px-3 py-2 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-wide">Total TTC</span>
          <span className="text-sm font-bold tabular-nums">{formatCurrency(data.total)}</span>
        </div>

        <p className="mt-3 text-center text-[9px] leading-relaxed text-[#8a7350]">
          Merci de votre visite !
          <br />
          {NATUS_INVOICE_COMPANY.website}
        </p>
      </div>
    </div>
  );
}
