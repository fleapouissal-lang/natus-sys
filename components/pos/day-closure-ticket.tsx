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

function formatSaleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
      className="natus-closure-doc natus-day-closure-ticket sale-doc mx-auto w-[300px] bg-[#fffdf9] p-3 text-[#2c2418] print:w-full print:max-w-[80mm] print:bg-white print:p-2 print:text-black"
    >
      <div className="natus-closure-print-panel border border-[#2c2418]/20 bg-white p-3 print:border-black">
        <div className="flex flex-col items-center border-b-2 border-[#2c2418] pb-3 print:border-black">
          <NatusDocumentBrand variant="ticket" />
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-[#8f6b38] print:text-black">
            Clôture journalière
          </p>
          <p className="mt-1 text-[10px] text-[#666] print:text-black">
            {NATUS_INVOICE_COMPANY.legalName}
          </p>
        </div>

        <div className="my-3 space-y-1.5 text-[11px] leading-relaxed">
          <div className="flex justify-between gap-2">
            <span className="text-[#666] print:text-black">N° clôture</span>
            <span className="font-bold tabular-nums">{dayClosureReference(dateKey)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666] print:text-black">Journée</span>
            <span className="text-right font-semibold capitalize">
              {formatDayClosureDate(dateKey)}
            </span>
          </div>
          {storeName && (
            <div className="flex justify-between gap-2">
              <span className="text-[#666] print:text-black">Magasin</span>
              <span className="text-right font-medium">{storeName}</span>
            </div>
          )}
          {cashierLabel && (
            <div className="flex justify-between gap-2">
              <span className="text-[#666] print:text-black">Caissier</span>
              <span className="text-right">{cashierLabel}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-[#666] print:text-black">Édité le</span>
            <span className="tabular-nums">
              {generatedAt.toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        <div className="natus-closure-print-recap mb-3 border border-[#2c2418]/15 bg-[#faf7f2] p-2.5 text-[10px] print:border-black print:bg-white">
          <p className="mb-2 text-center text-[9px] font-bold uppercase tracking-[0.14em] text-[#8f6b38] print:text-black">
            Synthèse du jour
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span>Transactions</span>
              <span className="font-bold tabular-nums">{stats.count}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Espèces</span>
              <span className="font-semibold tabular-nums">{formatCurrency(stats.cash)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>TPE</span>
              <span className="font-semibold tabular-nums">{formatCurrency(stats.card)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>Chèque</span>
              <span className="font-semibold tabular-nums">{formatCurrency(stats.cheque)}</span>
            </div>
            {stats.cancelledCount > 0 && (
              <div className="flex justify-between gap-2 text-[#666] print:text-black">
                <span>Annulées ({stats.cancelledCount})</span>
                <span className="line-through tabular-nums">
                  {formatCurrency(stats.cancelledTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="natus-closure-table-wrap mb-3">
          <table className="natus-closure-table text-[10px]">
            <thead>
              <tr>
                <th>Heure</th>
                <th>Paiement</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {activeSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="tabular-nums">{formatSaleTime(sale.created_at)}</td>
                  <td className="text-[9px]">
                    {sale.payment_method === "cash"
                      ? "ESP"
                      : sale.payment_method === "card"
                        ? "TPE"
                        : "CHQ"}
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {formatCurrency(Number(sale.total))}
                  </td>
                </tr>
              ))}
              {activeSales.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[#666] print:text-black">
                    Aucune vente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {cancelledSales.length > 0 && (
          <div className="mb-3 text-[9px]">
            <p className="mb-1 font-bold uppercase tracking-wide">Annulations</p>
            {cancelledSales.map((sale) => (
              <div
                key={sale.id}
                className="flex justify-between gap-2 border-t border-[#ddd] py-1 print:border-black"
              >
                <span>{formatSaleTime(sale.created_at)}</span>
                <span className="line-through tabular-nums">
                  {formatCurrency(Number(sale.total))}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="natus-closure-print-total flex items-center justify-between bg-[#2c2418] px-3 py-2.5 text-[#faeaa1] print:bg-black print:text-white">
          <span className="text-[10px] font-bold uppercase tracking-wide">Total CA TTC</span>
          <span className="text-base font-bold tabular-nums">{formatCurrency(stats.total)}</span>
        </div>

        <div className="mt-3 border-t border-dashed border-[#ccc] pt-3 text-[9px] leading-relaxed print:border-black">
          <p>
            {stats.count} vente{stats.count > 1 ? "s" : ""} · Panier moyen{" "}
            {formatCurrency(stats.averageTicket)}
          </p>
          <p className="mt-2 text-center">{NATUS_INVOICE_COMPANY.legalMention}</p>
        </div>

        <div className="mt-4 border-t border-[#ddd] pt-3 text-[10px] print:border-black">
          <p>Signature caissier :</p>
          <div className="mt-6 border-b border-[#2c2418] print:border-black" />
        </div>
      </div>
    </div>
  );
}
