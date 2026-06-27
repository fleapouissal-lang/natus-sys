"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Eye, Loader2, Printer, RefreshCw, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DayClosureTicket } from "@/components/pos/day-closure-ticket";
import {
  getStoreDayClosureReportSales,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import {
  formatDayClosureDate,
  formatDayClosureDateShort,
  printDayClosureTicket,
  uniqueCashierLabels,
} from "@/lib/sales/day-closure";
import type { DayClosureStats } from "@/lib/sales/day-closure";
import type { StoreDayClosureReportRow } from "@/lib/sales/store-day-closure";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Sale } from "@/lib/types";

const ACTION_COLOR = "#B38C4A";

function canPrintClosure(closure: StoreDayClosureReportRow, isCashier: boolean): boolean {
  if (closure.status === "validated") return true;
  if (isCashier) return closure.cashier_code_confirmed;
  return true;
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

function closureStatsFromRow(closure: StoreDayClosureReportRow): DayClosureStats {
  return closure.stats;
}

function closureCashierLabel(sales: Sale[], fallback?: string): string | undefined {
  const labels = uniqueCashierLabels(sales);
  if (labels.length === 0) return fallback;
  if (labels.length === 1) return labels[0];
  return labels.join(", ");
}

export function StoreDayClosureReportsList({
  initialClosures,
  storeId,
  isCashier = false,
  showStoreColumn = true,
}: {
  initialClosures: StoreDayClosureReportRow[];
  storeId?: string;
  isCashier?: boolean;
  showStoreColumn?: boolean;
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

  const colSpan = 6 + (showStoreColumn ? 1 : 0) + 1;

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
      setClosures(result.closures);
      setError("");
      setPage(1);
    });
  }, [storeId, setPage]);

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
      printDayClosureTicket();
      window.setTimeout(() => {
        setPrintPayload(null);
        setPrintingId(null);
      }, 500);
    }, 150);
  }

  function handlePrintFromView() {
    if (!viewPayload) return;
    setPrintPayload(viewPayload);
    window.setTimeout(() => {
      printDayClosureTicket();
      window.setTimeout(() => setPrintPayload(null), 500);
    }, 150);
  }

  const printStats = useMemo(() => {
    if (!printPayload) return null;
    return closureStatsFromRow(printPayload.closure);
  }, [printPayload]);

  const viewStats = useMemo(() => {
    if (!viewPayload) return null;
    return closureStatsFromRow(viewPayload.closure);
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              {showStoreColumn && <col className="w-[16%]" />}
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-primary-light/30">
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
                  const isViewing = viewingId === closure.id;
                  const isPrinting = printingId === closure.id;

                  return (
                    <tr key={closure.id} className="border-b border-border last:border-b-0">
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
          <div className="natus-closure-screen flex max-h-[min(72vh,680px)] justify-center overflow-y-auto bg-[#ebe6dc] p-4 scrollbar-natus">
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
          </div>
        </Modal>
      )}

      {mounted &&
        printPayload &&
        printStats &&
        createPortal(
          <div className="natus-day-closure-print-only" aria-hidden>
            <DayClosureTicket
              key={`print|${printPayload.closure.id}`}
              sales={printPayload.sales}
              stats={printStats}
              dateKey={printPayload.closure.business_date}
              storeName={printPayload.closure.store_name}
              cashierLabel={closureCashierLabel(
                printPayload.sales,
                printPayload.closure.requested_by_name
              )}
            />
          </div>,
          document.body
        )}
    </>
  );
}
