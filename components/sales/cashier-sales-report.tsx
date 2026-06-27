"use client";

import { NatusDocumentBrand } from "@/components/pos/natus-document-brand";
import { NATUS_INVOICE_COMPANY } from "@/lib/constants/company";
import {
  NATUS_BRAND,
  NATUS_BRAND_SERIF,
} from "@/lib/constants/natus-brand";
import { formatSalesReportPeriodLabel } from "@/lib/sales/cashier-report";
import { SaleLineItemsSummary } from "@/components/sales/sale-line-items-summary";
import {
  formatCurrency,
  formatDate,
  formatPaymentMethod,
} from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/lib/types";

function ReportMonogram() {
  return (
    <span
      className="pointer-events-none absolute bottom-[-4%] right-[-1%] select-none leading-none print:hidden"
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
  variant = "sales",
  printId = "cashier-sales-report-print",
}: {
  sales: Sale[];
  stats: { count: number; total: number; cash: number; card: number; cheque: number };
  dateFrom: string;
  dateTo: string;
  periodLabel: string;
  cashierName?: string;
  paymentFilter?: "" | PaymentMethod;
  generatedAt?: Date;
  variant?: "sales" | "day-closure";
  printId?: string | null;
}) {
  const isClosureReport = variant === "day-closure";
  const periodText = formatSalesReportPeriodLabel(dateFrom, dateTo, periodLabel);
  const activeSales = sales.filter((s) => !s.cancelled_at);
  const cancelledSales = sales.filter((s) => s.cancelled_at);
  const storeLabel = [...new Set(activeSales.map((s) => s.stores?.name).filter(Boolean))].join(
    ", "
  );

  return (
    <div
      id={printId ?? undefined}
      className={`natus-sales-report relative mx-auto w-full max-w-[210mm] bg-white text-sm text-black shadow-sm print:max-w-none print:shadow-none ${isClosureReport ? "natus-closure-doc natus-closure-report" : ""}`}
    >
      <div className="relative overflow-hidden bg-white px-8 py-8 print:overflow-visible print:bg-white print:px-0 print:py-0 print:text-black">
        {!isClosureReport && <ReportMonogram />}

        <header
          className={`natus-sales-report-report-header mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${isClosureReport ? "natus-closure-report-header" : ""}`}
          style={{ borderColor: isClosureReport ? "#2c2418" : NATUS_BRAND.border }}
        >
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-[0.22em]"
              style={{
                fontFamily: NATUS_BRAND_SERIF,
                color: isClosureReport ? "#8f6b38" : NATUS_BRAND.gold,
              }}
            >
              {isClosureReport ? "Clôture journalière caisse" : "Rapport de ventes caisse"}
            </p>
            <h1
              className="mt-1 text-2xl font-normal tracking-wide"
              style={{
                fontFamily: NATUS_BRAND_SERIF,
                color: isClosureReport ? "#2c2418" : NATUS_BRAND.goldDeep,
              }}
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

        <div
          className={`natus-sales-report-stats mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 ${isClosureReport ? "natus-closure-report-stats natus-closure-report-stats-grid" : ""}`}
        >
          {[
            { label: "Ventes", value: String(stats.count) },
            { label: "Total CA", value: formatCurrency(stats.total) },
            { label: "Espèces", value: formatCurrency(stats.cash) },
            { label: "TPE", value: formatCurrency(stats.card) },
            { label: "Chèque", value: formatCurrency(stats.cheque) },
          ].map((item) => (
            <div
              key={item.label}
              className={
                isClosureReport
                  ? "natus-closure-report-stat"
                  : "rounded-md border bg-white/70 px-3 py-3"
              }
              style={isClosureReport ? undefined : { borderColor: NATUS_BRAND.borderSoft }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: isClosureReport ? "#666" : "#8F6B38" }}
              >
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
          className={
            isClosureReport
              ? "natus-closure-table-wrap natus-closure-report-table-wrap overflow-hidden print:overflow-visible"
              : "overflow-hidden rounded-md border bg-white/60 print:overflow-visible"
          }
          style={isClosureReport ? undefined : { borderColor: NATUS_BRAND.borderSoft }}
        >
          <table className={`natus-print-table w-full border-collapse text-xs ${isClosureReport ? "natus-closure-table natus-closure-report-table" : ""}`}>
            <thead>
              <tr className="natus-print-doc-banner">
                <th colSpan={6}>
                  {NATUS_INVOICE_COMPANY.legalName} —{" "}
                  {isClosureReport ? "Clôture journalière caisse" : "Rapport de ventes caisse"} —{" "}
                  {periodText}
                </th>
              </tr>
              {isClosureReport ? (
                <tr>
                  <th>Date / heure</th>
                  <th>Magasin</th>
                  <th>Paiement</th>
                  <th className="text-right">Montant</th>
                  <th>Articles</th>
                  <th>Réf.</th>
                </tr>
              ) : (
                <tr style={{ background: "rgba(250, 234, 161, 0.45)" }}>
                  <th className="px-3 py-2.5 text-left font-semibold">Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Magasin</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Paiement</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Montant</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Articles</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Réf.</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeSales.map((sale) => (
                <tr
                  key={sale.id}
                  className={
                    isClosureReport
                      ? "natus-closure-report-row natus-print-row-break"
                      : "natus-print-row-break border-t border-[#eee]"
                  }
                >
                  <td className={isClosureReport ? "" : "px-3 py-2 whitespace-nowrap"}>
                    {formatDate(sale.created_at)}
                  </td>
                  <td className={isClosureReport ? "" : "px-3 py-2"}>
                    {sale.stores?.name || "—"}
                  </td>
                  <td className={isClosureReport ? "" : "px-3 py-2"}>
                    {formatPaymentMethod(sale.payment_method)}
                  </td>
                  <td
                    className={`text-right font-medium tabular-nums ${isClosureReport ? "" : "px-3 py-2"}`}
                  >
                    {formatCurrency(Number(sale.total))}
                  </td>
                  <td className={isClosureReport ? "align-top" : "px-3 py-2 align-top"}>
                    <SaleLineItemsSummary
                      sale={sale}
                      variant="compact"
                      maxItems={10}
                      className={isClosureReport ? "min-w-[9rem]" : "max-w-[14rem]"}
                    />
                  </td>
                  <td className={isClosureReport ? "font-mono text-[10px] align-top" : "px-3 py-2 font-mono text-[10px] align-top"}>
                    {sale.id.slice(0, 8)}
                  </td>
                </tr>
              ))}
              {activeSales.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={isClosureReport ? "py-10 text-center" : "px-3 py-10 text-center"}
                    style={{ color: isClosureReport ? "#666" : NATUS_BRAND.inkSoft }}
                  >
                    Aucune vente pour cette période
                  </td>
                </tr>
              )}
              {!isClosureReport && activeSales.length > 0 && (
                <tr
                  className="natus-print-row-avoid border-t-2 font-semibold print:break-inside-avoid"
                  style={{
                    borderColor: NATUS_BRAND.gold,
                    background: "rgba(255,246,236,0.9)",
                  }}
                >
                  <td className="px-3 py-2.5" colSpan={4}>
                    Total ({stats.count} vente{stats.count > 1 ? "s" : ""})
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatCurrency(stats.total)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
            {isClosureReport && activeSales.length > 0 && (
              <tfoot>
                <tr className="natus-closure-report-total-bar natus-print-row-avoid">
                  <td colSpan={4} className="text-sm font-semibold uppercase tracking-wide">
                    Total des ventes ({stats.count} vente{stats.count > 1 ? "s" : ""})
                  </td>
                  <td className="text-right font-heading text-lg font-bold tabular-nums">
                    {formatCurrency(stats.total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {cancelledSales.length > 0 && (
          <div className={`mt-5 ${isClosureReport ? "natus-closure-report-cancelled print:break-inside-avoid" : ""}`}>
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
          className={`mt-8 border-t pt-4 text-center text-[10px] ${isClosureReport ? "natus-closure-report-footer" : ""}`}
          style={{ borderColor: NATUS_BRAND.borderSoft, color: NATUS_BRAND.inkSoft }}
        >
          {NATUS_INVOICE_COMPANY.legalMention}
        </footer>
      </div>
    </div>
  );
}
