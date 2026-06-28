"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Download, Eye, Loader2, Printer, RefreshCw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { ClosureReportsBulkActions } from "@/components/sales/closure-reports-bulk-actions";
import { DayClosureTicket } from "@/components/pos/day-closure-ticket";
import { CashierSalesReport } from "@/components/sales/cashier-sales-report";
import { formatSalesReportPeriodLabel } from "@/lib/sales/cashier-report";
import {
  getStoreDayClosureReportSales,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import {
  computeDayClosureStats,
  formatDayClosureDate,
  formatDayClosureDateShort,
  printDayClosureReport,
  uniqueCashierLabels,
} from "@/lib/sales/day-closure";
import {
  downloadDayClosureHtml,
  downloadDayClosuresHtml,
  type DayClosureDownloadData,
} from "@/lib/sales/download-day-closure";
import {
  filterByCashierHistoryDateBounds,
  type getCashierSalesHistoryDateBounds,
} from "@/lib/sales/manager-sales-window";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Sale } from "@/lib/types";

const ACTION_COLOR = "#B38C4A";

function canPrintClosure(closure: StoreDayClosureReportRow, isCashier: boolean): boolean {
  if (closure.status === "validated") return true;
  if (isCashier) return closure.cashier_code_confirmed;
  return true;
}

function canDownloadClosure(closure: StoreDayClosureReportRow, isCashier: boolean): boolean {
  return canPrintClosure(closure, isCashier);
}

function statusBadge(closure: StoreDayClosureReportRow) {
  if (closure.status === "validated") {
    return <Badge variant="success">Validée</Badge>;
  }
  if (closure.cashier_code_confirmed) {
    return <Badge variant="accent">En attente gérant</Badge>;
  }
  return <Badge variant="warning">Code caissier requis</Badge>;
}

function ClosureIconButton({
  label,
  onClick,
  disabled,
  loading,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
      className="order-action-icon flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-transparent hover:bg-[#B38C4A]/10"
      style={{ borderColor: ACTION_COLOR, color: ACTION_COLOR }}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
    </Button>
  );
}

function closureCashierLabel(sales: Sale[], fallback?: string): string | undefined {
  const labels = uniqueCashierLabels(sales);
  if (labels.length === 0) return fallback;
  if (labels.length === 1) return labels[0];
  return labels.join(", ");
}

function closureDownloadPayload(
  closure: StoreDayClosureReportRow,
  sales: Sale[]
): DayClosureDownloadData {
  return {
    closureId: closure.id,
    dateKey: closure.business_date,
    storeName: closure.store_name,
    cashierLabel: closureCashierLabel(sales, closure.requested_by_name),
    stats: closure.stats,
    sales,
  };
}

