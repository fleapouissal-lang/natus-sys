"use client";

import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";
import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  NATUS_BRAND,
  NATUS_BRAND_GRADIENTS,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import { formatSalesReportPeriodLabel } from "@/lib/sales/cashier-report";
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
} from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/lib/types";

function ReportMonogram() {
  return (
    <span
      className="pointer-events-none absolute bottom-[-4%] right-[-1%] select-none leading-none"
      style={{
        fontFamily: NATUS_BRAND_SERIF,
        fontSize: "16rem",
        fontWeight: 700,
        color: NATUS_BRAND.gold,
        opacity: 0.08,
        lineHeight: 0.78,
      }}
      aria-hidden
    >
      N
    </span>
  );
}

export function CashierSalesReport({
  sales,
  stats,
  dateFrom,
  dateTo,
  periodLabel,
  cashierName,
  paymentFilter,
  generatedAt = new Date(),
}: {
  sales: Sale[];
  stats: { count: number; total: number; cash: number; card: number };
  dateFrom: string;
  dateTo: string;
  periodLabel: string;
  cashierName?: string;
  paymentFilter?: "" | PaymentMethod;
  generatedAt?: Date;
}) {
  const periodText = formatSalesReportPeriodLabel(dateFrom, dateTo, periodLabel);
  const activeSales = sales.filter((s) => !s.cancelled_at);
  const cancelledSales = sales.filter((s) => s.cancelled_at);
  const storeLabel = [...new Set(activeSales.map((s) => s.stores?.name).filter(Boolean))].join(
    ", "
  );

  return (
    <div
      id="cashier-sales-report-print"
      className="natus-sales-report relative mx-auto w-full max-w-[210mm] text-sm shadow-sm print:max-w-none print:shadow-none"
      style={{
        background: NATUS_BRAND_GRADIENTS.creamBg,
        color: NATUS_BRAND.ink,
      }}
    >
      <div
        className="relative overflow-hidden px-8 py-8 print:overflow-visible print:px-[12mm] print:py-[10mm]"
        style={{ background: NATUS_BRAND_GRADIENTS.creamBg }}
      >
        <ReportMonogram />

        <header
          className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5"
          style={{ borderColor: NATUS_BRAND.border }}
        >
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ fontFamily: NATUS_BRAND_SERIF, color: NATUS_BRAND.gold }}
            >
              Rapport de ventes caisse
            </p>
            <h1
              className="mt-1 text-2xl font-normal tracking-wide"
              style={{ fontFamily: NATUS_BRAND_SERIF, color: NATUS_BRAND.goldDeep }}
            >
              {NATUS_INVOICE_COMPANY.legalName}
            </h1>
            <p className="mt-2 text-sm font-medium">{periodText}</p>
            {cashierName && (
              <p className="mt-1 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Caissier : <span className="font-semibold text-[inherit]">{cashierName}</span>
              </p>
            )}
            {storeLabel && (
              <p className="mt-0.5 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Magasin{storeLabel.includes(",") ? "s" : ""} : {storeLabel}
              </p>
            )}
            {paymentFilter && (
              <p className="mt-0.5 text-sm" style={{ color: NATUS_BRAND.inkSoft }}>
                Paiement : {formatPaymentMethod(paymentFilter)}
              </p>
            )}
            <p className="mt-2 text-xs" style={{ color: NATUS_BRAND.inkSoft }}>
              Généré le{" "}
              {generatedAt.toLocaleString("fr-FR", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
          <NatusDocumentBrand variant="invoice" />
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Ventes", value: String(stats.count) },
            { label: "Total CA", value: formatCurrency(stats.total) },
            { label: "Espèces", value: formatCurrency(stats.cash) },
            { label: "TPE", value: formatCurrency(stats.card) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-md border bg-white/70 px-3 py-3"
              style={{ borderColor: NATUS_BRAND.borderSoft }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8F6B38]">
                {item.label}
              </p>
              <p
                className="mt-1 text-lg font-bold tabular-nums"
                style={{ fontFamily: NATUS_BRAND_SERIF }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div
          className="overflow-hidden rounded-md border bg-white/60 print:overflow-visible"
          style={{ borderColor: NATUS_BRAND.borderSoft }}
        >
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: "rgba(250, 234, 161, 0.45)" }}>
                <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                <th className="px-3 py-2.5 text-left font-semibold">Magasin</th>
                <th className="px-3 py-2.5 text-left font-semibold">Paiement</th>
                <th className="px-3 py-2.5 text-right font-semibold">Montant</th>
                <th className="px-3 py-2.5 text-left font-semibold">Réf.</th>
              </tr>
            </thead>
            <tbody>
              {activeSales.map((sale) => (
                <tr key={sale.id} className="border-t border-[#eee]">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(sale.created_at)}</td>
                  <td className="px-3 py-2">{sale.stores?.name || "—"}</td>
                  <td className="px-3 py-2">{formatPaymentMethod(sale.payment_method)}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatCurrency(Number(sale.total))}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">{sale.id.slice(0, 8)}</td>
                </tr>
              ))}
              {activeSales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center" style={{ color: NATUS_BRAND.inkSoft }}>
                    Aucune vente pour cette période
                  </td>
                </tr>
              )}
            </tbody>
            {activeSales.length > 0 && (
              <tfoot>
                <tr
                  className="border-t-2 font-semibold"
                  style={{ borderColor: NATUS_BRAND.gold, background: "rgba(255,246,236,0.9)" }}
                >
                  <td className="px-3 py-2.5" colSpan={3}>
                    Total ({stats.count} vente{stats.count > 1 ? "s" : ""})
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatCurrency(stats.total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {cancelledSales.length > 0 && (
          <div className="mt-5">
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: NATUS_BRAND.gold }}
            >
              Ventes annulées (hors totaux)
            </p>
            <table className="w-full border-collapse text-xs opacity-80">
              <tbody>
                {cancelledSales.map((sale) => (
                  <tr key={sale.id} className="border-t border-[#eee]">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(sale.created_at)}</td>
                    <td className="py-1.5 pr-3 line-through">{formatCurrency(Number(sale.total))}</td>
                    <td className="py-1.5 font-mono text-[10px]">{sale.id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer
          className="mt-8 border-t pt-4 text-center text-[10px]"
          style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
        >
          {NATUS_INVOICE_COMPANY.legalMention}
        </footer>
      </div>
    </div>
  );
}
