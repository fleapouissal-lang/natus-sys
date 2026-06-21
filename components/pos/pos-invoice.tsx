"use client";

import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import {
  invoicePaymentModeLabel,
  NATUS_INVOICE_COMPANY,
} from "@/lib/constants/company";
import { computeTvaBreakdown, PAYMENT_METHOD_LABELS, TVA_RATE } from "@/lib/constants/sales";
import { formatCurrency } from "@/lib/utils";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";

const SERIF = "Georgia, 'Times New Roman', serif";

function lineUnitHt(unitPriceTtc: number): number {
  return unitPriceTtc / (1 + TVA_RATE);
}

export function PosInvoice({ data }: { data: SaleDocumentData }) {
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const clientName = data.customerName?.trim() || INVOICE_CLIENT_DIVERS;
  const invoiceNo = saleDocumentNumber(data.saleId);
  const paymentLabel =
    data.paymentLabel ??
    invoicePaymentModeLabel(data.paymentMethod, PAYMENT_METHOD_LABELS[data.paymentMethod]);

  const companyAddress = data.storeName
    ? `${NATUS_INVOICE_COMPANY.address} (${data.storeName})`
    : NATUS_INVOICE_COMPANY.address;

  return (
    <div
      id="invoice-print"
      className="natus-invoice sale-doc invoice mx-auto w-full max-w-[210mm] bg-[#f5f0e6] p-6 text-[#2c2418] shadow-sm print:max-w-none print:bg-white print:p-0 print:shadow-none"
    >
      <div className="bg-[#faf7f2] p-8 print:bg-white print:px-0 print:pb-8 print:pt-4">
        {/* Ligne 1 — titre à gauche, logo à droite */}
        <div className="mb-6 mt-2 flex items-start justify-between gap-6 border-b border-[#ddd0bc] pb-5 pt-4 print:mt-4 print:pt-6">
          <div className="min-w-0">
            <h1
              className="text-[2.35rem] font-normal leading-none tracking-wide text-[#b38c4a]"
              style={{ fontFamily: SERIF }}
            >
              FACTURE
            </h1>
            <p className="mt-2 text-base text-[#4a4034]">
              <span className="text-[#8a7350]">Facture N°</span>{" "}
              <span className="text-lg font-semibold text-[#2c2418]">{invoiceNo}</span>
            </p>
          </div>
          <NatusDocumentBrand variant="invoiceLogo" className="print:mt-1" />
        </div>

        {/* Ligne 2 — Natus (gauche) | dates + client (droite) */}
        <div className="mb-8 grid gap-8 border-b border-[#ddd0bc] pb-8 sm:grid-cols-2">
          <div className="space-y-1 text-sm leading-relaxed text-[#4a4034]">
            <p className="text-base font-bold text-[#2c2418]">
              {NATUS_INVOICE_COMPANY.legalName}
            </p>
            <p>{companyAddress}</p>
            <p>{NATUS_INVOICE_COMPANY.city}</p>
            <p className="pt-1">Tél. : {NATUS_INVOICE_COMPANY.phone}</p>
            <p>Email : {NATUS_INVOICE_COMPANY.email}</p>
            <p className="text-xs text-[#8a7350]">{NATUS_INVOICE_COMPANY.taxId}</p>
          </div>

          <div className="space-y-4">
            {data.shopifyOrderNumber && (
              <p className="text-sm text-[#4a4034]">
                <span className="text-[#8a7350]">Réf. commande : </span>
                <span className="font-medium text-[#2c2418]">{data.shopifyOrderNumber}</span>
              </p>
            )}

            <div className={data.shopifyOrderNumber ? "border-t border-[#e0d4c2] pt-4" : ""}>
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b38c4a]"
                style={{ fontFamily: SERIF }}
              >
                Client
              </p>
              <p className="text-base font-bold text-[#2c2418]">{clientName}</p>
              {data.customerPhone && (
                <p className="mt-1 text-sm text-[#4a4034]">Tél. : {data.customerPhone}</p>
              )}
              {data.loyaltyCardNumber && (
                <p className="mt-1 text-sm text-[#4a4034]">
                  Carte fidélité : {data.loyaltyCardNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="natus-invoice-table-wrap w-full overflow-visible">
          <table className="w-full table-fixed border-collapse text-sm print:text-xs">
            <colgroup>
              <col className="w-[44%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#c9b896] text-[11px] font-semibold uppercase tracking-wider text-white print:text-[10px]">
                <th className="px-3 py-3 text-left print:px-2 print:py-2">Description</th>
                <th className="px-2 py-3 text-center print:px-1 print:py-2">Qté</th>
                <th className="px-2 py-3 text-right print:px-1 print:py-2">Prix HT</th>
                <th className="px-2 py-3 text-right print:px-1 print:py-2">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => {
                const unitHt = lineUnitHt(item.unitPrice);
                const lineHt = unitHt * item.quantity;
                return (
                  <tr
                    key={i}
                    className="border-b border-[#e8dfd0] bg-white text-[#2c2418] last:border-b-0"
                  >
                    <td className="break-words px-3 py-3.5 font-medium print:px-2 print:py-2">
                      {item.name}
                    </td>
                    <td className="px-2 py-3.5 text-center tabular-nums print:px-1 print:py-2">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right tabular-nums print:px-1 print:py-2">
                      {formatCurrency(unitHt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3.5 text-right font-semibold tabular-nums print:px-1 print:py-2">
                      {formatCurrency(lineHt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux — style inspiration */}
        <div className="mt-0 border border-t-0 border-[#e8dfd0] bg-white">
          <div className="ml-auto w-full max-w-sm space-y-0 text-sm">
            {data.subtotal != null && (data.loyaltyDiscount || data.promoDiscount) ? (
              <div className="flex justify-between border-b border-[#f0ebe3] px-4 py-2 text-[#4a4034]">
                <span>Sous-total articles</span>
                <span className="tabular-nums">{formatCurrency(data.subtotal)}</span>
              </div>
            ) : null}
            {data.loyaltyDiscount ? (
              <div className="flex justify-between border-b border-[#f0ebe3] px-4 py-2 text-[#4a4034]">
                <span>Réduction fidélité</span>
                <span className="tabular-nums">-{formatCurrency(data.loyaltyDiscount)}</span>
              </div>
            ) : null}
            {data.promoDiscount ? (
              <div className="flex justify-between border-b border-[#f0ebe3] px-4 py-2 text-[#4a4034]">
                <span>Promo {data.promoCode}</span>
                <span className="tabular-nums">-{formatCurrency(data.promoDiscount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between px-4 py-2.5 text-[#4a4034]">
              <span className="font-medium">Total HT :</span>
              <span className="font-semibold tabular-nums">{formatCurrency(ht)}</span>
            </div>
            <div className="flex justify-between px-4 py-2 text-[#4a4034]">
              <span>TVA ({tvaPercent} %) :</span>
              <span className="tabular-nums">{formatCurrency(tva)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#c9b896] px-4 py-3.5 font-semibold text-white">
              <span className="text-sm uppercase tracking-wide">Total TTC :</span>
              <span className="text-xl font-bold tabular-nums">{formatCurrency(ttc)}</span>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="mt-10 border-t border-[#ddd0bc] pt-8">
          <div className="text-sm text-[#4a4034]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2c2418]">
              Mode de paiement : {paymentLabel.toUpperCase()}
            </p>
            <p className="mt-2 text-[#4a4034]">Caissier : {data.cashierName}</p>
            <p className="mt-4 text-[11px] leading-relaxed text-[#8a7350]">
              {NATUS_INVOICE_COMPANY.legalMention}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[#ddd0bc] bg-[#f0ebe3] py-3 text-center text-sm font-medium text-[#8a7350] print:bg-[#f0ebe3]">
          {NATUS_INVOICE_COMPANY.website}
        </div>
      </div>
    </div>
  );
}
