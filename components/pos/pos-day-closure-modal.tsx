"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  CreditCard,
  Loader2,
  LogOut,
  Printer,
  Receipt,
  ScrollText,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CashierSalesReport } from "@/components/sales/cashier-sales-report";
import { DayClosureTicket } from "@/components/pos/day-closure-ticket";
import { createClient } from "@/lib/supabase/client";
import { fetchCashierSales, fetchStoreSales } from "@/lib/sales/fetch-cashier-sales";
import {
  computeDayClosureStats,
  filterSalesForDateKey,
  formatDayClosureDate,
  printDayClosureReport,
  printDayClosureTicket,
  todayDateKey,
  uniqueCashierLabels,
} from "@/lib/sales/day-closure";
import { signOutPosOperator } from "@/lib/pos/actions";
import { formatCurrency, formatPaymentMethod } from "@/lib/utils";
import type { Sale } from "@/lib/types";

export function PosDayClosureModal({
  open,
  onClose,
  storeId,
  storeName,
  cashierUserId,
  cashierName,
  isStorePos = false,
  isManagementUser = false,
}: {
  open: boolean;
  onClose: () => void;
  storeId?: string;
  storeName?: string;
  cashierUserId?: string;
  cashierName?: string;
  isStorePos?: boolean;
  isManagementUser?: boolean;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const dateKey = todayDateKey();
  const storeMode = Boolean(isStorePos || isManagementUser);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadSales() {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const result =
        storeMode && storeId
          ? await fetchStoreSales(supabase, storeId)
          : cashierUserId
            ? await fetchCashierSales(supabase, cashierUserId)
            : { sales: [] as Sale[], error: "Compte caissier introuvable" };

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setSales([]);
      } else {
        setSales(result.sales);
      }
      setLoading(false);
    }

    void loadSales();

    return () => {
      cancelled = true;
    };
  }, [open, storeMode, storeId, cashierUserId]);

  const todaySales = useMemo(
    () => filterSalesForDateKey(sales, dateKey),
    [sales, dateKey]
  );
  const stats = useMemo(() => computeDayClosureStats(todaySales), [todaySales]);
  const activeSales = useMemo(
    () =>
      [...todaySales]
        .filter((s) => !s.cancelled_at)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [todaySales]
  );

  const ticketCashierLabel = useMemo(() => {
    if (storeMode) {
      const labels = uniqueCashierLabels(todaySales);
      if (labels.length === 0) return cashierName || "—";
      if (labels.length === 1) return labels[0];
      return labels.join(", ");
    }
    return cashierName || "—";
  }, [storeMode, todaySales, cashierName]);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOutPosOperator();
    setSigningOut(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
    window.location.href = "/cashier/pos?switch=1";
  }

  if (!open) return null;

  return (
    <>
      <Modal onClose={onClose} size="lg" className="!p-0">
        <div className="border-b border-primary/15 bg-gradient-to-r from-champagne/40 via-page to-surface px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne shadow-[inset_0_0_0_1px_rgba(179,140,74,0.22)]">
                <ScrollText className="h-5 w-5 text-primary-dark" />
              </span>
              <div>
                <h2 className="font-heading text-xl font-semibold text-primary-dark">
                  Clôture du jour
                </h2>
                <p className="mt-0.5 text-sm capitalize text-muted">
                  {formatDayClosureDate(dateKey)}
                </p>
                {storeName && (
                  <p className="mt-0.5 text-sm text-foreground">{storeName}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark cursor-pointer"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement du compte du jour…
            </div>
          ) : error ? (
            <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Card className="border-primary/15 bg-surface">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Ventes
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold text-primary-dark">
                    {stats.count}
                  </p>
                </Card>
                <Card className="border-primary/15 bg-surface">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Chiffre d&apos;affaires
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold text-primary-dark">
                    {formatCurrency(stats.total)}
                  </p>
                </Card>
                <Card className="border-primary/15 bg-surface">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Banknote className="h-3.5 w-3.5" />
                    Espèces
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold">{formatCurrency(stats.cash)}</p>
                </Card>
                <Card className="border-primary/15 bg-surface">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <CreditCard className="h-3.5 w-3.5" />
                    TPE
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold">{formatCurrency(stats.card)}</p>
                </Card>
                <Card className="border-primary/15 bg-surface col-span-2 lg:col-span-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <ScrollText className="h-3.5 w-3.5" />
                    Chèque
                  </p>
                  <p className="mt-1 font-heading text-2xl font-bold">
                    {formatCurrency(stats.cheque)}
                  </p>
                </Card>
              </div>

              {stats.cancelledCount > 0 && (
                <p className="mt-3 rounded-lg bg-primary-light/40 px-4 py-2.5 text-sm text-foreground">
                  {stats.cancelledCount} vente{stats.cancelledCount > 1 ? "s" : ""} annulée
                  {stats.cancelledCount > 1 ? "s" : ""} ({formatCurrency(stats.cancelledTotal)}) —
                  hors totaux ci-dessus.
                </p>
              )}

              <div className="mt-4 overflow-hidden rounded-lg border border-primary/15">
                <div className="border-b border-primary/10 bg-champagne/30 px-4 py-2.5">
                  <p className="text-sm font-semibold text-primary-dark">
                    Détail des ventes du jour
                  </p>
                  <p className="text-xs text-muted">
                    {activeSales.length} transaction{activeSales.length > 1 ? "s" : ""}
                    {storeMode ? " — par caissier" : ""}
                  </p>
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-natus">
                  {activeSales.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted">
                      Aucune vente enregistrée aujourd&apos;hui.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">Heure</th>
                          {storeMode && <th className="px-4 py-2 font-medium">Caissier</th>}
                          <th className="px-4 py-2 font-medium">Paiement</th>
                          <th className="px-4 py-2 text-right font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSales.map((sale) => (
                          <tr key={sale.id} className="border-t border-border/60">
                            <td className="px-4 py-2 tabular-nums text-muted">
                              {new Date(sale.created_at).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            {storeMode && (
                              <td className="px-4 py-2">
                                {sale.profiles?.full_name ||
                                  sale.profiles?.email ||
                                  "—"}
                              </td>
                            )}
                            <td className="px-4 py-2">
                              {formatPaymentMethod(sale.payment_method)}
                            </td>
                            <td className="px-4 py-2 text-right font-medium tabular-nums">
                              {formatCurrency(Number(sale.total))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="mt-5 hidden justify-center rounded-lg border border-border bg-[#ebe6dc] p-4 md:flex">
                <DayClosureTicket
                  sales={todaySales}
                  stats={stats}
                  dateKey={dateKey}
                  storeName={storeName}
                  cashierLabel={ticketCashierLabel}
                  printId={null}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={printDayClosureTicket}
              disabled={loading || !!error || stats.count === 0}
            >
              <Receipt className="h-4 w-4" />
              Ticket clôture
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={printDayClosureReport}
              disabled={loading || !!error || todaySales.length === 0}
            >
              <Printer className="h-4 w-4" />
              Rapport A4
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStorePos && (
              <Button
                type="button"
                variant="ghost"
                loading={signingOut}
                onClick={handleSignOut}
                className="text-primary-dark"
              >
                <LogOut className="h-4 w-4" />
                Terminer ma session
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </Modal>

      {mounted &&
        createPortal(
          <>
            <div className="natus-day-closure-print-only" aria-hidden>
              <DayClosureTicket
                key={`ticket|${dateKey}|${todaySales.length}|${stats.total}`}
                sales={todaySales}
                stats={stats}
                dateKey={dateKey}
                storeName={storeName}
                cashierLabel={ticketCashierLabel}
              />
            </div>
            <div className="natus-sales-report-print-only" aria-hidden>
              <CashierSalesReport
                key={`report|${dateKey}|${todaySales.length}`}
                sales={todaySales}
                stats={stats}
                dateFrom={dateKey}
                dateTo={dateKey}
                periodLabel="Aujourd'hui"
                cashierName={storeMode ? undefined : cashierName}
              />
            </div>
          </>,
          document.body
        )}
    </>
  );
}

export function PosDayClosureButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      className={className}
      title="Clôture du jour"
    >
      <ScrollText className="h-4 w-4" />
      <span className="hidden sm:inline">Clôture</span>
    </Button>
  );
}
