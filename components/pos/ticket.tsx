"use client";

import { INVOICE_CLIENT_DIVERS } from "@/lib/constants/invoice";
import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import { computeTvaBreakdown, PAYMENT_METHOD_LABELS, TVA_RATE } from "@/lib/constants/sales";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SaleDocumentData } from "@/components/pos/sale-document-types";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";

function TicketRule({ heavy = false }: { heavy?: boolean }) {
  return (
    <div
      className={heavy ? "my-2 border-t-2 border-black" : "my-1.5 border-t border-dashed border-black"}
      aria-hidden
    />
  );
}

function TicketRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 text-[10px] leading-snug">
      <span className={bold ? "font-black" : "font-semibold"}>{label}</span>
      <span className={`text-right tabular-nums ${bold ? "font-black" : "font-bold"}`}>{value}</span>
    </div>
  );
}

export function Ticket({ data }: { data: SaleDocumentData }) {
  const ticketNo = saleDocumentNumber(data.saleId);
  const paymentLabel = data.paymentLabel ?? PAYMENT_METHOD_LABELS[data.paymentMethod];
  const clientName = data.customerName?.trim() || INVOICE_CLIENT_DIVERS;
  const itemsSubtotal = data.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const { ht, tva, ttc } = computeTvaBreakdown(data.total);
  const tvaPercent = Math.round(TVA_RATE * 100);
  const hasDiscounts =
    (data.loyaltyDiscount ?? 0) > 0 ||
    (data.proClientDiscount ?? 0) > 0 ||
    (data.promoDiscount ?? 0) > 0;

  return (
    <div
      id="ticket-print"
      className="natus-ticket mx-auto w-[300px] bg-white p-0 font-sans text-black print:w-[80mm] print:max-w-[80mm]"
    >
      <div className="px-1 py-2 print:px-0">
        {/* En-tête société */}
        <div className="text-center">
          <NatusDocumentBrand variant="ticket" monochrome />
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em]">
            {NATUS_INVOICE_COMPANY.legalName}
          </p>
          <p className="mt-1 text-[9px] font-semibold leading-tight">
            {NATUS_INVOICE_COMPANY.address}
            <br />
            {NATUS_INVOICE_COMPANY.city}
          </p>
          <p className="mt-0.5 text-[9px] font-bold">{NATUS_INVOICE_COMPANY.phone}</p>
          <p className="text-[8px] font-semibold">{NATUS_INVOICE_COMPANY.taxId}</p>
        </div>

        <TicketRule heavy />

        <p className="text-center text-[11px] font-black uppercase tracking-[0.2em]">
          Ticket de caisse
        </p>

        <TicketRule />

        {/* Infos vente */}
        <div className="space-y-0.5">
          <TicketRow label="N° ticket" value={ticketNo} bold />
          {data.shopifyOrderNumber ? (
            <TicketRow label="Commande web" value={data.shopifyOrderNumber} />
          ) : null}
          <TicketRow label="Date" value={formatDate(data.createdAt)} />
          {data.storeName ? <TicketRow label="Magasin" value={data.storeName} /> : null}
          <TicketRow label="Caissier" value={data.cashierName} />
          <TicketRow label="Client" value={clientName} />
          {data.customerPhone ? (
            <TicketRow label="Téléphone" value={data.customerPhone} />
          ) : null}
          <TicketRow label="Paiement" value={paymentLabel} bold />
          {data.loyaltyCardNumber ? (
            <TicketRow label="Carte fidélité" value={data.loyaltyCardNumber} />
          ) : null}
          {(data.proClientDiscount ?? 0) > 0 ? (
            <p className="pt-0.5 text-center text-[9px] font-black uppercase tracking-wide">
              Client Pro · remise appliquée
            </p>
          ) : null}
        </div>

        <TicketRule heavy />

        {/* Lignes articles */}
        <table className="natus-print-table w-full border-collapse text-[9px] text-black">
          <thead>
            <tr className="natus-print-doc-banner">
              <th colSpan={4}>Ticket caisse — {NATUS_INVOICE_COMPANY.legalName}</th>
            </tr>
            <tr className="border-b border-black text-left font-black uppercase">
              <th className="pb-1 pr-1">Désignation</th>
              <th className="w-7 pb-1 text-center">Qté</th>
              <th className="w-14 pb-1 text-right">P.U.</th>
              <th className="w-14 pb-1 pl-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-black/25 align-top">
                <td className="py-1 pr-1 font-bold leading-tight">{item.name}</td>
                <td className="py-1 text-center font-black tabular-nums">{item.quantity}</td>
                <td className="py-1 text-right font-semibold tabular-nums">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-1 pl-1 text-right font-black tabular-nums">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <TicketRule />

        {/* Totaux */}
        <div className="natus-ticket-summary space-y-0.5 text-[10px]">
          <TicketRow label="Sous-total articles" value={formatCurrency(itemsSubtotal)} />
          {hasDiscounts ? (
            <>
              {data.loyaltyDiscount ? (
                <TicketRow
                  label="Remise fidélité"
                  value={`-${formatCurrency(data.loyaltyDiscount)}`}
                />
              ) : null}
              {data.proClientDiscount ? (
                <TicketRow
                  label="Remise Client Pro"
                  value={`-${formatCurrency(data.proClientDiscount)}`}
                />
              ) : null}
              {data.promoDiscount && data.promoCode ? (
                <TicketRow
                  label={`Promo ${data.promoCode}`}
                  value={`-${formatCurrency(data.promoDiscount)}`}
                />
              ) : null}
            </>
          ) : null}
          <TicketRow label={`Total HT (${tvaPercent} % TVA)`} value={formatCurrency(ht)} />
          <TicketRow label={`TVA ${tvaPercent} %`} value={formatCurrency(tva)} />
        </div>

        {(data.pointsRedeemed ?? 0) > 0 || (data.pointsEarned ?? 0) > 0 ? (
          <>
            <TicketRule />
            <div className="space-y-0.5">
              {data.pointsRedeemed ? (
                <TicketRow label="Points utilisés" value={String(data.pointsRedeemed)} />
              ) : null}
              {data.pointsEarned ? (
                <TicketRow label="Points gagnés" value={`+${data.pointsEarned}`} />
              ) : null}
            </div>
          </>
        ) : null}

        <TicketRule heavy />

        <div className="natus-ticket-total flex items-center justify-between border-2 border-black px-2 py-2">
          <span className="text-[10px] font-black uppercase tracking-wide">Total TTC</span>
          <span className="text-lg font-black tabular-nums leading-none">
            {formatCurrency(ttc)}
          </span>
        </div>

        <TicketRule heavy />

        <div className="natus-ticket-footer">
          <p className="text-center text-[8px] font-semibold leading-relaxed">
            {NATUS_INVOICE_COMPANY.legalMention}
          </p>
          <p className="mt-2 text-center text-[10px] font-black leading-snug">
            Merci de votre confiance
          </p>
          <p className="text-center text-[9px] font-bold">{NATUS_INVOICE_COMPANY.website}</p>
        </div>
      </div>
    </div>
  );
}
