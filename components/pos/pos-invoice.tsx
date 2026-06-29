"use client";

import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import {
  invoicePaymentModeLabel,
  NATUS_INVOICE_COMPANY,
} from "@/lib/constants/company";
import {
  NATUS_BRAND,
  NATUS_BRAND_GRADIENTS,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import { computeTvaBreakdown, PAYMENT_METHOD_LABELS, TVA_RATE } from "@/lib/constants/sales";
import { formatCurrency } from "@/lib/utils";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";

function lineUnitHt(unitPriceTtc: number): number {
  return unitPriceTtc / (1 + TVA_RATE);
}

function InvoiceMonogram() {
  return (
    <span
      className="natus-invoice-monogram pointer-events-none absolute bottom-[-6%] right-[-2%] select-none leading-none"
      style={{
        fontFamily: NATUS_BRAND_SERIF,
        fontSize: "22rem",
        fontWeight: 700,
        color: NATUS_BRAND.gold,
        opacity: 0.09,
        lineHeight: 0.78,
      }}
      aria-hidden
    >
      N
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="natus-invoice-section-label mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
      style={{ fontFamily: NATUS_BRAND_SERIF, color: NATUS_BRAND.gold }}
    >
      {children}
    </p>
  );
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
      className="natus-invoice sale-doc invoice mx-auto w-full max-w-[210mm] bg-white p-0 shadow-sm print:max-w-none print:bg-white print:p-0 print:text-black print:shadow-none"
      style={{
        background: NATUS_BRAND_GRADIENTS.creamBg,
        color: NATUS_BRAND.ink,
      }}
    >
      <div
        className="natus-invoice-sheet relative overflow-hidden px-8 py-8 print:overflow-visible print:p-0"
        style={{ background: NATUS_BRAND_GRADIENTS.creamBg }}
      >
        <InvoiceMonogram />

        <div className="natus-invoice-print-header">
        {/* En-tête */}
        <div
          className="natus-invoice-header relative z-[1] mb-6 mt-2 flex items-start justify-between gap-6 border-b pb-5 pt-4 print:mb-4 print:mt-0 print:pb-4 print:pt-0"
          style={{ borderColor: NATUS_BRAND.border }}
        >
          <div className="min-w-0">
            <h1
              className="text-[2.35rem] font-normal leading-none tracking-wide"
              style={{ fontFamily: NATUS_BRAND_SERIF, color: NATUS_BRAND.gold }}
            >
              FACTURE
            </h1>
            <p className="mt-2.5 text-base" style={{ color: NATUS_BRAND.inkSoft }}>
              <span style={{ color: NATUS_BRAND.goldDeep }}>Facture N°</span>{" "}
              <span
                className="text-lg font-semibold tabular-nums"
                style={{ color: NATUS_BRAND.ink }}
              >
                {invoiceNo}
              </span>
            </p>
          </div>
          <NatusDocumentBrand variant="invoiceLogo" className="print:mt-1" />
        </div>

        {/* Émetteur | Client */}
        <div
          className="natus-invoice-parties relative z-[1] mb-8 grid grid-cols-1 gap-8 border-b pb-8 md:grid-cols-2 md:gap-x-10 print:mb-5 print:grid-cols-2 print:gap-x-10 print:pb-5"
          style={{ borderColor: NATUS_BRAND.border }}
        >
          <div className="natus-invoice-party-issuer relative pl-4">
            <div
              className="absolute bottom-2 left-0 top-2 w-px print:opacity-100"
              style={{
                background: `linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)`,
                opacity: 0.55,
              }}
              aria-hidden
            />
            <SectionLabel>Émetteur</SectionLabel>
            <div className="space-y-1 text-sm leading-relaxed" style={{ color: NATUS_BRAND.inkSoft }}>
              <p className="text-base font-bold" style={{ color: NATUS_BRAND.ink }}>
                {NATUS_INVOICE_COMPANY.legalName}
              </p>
              <p>{companyAddress}</p>
              <p>{NATUS_INVOICE_COMPANY.city}</p>
              <p className="pt-1">Tél. : {NATUS_INVOICE_COMPANY.phone}</p>
              <p>Email : {NATUS_INVOICE_COMPANY.email}</p>
              <p className="text-xs" style={{ color: NATUS_BRAND.goldDeep }}>
                {NATUS_INVOICE_COMPANY.taxId}
              </p>
            </div>
          </div>

          <div className="natus-invoice-party-client relative pl-4 md:pl-0 md:pr-4 md:text-right print:pl-0 print:pr-4 print:text-right">
            <div
              className="absolute bottom-2 left-0 top-2 w-px md:left-auto md:right-0 print:left-auto print:right-0"
              style={{
                background: `linear-gradient(180deg, transparent, ${NATUS_BRAND.gold} 12%, ${NATUS_BRAND.gold} 88%, transparent)`,
                opacity: 0.55,
              }}
              aria-hidden
            />
            {data.shopifyOrderNumber && (
              <p className="mb-3 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                <span style={{ color: NATUS_BRAND.goldDeep }}>Réf. commande : </span>
                <span className="font-medium" style={{ color: NATUS_BRAND.ink }}>
                  {data.shopifyOrderNumber}
                </span>
              </p>
            )}
            <SectionLabel>Client</SectionLabel>
            <p className="text-base font-bold" style={{ color: NATUS_BRAND.ink }}>
              {clientName}
            </p>
            {data.customerPhone && (
              <p className="mt-1 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Tél. : {data.customerPhone}
              </p>
            )}
            {data.customerEmail && (
              <p className="mt-1 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Email : {data.customerEmail}
              </p>
            )}
            {data.customerIce && (
              <p className="mt-1 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                ICE : {data.customerIce}
              </p>
            )}
            {data.loyaltyCardNumber && (
              <p className="mt-1 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Carte fidélité : {data.loyaltyCardNumber}
              </p>
            )}
          </div>
        </div>
        </div>

        {/* Lignes + totaux */}
        <div className="natus-invoice-body relative z-[1] w-full">
        <div className="natus-invoice-table-wrap w-full overflow-visible">
          <table className="natus-invoice-table natus-print-table w-full table-fixed border-collapse text-sm print:text-xs">
            <colgroup>
              <col className="w-[44%]" />
              <col className="w-[12%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="natus-print-doc-banner">
                <th colSpan={4}>
                  Facture N° {invoiceNo} — {NATUS_INVOICE_COMPANY.legalName}
                </th>
              </tr>
              <tr className="text-[11px] font-semibold uppercase tracking-wider print:text-[10px]">
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
                    className="border-b last:border-b-0"
                    style={{
                      borderColor: NATUS_BRAND.borderSoft,
                      background: i % 2 === 0 ? "rgba(255,253,249,0.92)" : "rgba(255,246,236,0.65)",
                      color: NATUS_BRAND.ink,
                    }}
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

        {/* Totaux */}
        <div
          className="natus-invoice-totals relative z-[1] mt-0 overflow-hidden border border-t-0"
          style={{ borderColor: NATUS_BRAND.borderSoft }}
        >
          <div className="ml-auto w-full max-w-sm space-y-0 text-sm">
            {data.subtotal != null &&
            (data.loyaltyDiscount || data.proClientDiscount || data.promoDiscount) ? (
              <div
                className="flex justify-between border-b px-4 py-2"
                style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
              >
                <span>Sous-total articles</span>
                <span className="tabular-nums">{formatCurrency(data.subtotal)}</span>
              </div>
            ) : null}
            {data.loyaltyDiscount ? (
              <div
                className="flex justify-between border-b px-4 py-2"
                style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
              >
                <span>Réduction fidélité</span>
                <span className="tabular-nums">-{formatCurrency(data.loyaltyDiscount)}</span>
              </div>
            ) : null}
            {data.proClientDiscount ? (
              <div
                className="flex justify-between border-b px-4 py-2"
                style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
              >
                <span>Remise Client Pro (-34 %)</span>
                <span className="tabular-nums">-{formatCurrency(data.proClientDiscount)}</span>
              </div>
            ) : null}
            {data.promoDiscount ? (
              <div
                className="flex justify-between border-b px-4 py-2"
                style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
              >
                <span>Promo {data.promoCode}</span>
                <span className="tabular-nums">-{formatCurrency(data.promoDiscount)}</span>
              </div>
            ) : null}
            <div
              className="flex justify-between px-4 py-2.5"
              style={{ background: "rgba(255,253,249,0.95)", color: NATUS_BRAND.inkSoft }}
            >
              <span className="font-medium">Total HT :</span>
              <span className="font-semibold tabular-nums">{formatCurrency(ht)}</span>
            </div>
            <div
              className="flex justify-between px-4 py-2"
              style={{ background: "rgba(255,253,249,0.95)", color: NATUS_BRAND.inkSoft }}
            >
              <span>TVA ({tvaPercent} %) :</span>
              <span className="tabular-nums">{formatCurrency(tva)}</span>
            </div>
            <div
              className="natus-invoice-total-bar flex items-center justify-between px-4 py-3.5 font-semibold text-white"
              style={{
                background: "#2c2418",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            >
              <span className="text-sm uppercase tracking-wide">Total TTC :</span>
              <span className="text-xl font-bold tabular-nums">{formatCurrency(ttc)}</span>
            </div>
          </div>
        </div>
        </div>

        {/* Pied de page */}
        <div
          className="natus-invoice-footer relative z-[1] mt-10 border-t pt-8 print:mt-6 print:pt-4"
          style={{ borderColor: NATUS_BRAND.border }}
        >
          <div className="text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
            <p
              className="text-xs font-bold uppercase tracking-[0.12em]"
              style={{ color: NATUS_BRAND.ink }}
            >
              Mode de paiement : {paymentLabel.toUpperCase()}
            </p>
            <p className="mt-2">Caissier : {data.cashierName}</p>
            <p className="mt-4 text-[11px] leading-relaxed" style={{ color: NATUS_BRAND.goldDeep }}>
              {NATUS_INVOICE_COMPANY.legalMention}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
