"use client";

import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  dayClosureReference,
  formatDayClosureDate,
  type DayClosureStats,
} from "@/lib/sales/day-closure";
import { formatCurrency, formatPaymentMethod } from "@/lib/utils";
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
      className="natus-day-closure-ticket sale-doc mx-auto w-[300px] bg-[#faf7f2] p-4 text-[#2c2418] print:w-full print:max-w-[80mm] print:bg-white print:p-3"
    >
      <div className="border border-[#e0d4c2] bg-white p-4 print:border-[#d4c4a8]">
        <div className="flex flex-col items-center border-b border-[#e8dfd0] pb-3">
          <NatusDocumentBrand variant="ticket" />
          <p
            className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#b38c4a]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Clôture de caisse
          </p>
          <p className="mt-1 text-[10px] text-[#8a7350]">{NATUS_INVOICE_COMPANY.legalName}</p>
        </div>

        <div className="my-3 space-y-1 text-[11px] leading-relaxed text-[#4a4034]">
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">N° clôture</span>
            <span className="font-semibold tabular-nums">{dayClosureReference(dateKey)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">Journée</span>
            <span className="text-right font-medium capitalize">{formatDayClosureDate(dateKey)}</span>
          </div>
          {storeName && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Magasin</span>
              <span className="text-right">{storeName}</span>
            </div>
          )}
          {cashierLabel && (
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Caissier</span>
              <span className="text-right">{cashierLabel}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-[#8a7350]">Clôturé le</span>
            <span>
              {generatedAt.toLocaleString("fr-FR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          </div>
        </div>

        <div className="mb-3 rounded border border-[#e8dfd0] bg-[#fffdf9] p-2.5 text-[10px]">
          <p className="mb-2 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b38c4a]">
            Récapitulatif du jour
          </p>
          <div className="space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Transactions</span>
              <span className="font-semibold tabular-nums">{stats.count}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Espèces</span>
              <span className="font-medium tabular-nums">{formatCurrency(stats.cash)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">TPE</span>
              <span className="font-medium tabular-nums">{formatCurrency(stats.card)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#8a7350]">Chèque</span>
              <span className="font-medium tabular-nums">{formatCurrency(stats.cheque)}</span>
            </div>
            {stats.cancelledCount > 0 && (
              <div className="flex justify-between gap-2 text-[#8a7350]">
                <span>Annulées ({stats.cancelledCount})</span>
                <span className="line-through tabular-nums">
                  {formatCurrency(stats.cancelledTotal)}
                </span>
              </div>
            )}
          </div>
        </div>

        <table className="mb-3 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#c9b896] text-left text-[9px] font-semibold uppercase tracking-wide text-white">
              <th className="px-1.5 py-1.5">Heure</th>
              <th className="px-1 py-1.5">Paie.</th>
              <th className="px-1.5 py-1.5 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {activeSales.map((sale) => (
              <tr key={sale.id} className="border-b border-[#ece4d6] text-[#2c2418]">
                <td className="px-1.5 py-1 tabular-nums">{formatSaleTime(sale.created_at)}</td>
                <td className="px-1 py-1 text-[9px]">
                  {sale.payment_method === "cash"
                    ? "ESP"
                    : sale.payment_method === "card"
                      ? "TPE"
                      : "CHQ"}
                </td>
                <td className="px-1.5 py-1 text-right font-medium tabular-nums">
                  {formatCurrency(Number(sale.total))}
                </td>
              </tr>
            ))}
            {activeSales.length === 0 && (
              <tr>
                <td colSpan={3} className="px-2 py-4 text-center text-[#8a7350]">
                  Aucune vente aujourd&apos;hui
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {cancelledSales.length > 0 && (
          <div className="mb-3 text-[9px] text-[#8a7350]">
            <p className="mb-1 font-semibold uppercase tracking-wide">Annulations</p>
            {cancelledSales.map((sale) => (
              <div key={sale.id} className="flex justify-between gap-2 border-t border-[#ece4d6] py-1">
                <span>{formatSaleTime(sale.created_at)}</span>
                <span className="line-through tabular-nums">
                  {formatCurrency(Number(sale.total))}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between bg-[#2c2418] px-3 py-2 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-wide">Total CA TTC</span>
          <span className="text-sm font-bold tabular-nums">{formatCurrency(stats.total)}</span>
        </div>

        <div className="mt-3 border-t border-dashed border-[#d4c4a8] pt-3 text-[9px] leading-relaxed text-[#8a7350]">
          <p>Ticket de clôture journalière — {stats.count} vente{stats.count > 1 ? "s" : ""}</p>
          <p>Panier moyen : {formatCurrency(stats.averageTicket)}</p>
          <p className="mt-2 text-center">{NATUS_INVOICE_COMPANY.legalMention}</p>
        </div>

        <div className="mt-4 border-t border-[#e8dfd0] pt-3 text-[10px] text-[#8a7350]">
          <p>Signature caissier :</p>
          <div className="mt-6 border-b border-[#c9b896]" />
        </div>
      </div>
    </div>
  );
}
