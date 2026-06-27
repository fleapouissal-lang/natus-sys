"use client";

import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  dayClosureReference,
  formatDayClosureDate,
  type DayClosureStats,
} from "@/lib/sales/day-closure";
import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/lib/types";
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

function formatSaleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentShort(method: Sale["payment_method"]): string {
  if (method === "cash") return "ESP";
  if (method === "card") return "TPE";
  return "CHQ";
}

export function DayClosureTicket({
  sales,
  stats,
  dateKey,
  storeName,
  cashierLabel,
  generatedAt = new Date(),
  printId = "day-closure-ticket-print",
}: {
  sales: Sale[];
  stats: DayClosureStats;
  dateKey: string;
  storeName?: string;
  cashierLabel?: string;
  generatedAt?: Date;
  printId?: string | null;
}) {
  const activeSales = [...sales]
    .filter((s) => !s.cancelled_at)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const cancelledSales = sales.filter((s) => s.cancelled_at);

  return (
    <div
      id={printId ?? undefined}
      className="natus-ticket natus-day-closure-ticket mx-auto w-[300px] bg-white p-0 font-sans text-black print:w-[80mm] print:max-w-[80mm]"
    >
      <div className="px-1 py-2 print:px-0">
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
          Clôture journalière
        </p>

        <TicketRule />

        <div className="space-y-0.5">
          <TicketRow label="N° clôture" value={dayClosureReference(dateKey)} bold />
          <TicketRow label="Journée" value={formatDayClosureDate(dateKey)} />
          {storeName ? <TicketRow label="Magasin" value={storeName} /> : null}
          {cashierLabel ? <TicketRow label="Caissier" value={cashierLabel} /> : null}
          <TicketRow
            label="Édité le"
            value={generatedAt.toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          />
        </div>

        <TicketRule heavy />

        <p className="mb-1 text-center text-[9px] font-black uppercase tracking-[0.14em]">
          Synthèse du jour
        </p>
        <div className="space-y-0.5">
          <TicketRow label="Transactions" value={String(stats.count)} bold />
          <TicketRow label="Espèces" value={formatCurrency(stats.cash)} />
          <TicketRow label="TPE" value={formatCurrency(stats.card)} />
          <TicketRow label="Chèque" value={formatCurrency(stats.cheque)} />
          {stats.cancelledCount > 0 && (
            <TicketRow
              label={`Annulées (${stats.cancelledCount})`}
              value={formatCurrency(stats.cancelledTotal)}
            />
          )}
        </div>

        <TicketRule heavy />

        <table className="w-full border-collapse text-[9px] text-black">
          <thead>
            <tr className="border-b border-black text-left font-black uppercase">
              <th className="pb-1 pr-1">Heure</th>
              <th className="w-10 pb-1 text-center">Paie.</th>
              <th className="w-16 pb-1 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {activeSales.map((sale) => (
              <tr key={sale.id} className="border-b border-black/25 align-top">
                <td className="py-1 pr-1 font-bold tabular-nums">{formatSaleTime(sale.created_at)}</td>
                <td className="py-1 text-center text-[8px] font-black">
                  {paymentShort(sale.payment_method)}
                </td>
                <td className="py-1 text-right font-black tabular-nums">
                  {formatCurrency(Number(sale.total))}
                </td>
              </tr>
            ))}
            {activeSales.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-[9px] font-semibold">
                  Aucune vente
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {cancelledSales.length > 0 && (
          <>
            <TicketRule />
            <p className="mb-1 text-[9px] font-black uppercase tracking-wide">Annulations</p>
            <div className="space-y-0.5">
              {cancelledSales.map((sale) => (
                <TicketRow
                  key={sale.id}
                  label={formatSaleTime(sale.created_at)}
                  value={formatCurrency(Number(sale.total))}
                />
              ))}
            </div>
          </>
        )}

        <TicketRule heavy />

        <div className="flex items-center justify-between border-2 border-black px-2 py-2">
          <span className="text-[10px] font-black uppercase tracking-wide">Total CA TTC</span>
          <span className="text-lg font-black tabular-nums leading-none">
            {formatCurrency(stats.total)}
          </span>
        </div>

        <TicketRule />

        <TicketRow
          label="Panier moyen"
          value={formatCurrency(stats.averageTicket)}
        />

        <TicketRule heavy />

        <p className="text-center text-[8px] font-semibold leading-relaxed">
          {NATUS_INVOICE_COMPANY.legalMention}
        </p>

        <div className="mt-3 pt-2">
          <p className="text-[9px] font-semibold">Signature caissier :</p>
          <div className="mt-5 border-b border-black" />
        </div>
      </div>
    </div>
  );
}
