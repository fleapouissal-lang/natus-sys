"use client";

import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import { formatSalesReportPeriodLabel } from "@/lib/sales/cashier-report";
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
} from "@/lib/utils";
import type { Sale } from "@/lib/types";

export function CashierSalesReport({
  sales,
  stats,
  dateFrom,
  dateTo,
  periodLabel,
  cashierName,
  generatedAt = new Date(),
}: {
  sales: Sale[];
  stats: { count: number; total: number; cash: number; card: number };
  dateFrom: string;
  dateTo: string;
  periodLabel: string;
  cashierName?: string;
  generatedAt?: Date;
}) {
  const periodText = formatSalesReportPeriodLabel(dateFrom, dateTo, periodLabel);
  const activeSales = sales.filter((s) => !s.cancelled_at);
  const cancelledCount = sales.length - activeSales.length;

  return (
    <div
      id="cashier-sales-report-print"
      className="natus-sales-report-print-only mx-auto max-w-[210mm] bg-white p-8 text-sm text-black"
    >
      <div className="mb-6 border-b border-[#B38C4A]/40 pb-4">
        <p
          className="text-2xl font-normal tracking-wide text-[#B38C4A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Rapport de ventes
        </p>
        <p className="mt-1 text-base font-semibold">{NATUS_INVOICE_COMPANY.legalName}</p>
        {cashierName && (
          <p className="mt-1 text-muted-foreground text-[#666]">Caissier : {cashierName}</p>
        )}
        <p className="mt-2 font-medium">{periodText}</p>
        <p className="text-xs text-[#666]">
          Généré le{" "}
          {generatedAt.toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-[#ddd] p-3">
          <p className="text-xs text-[#666]">Ventes</p>
          <p className="text-lg font-bold">{stats.count}</p>
        </div>
        <div className="rounded-md border border-[#ddd] p-3">
          <p className="text-xs text-[#666]">Total CA</p>
          <p className="text-lg font-bold">{formatCurrency(stats.total)}</p>
        </div>
        <div className="rounded-md border border-[#ddd] p-3">
          <p className="text-xs text-[#666]">Espèces</p>
          <p className="text-lg font-bold">{formatCurrency(stats.cash)}</p>
        </div>
        <div className="rounded-md border border-[#ddd] p-3">
          <p className="text-xs text-[#666]">TPE</p>
          <p className="text-lg font-bold">{formatCurrency(stats.card)}</p>
        </div>
      </div>

      {cancelledCount > 0 && (
        <p className="mb-4 text-xs text-[#666]">
          {cancelledCount} vente(s) annulée(s) exclue(s) des totaux.
        </p>
      )}

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#B38C4A] bg-[#FAEAA1]/40">
            <th className="px-2 py-2 text-left font-semibold">Date</th>
            <th className="px-2 py-2 text-left font-semibold">Magasin</th>
            <th className="px-2 py-2 text-left font-semibold">Paiement</th>
            <th className="px-2 py-2 text-right font-semibold">Montant</th>
            <th className="px-2 py-2 text-left font-semibold">Réf.</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b border-[#eee]">
              <td className="px-2 py-2 whitespace-nowrap">{formatDate(sale.created_at)}</td>
              <td className="px-2 py-2">{sale.stores?.name || "—"}</td>
              <td className="px-2 py-2">{formatPaymentMethod(sale.payment_method)}</td>
              <td className="px-2 py-2 text-right tabular-nums">
                {sale.cancelled_at ? (
                  <span className="line-through text-[#999]">
                    {formatCurrency(Number(sale.total))}
                  </span>
                ) : (
                  formatCurrency(Number(sale.total))
                )}
              </td>
              <td className="px-2 py-2 font-mono text-[10px]">
                {sale.id.slice(0, 8)}
                {sale.cancelled_at ? " (annulée)" : ""}
              </td>
            </tr>
          ))}
          {sales.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-8 text-center text-[#666]">
                Aucune vente pour cette période
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