export function StoreDayClosureReportsList({
  initialClosures,
  storeId,
  isCashier = false,
  showStoreColumn = true,
  historyBounds,
}: {
  initialClosures: StoreDayClosureReportRow[];
  storeId?: string;
  isCashier?: boolean;
  showStoreColumn?: boolean;
  historyBounds?: ReturnType<typeof getCashierSalesHistoryDateBounds>;
}) {
  const [closures, setClosures] = useState(initialClosures);
  const [error, setError] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewPayload, setViewPayload] = useState<{
    sales: Sale[];
    closure: StoreDayClosureReportRow;
  } | null>(null);
  const [printPayload, setPrintPayload] = useState<{
    sales: Sale[];
    closure: StoreDayClosureReportRow;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const {
    paginated,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(closures, DEFAULT_PAGE_SIZE, storeId ?? "all");

  const summary = useMemo(() => {
    const validated = closures.filter((c) => c.status === "validated").length;
    const pending = closures.filter((c) => c.status === "pending").length;
    const totalCa = closures
      .filter((c) => c.status === "validated")
      .reduce((sum, c) => sum + c.stats.total, 0);
    return { validated, pending, totalCa };
  }, [closures]);

  const downloadableClosures = useMemo(
    () => closures.filter((closure) => canDownloadClosure(closure, isCashier)),
    [closures, isCashier]
  );

  const selectedClosures = useMemo(
    () => downloadableClosures.filter((closure) => selectedIds.includes(closure.id)),
    [downloadableClosures, selectedIds]
  );

  const toggleClosure = useCallback((closureId: string) => {
    setSelectedIds((current) =>
      current.includes(closureId)
        ? current.filter((id) => id !== closureId)
        : [...current, closureId]
    );
  }, []);

  const togglePage = useCallback((closureIds: string[], selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of closureIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return [...next];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const selectAllDownloadable = useCallback(() => {
    setSelectedIds(downloadableClosures.map((closure) => closure.id));
  }, [downloadableClosures]);

  const downloadableOnPage = paginated.filter((closure) =>
    canDownloadClosure(closure, isCashier)
  );
  const downloadableIdsOnPage = downloadableOnPage.map((closure) => closure.id);
  const allPageSelected =
    downloadableIdsOnPage.length > 0 &&
    downloadableIdsOnPage.every((id) => selectedIds.includes(id));
  const somePageSelected =
    downloadableIdsOnPage.some((id) => selectedIds.includes(id)) && !allPageSelected;

  const colSpan = 7 + (showStoreColumn ? 1 : 0) + 1;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setClosures(initialClosures);
  }, [initialClosures]);

  const reload = useCallback(() => {
    startRefresh(async () => {
      const result = await listStoreDayClosures(storeId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const rows = historyBounds
        ? filterByCashierHistoryDateBounds(result.closures, historyBounds)
        : result.closures;
      setClosures(rows);
      setError("");
      setPage(1);
    });
  }, [storeId, historyBounds, setPage]);

  useEffect(() => {
    const timer = window.setInterval(reload, 20000);
    return () => window.clearInterval(timer);
  }, [reload]);

  async function loadClosureSales(closure: StoreDayClosureReportRow) {
    setError("");
    const result = await getStoreDayClosureReportSales(closure.store_id, closure.business_date);
    if ("error" in result) {
      setError(result.error);
      return null;
    }
    return result.sales;
  }

  async function handleView(closure: StoreDayClosureReportRow) {
    setViewingId(closure.id);
    const sales = await loadClosureSales(closure);
    setViewingId(null);
    if (!sales) return;
    setViewPayload({ sales, closure });
  }

  async function handlePrint(closure: StoreDayClosureReportRow) {
    setPrintingId(closure.id);
    const sales = await loadClosureSales(closure);
    if (!sales) {
      setPrintingId(null);
      return;
    }
    setPrintPayload({ sales, closure });
    window.setTimeout(() => {
      printDayClosureReport();
      window.setTimeout(() => {
        setPrintPayload(null);
        setPrintingId(null);
      }, 500);
    }, 150);
  }

  async function handleDownload(closure: StoreDayClosureReportRow) {
    setDownloadingId(closure.id);
    const sales = await loadClosureSales(closure);
    setDownloadingId(null);
    if (!sales) return;
    downloadDayClosureHtml(closureDownloadPayload(closure, sales));
  }

  async function handleBulkDownload() {
    const items: DayClosureDownloadData[] = [];
    for (const closure of selectedClosures) {
      const sales = await loadClosureSales(closure);
      if (!sales) return;
      items.push(closureDownloadPayload(closure, sales));
    }
    if (items.length === 0) return;
    await downloadDayClosuresHtml(items);
  }

  function handlePrintFromView() {
    if (!viewPayload) return;
    setPrintPayload(viewPayload);
    window.setTimeout(() => {
      printDayClosureReport();
      window.setTimeout(() => setPrintPayload(null), 500);
    }, 150);
  }

  const printStats = useMemo(() => {
    if (!printPayload) return null;
    return computeDayClosureStats(printPayload.sales);
  }, [printPayload]);

  const viewStats = useMemo(() => {
    if (!viewPayload) return null;
    return computeDayClosureStats(viewPayload.sales);
  }, [viewPayload]);

  return (
    <>
      <Card padding={false} className="natus-closure-reports-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>
              <span className="text-muted">Validées</span>{" "}
              <span className="font-semibold tabular-nums">{summary.validated}</span>
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="text-muted">En attente</span>{" "}
              <span className="font-semibold tabular-nums">{summary.pending}</span>
            </span>
            <span className="text-border">·</span>
            <span>
              <span className="text-muted">CA validé</span>{" "}
              <span className="font-semibold tabular-nums">{formatCurrency(summary.totalCa)}</span>
            </span>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={reload} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>

        {error && (
          <p className="mx-4 mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger md:mx-6">
            {error}
          </p>
        )}

        {downloadableClosures.length > 0 && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 text-sm md:mx-6">
            <span className="text-muted">
              Sélection multiple — cochez les rapports puis téléchargez-les un par un.
            </span>
            {downloadableClosures.length > DEFAULT_PAGE_SIZE && (
              <Button type="button" size="sm" variant="ghost" onClick={selectAllDownloadable}>
                Tout sélectionner ({downloadableClosures.length})
              </Button>
            )}
          </div>
        )}

        <div className="px-4 pt-3 md:px-6">
          <ClosureReportsBulkActions
            selectedClosures={selectedClosures}
            onClearSelection={clearSelection}
            onDownload={handleBulkDownload}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-sm">
            <colgroup>
              <col className="w-11" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
              {showStoreColumn && <col className="w-[14%]" />}
              <col className="w-[7%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-primary-light/30">
                <th className="sticky left-0 z-[1] w-11 bg-primary-light/30 px-3 py-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={allPageSelected ? true : somePageSelected ? "mixed" : false}
                    aria-label="Sélectionner la page"
                    title="Sélectionner les rapports téléchargeables de cette page"
                    disabled={downloadableIdsOnPage.length === 0}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      togglePage(downloadableIdsOnPage, !allPageSelected);
                    }}
                    className={cn(
                      "natus-invoice-select flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      downloadableIdsOnPage.length === 0
                        ? "cursor-not-allowed border-border/60 bg-white opacity-40"
                        : "cursor-pointer border-primary/50 bg-white hover:border-primary",
                      allPageSelected && "border-primary bg-primary text-white",
                      somePageSelected &&
                        !allPageSelected &&
                        "border-primary bg-primary/20 text-primary"
                    )}
                  >
                    {allPageSelected ? (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                        <path
                          d="M2 6l3 3 5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : somePageSelected ? (
                      <span className="block h-0.5 w-2 rounded-full bg-primary" aria-hidden />
                    ) : null}
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-muted md:px-6">Jour métier</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted md:px-6">Statut</th>
                {showStoreColumn && (
                  <th className="px-4 py-2.5 text-left font-medium text-muted md:px-6">Magasin</th>
                )}
                <th className="px-4 py-2.5 text-right font-medium text-muted md:px-6">Ventes</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted md:px-6">Total</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted md:px-6">Demandée</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted md:px-6">Validée</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted md:px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarDays className="h-9 w-9 text-muted/50" />
                      <p className="text-sm text-muted">Aucun rapport de clôture enregistré.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((closure) => {
                  const printable = canPrintClosure(closure, isCashier);
                  const downloadable = canDownloadClosure(closure, isCashier);
                  const selected = selectedIds.includes(closure.id);
                  const isViewing = viewingId === closure.id;
                  const isPrinting = printingId === closure.id;
                  const isDownloading = downloadingId === closure.id;

                  return (
                    <tr
                      key={closure.id}
                      className={cn(
                        "border-b border-border last:border-b-0",
                        selected && "bg-primary-light/40"
                      )}
                    >
                      <td
                        className={cn(
                          "sticky left-0 z-[1] px-3 py-3",
                          selected ? "bg-primary-light/40" : "bg-surface"
                        )}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-label={`Sélectionner clôture ${formatDayClosureDateShort(closure.business_date)}`}
                          disabled={!downloadable}
                          title={
                            downloadable
                              ? "Inclure dans le téléchargement"
                              : isCashier && !closure.cashier_code_confirmed
                                ? "Code caissier requis"
                                : "Rapport non téléchargeable"
                          }
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!downloadable) return;
                            toggleClosure(closure.id);
                          }}
                          className={cn(
                            "natus-invoice-select flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                            downloadable
                              ? "cursor-pointer border-primary/50 hover:border-primary"
                              : "cursor-not-allowed border-border/60 opacity-40",
                            selected
                              ? "border-primary bg-primary text-white"
                              : "bg-white text-transparent"
                          )}
                        >
                          {selected ? (
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
                              <path
                                d="M2 6l3 3 5-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </button>
                      </td>
                      <td className="px-4 py-3 md:px-6">
                        <p className="font-medium capitalize text-primary-dark">
                          {formatDayClosureDateShort(closure.business_date)}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-muted">
                          {formatDayClosureDate(closure.business_date).split(" ")[0]}
                        </p>
                      </td>
                      <td className="px-4 py-3 md:px-6">{statusBadge(closure)}</td>
                      {showStoreColumn && (
                        <td className="px-4 py-3 md:px-6">
                          <p className="truncate font-medium">{closure.store_name}</p>
                          {closure.store_city && (
                            <p className="truncate text-xs text-muted">{closure.store_city}</p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums md:px-6">
                        {closure.stats.count}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums md:px-6">
                        {formatCurrency(closure.stats.total)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted md:px-6">
                        {formatDate(closure.requested_at)}
                      </td>
                      <td className="px-4 py-3 text-xs md:px-6">
                        {closure.status === "validated" && closure.validated_at ? (
                          <>
                            <p className="text-muted">{formatDate(closure.validated_at)}</p>
                            {closure.validated_by_name && (
                              <p className="mt-0.5 truncate text-foreground/80">
                                {closure.validated_by_name}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 md:px-6">
                        <div className="flex justify-end gap-1">
                          <ClosureIconButton
                            label="Voir le rapport"
                            onClick={() => void handleView(closure)}
                            loading={isViewing}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </ClosureIconButton>
                          <ClosureIconButton
                            label="Télécharger le rapport"
                            onClick={() => void handleDownload(closure)}
                            disabled={!downloadable}
                            loading={isDownloading}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </ClosureIconButton>
                          <ClosureIconButton
                            label="Imprimer le rapport"
                            onClick={() => void handlePrint(closure)}
                            disabled={!printable}
                            loading={isPrinting}
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </ClosureIconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 &&
          (totalPages > 1 ? (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalItems={totalItems}
              className="border-t border-border px-4 py-2.5 md:px-6"
            />
          ) : (
            <div className="border-t border-border px-4 py-2.5 text-sm text-muted md:px-6">
              {totalItems} rapport{totalItems !== 1 ? "s" : ""}
            </div>
          ))}
      </Card>

      {viewPayload && viewStats && (
        <Modal
          onClose={() => setViewPayload(null)}
          size="lg"
          className="!max-w-[min(96vw,920px)] !p-0"
        >
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-primary-dark">
                  Rapport de clôture
                </h2>
                <p className="mt-0.5 text-sm capitalize text-muted">
                  {formatDayClosureDate(viewPayload.closure.business_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canPrintClosure(viewPayload.closure, isCashier) && (
                  <Button type="button" size="sm" onClick={handlePrintFromView}>
                    <Printer className="h-4 w-4" />
                    Imprimer
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setViewPayload(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="natus-closure-screen flex max-h-[min(72vh,680px)] flex-col gap-4 overflow-y-auto bg-[#ebe6dc] p-4 scrollbar-natus">
            <DayClosureTicket
              sales={viewPayload.sales}
              stats={viewStats}
              dateKey={viewPayload.closure.business_date}
              storeName={viewPayload.closure.store_name}
              cashierLabel={closureCashierLabel(
                viewPayload.sales,
                viewPayload.closure.requested_by_name
              )}
              printId={null}
            />
            <div className="overflow-x-auto bg-white p-2">
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Rapport — toutes les ventes du jour
              </p>
              <CashierSalesReport
                sales={viewPayload.sales}
                stats={viewStats}
                dateFrom={viewPayload.closure.business_date}
                dateTo={viewPayload.closure.business_date}
                periodLabel={formatSalesReportPeriodLabel(
                  viewPayload.closure.business_date,
                  viewPayload.closure.business_date,
                  formatDayClosureDate(viewPayload.closure.business_date)
                )}
                cashierName={closureCashierLabel(
                  viewPayload.sales,
                  viewPayload.closure.requested_by_name
                )}
                variant="day-closure"
                printId={null}
              />
            </div>
          </div>
        </Modal>
      )}

      {mounted &&
        printPayload &&
        printStats &&
        createPortal(
          <>
            <div className="natus-day-closure-print-only" aria-hidden>
              <DayClosureTicket
                key={`ticket|${printPayload.closure.id}`}
                sales={printPayload.sales}
                stats={printStats}
                dateKey={printPayload.closure.business_date}
                storeName={printPayload.closure.store_name}
                cashierLabel={closureCashierLabel(
                  printPayload.sales,
                  printPayload.closure.requested_by_name
                )}
              />
            </div>
            <div className="natus-sales-report-print-only" aria-hidden>
              <CashierSalesReport
                key={`report|${printPayload.closure.id}`}
                sales={printPayload.sales}
                stats={printStats}
                dateFrom={printPayload.closure.business_date}
                dateTo={printPayload.closure.business_date}
                periodLabel={formatSalesReportPeriodLabel(
                  printPayload.closure.business_date,
                  printPayload.closure.business_date,
                  formatDayClosureDate(printPayload.closure.business_date)
                )}
                cashierName={closureCashierLabel(
                  printPayload.sales,
                  printPayload.closure.requested_by_name
                )}
                variant="day-closure"
                printId="cashier-sales-report-print"
              />
            </div>
          </>,
          document.body
        )}
    </>
  );
}
