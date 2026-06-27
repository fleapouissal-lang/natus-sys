"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Printer,
  ScrollText,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CashierSalesReport } from "@/components/sales/cashier-sales-report";
import { createClient } from "@/lib/supabase/client";
import { fetchCashierSales, fetchStoreSales } from "@/lib/sales/fetch-cashier-sales";
import {
  computeDayClosureStats,
  filterSalesForDateKey,
  formatDayClosureDate,
  printDayClosureReport,
} from "@/lib/sales/day-closure";
import {
  confirmStoreDayClosureCode,
  getStorePosDayState,
  requestStoreDayClosure,
} from "@/lib/sales/store-day-closure-actions";
import { formatCurrency } from "@/lib/utils";
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
  const [businessDate, setBusinessDate] = useState<string>("");
  const [pendingClosure, setPendingClosure] = useState(false);
  const [printUnlocked, setPrintUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [closureMessage, setClosureMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [confirming, startConfirm] = useTransition();

  const storeMode = Boolean(isStorePos || isManagementUser);
  const resolvedStoreId = storeId || undefined;

  async function refreshClosureState() {
    if (!resolvedStoreId) return;
    const stateResult = await getStorePosDayState(resolvedStoreId);
    if ("error" in stateResult) {
      setError(stateResult.error);
      return;
    }
    setBusinessDate(stateResult.state.business_date);
    const pending = stateResult.state.pending;
    setPendingClosure(Boolean(pending));
    setPrintUnlocked(Boolean(pending?.cashier_code_confirmed));
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setClosureMessage(null);
      setConfirmError(null);
      setCodeInput("");

      const supabase = createClient();
      const salesResult =
        storeMode && resolvedStoreId
          ? await fetchStoreSales(supabase, resolvedStoreId)
          : cashierUserId
            ? await fetchCashierSales(supabase, cashierUserId)
            : { sales: [] as Sale[], error: "Compte caissier introuvable" };

      if (cancelled) return;

      if (salesResult.error) {
        setError(salesResult.error);
        setSales([]);
        setLoading(false);
        return;
      }

      setSales(salesResult.sales);

      if (resolvedStoreId) {
        const stateResult = await getStorePosDayState(resolvedStoreId);
        if (cancelled) return;

        if ("error" in stateResult) {
          setError(stateResult.error);
          setBusinessDate("");
          setPendingClosure(false);
          setPrintUnlocked(false);
        } else {
          setBusinessDate(stateResult.state.business_date);
          const pending = stateResult.state.pending;
          setPendingClosure(Boolean(pending));
          setPrintUnlocked(Boolean(pending?.cashier_code_confirmed));
        }
      } else {
        const { todayDateKey } = await import("@/lib/sales/day-closure");
        setBusinessDate(todayDateKey());
        setPendingClosure(false);
        setPrintUnlocked(false);
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, storeMode, resolvedStoreId, cashierUserId]);

  const dateKey = businessDate;
  const daySales = useMemo(
    () => (dateKey ? filterSalesForDateKey(sales, dateKey) : []),
    [sales, dateKey]
  );
  const stats = useMemo(() => computeDayClosureStats(daySales), [daySales]);

  function handleRequestClosure() {
    if (!resolvedStoreId) {
      setClosureMessage("Magasin non configuré pour la clôture.");
      return;
    }

    startSubmit(async () => {
      setClosureMessage(null);
      const result = await requestStoreDayClosure(resolvedStoreId);
      if ("error" in result) {
        setClosureMessage(result.error);
        return;
      }
      setPendingClosure(true);
      setPrintUnlocked(false);
      setBusinessDate(result.businessDate);
      setClosureMessage(
        "Demande envoyée au gérant. Demandez le code au gérant pour débloquer l'impression du rapport."
      );
    });
  }

  function handleConfirmCode() {
    if (!resolvedStoreId || codeInput.length !== 6) return;

    startConfirm(async () => {
      setClosureMessage(null);
      setConfirmError(null);
      const result = await confirmStoreDayClosureCode(resolvedStoreId, codeInput);
      if ("error" in result) {
        setConfirmError(result.error);
        return;
      }
      setPrintUnlocked(true);
      setPendingClosure(true);
      setCodeInput("");
      setClosureMessage("Code accepté. Vous pouvez imprimer le rapport du jour.");
      await refreshClosureState();
    });
  }

  if (!open) return null;

  return (
    <>
      <Modal onClose={onClose} size="lg" className="!max-w-[900px] !p-0">
        <div className="border-b border-primary/15 bg-gradient-to-r from-champagne/40 via-page to-surface px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-champagne shadow-[inset_0_0_0_1px_rgba(179,140,74,0.22)]">
                <ScrollText className="h-5 w-5 text-primary-dark" />
              </span>
              <div>
                <h2 className="font-heading text-xl font-semibold text-primary-dark">
                  Rapport du jour
                </h2>
                <p className="mt-0.5 text-sm capitalize text-muted">
                  {dateKey ? formatDayClosureDate(dateKey) : "Chargement…"}
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

        <div className="natus-closure-screen px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement du compte du jour…
            </div>
          ) : error ? (
            <p className="rounded-none border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : (
            <>
              {confirmError && (
                <p className="mb-4 rounded-none border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  {confirmError}
                </p>
              )}

              {pendingClosure && (
                <div className="mb-4 border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-foreground">
                  La caisse reste ouverte — vous pouvez continuer à encaisser des ventes pendant
                  l&apos;attente de validation du gérant.
                </div>
              )}

              {pendingClosure && !printUnlocked && (
                <div className="mb-4 border border-primary/25 bg-gradient-to-r from-champagne/50 to-page px-4 py-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 shrink-0 text-primary-dark" />
                        <p className="text-sm font-semibold text-primary-dark">
                          Code gérant requis
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Le gérant a reçu un code. Saisissez-le ici pour débloquer l&apos;impression du
                        rapport.
                      </p>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="natus-field mt-3 w-full max-w-xs bg-surface font-mono text-lg tracking-[0.35em]"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleConfirmCode}
                      disabled={confirming || codeInput.length !== 6}
                    >
                      {confirming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Confirmer le code
                    </Button>
                  </div>
                </div>
              )}

              {printUnlocked && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-success/35 bg-success/10 px-4 py-3">
                  <p className="text-sm font-medium text-success">
                    Code confirmé — rapport prêt à imprimer.
                  </p>
                  <Button
                    type="button"
                    onClick={printDayClosureReport}
                    disabled={loading || !!error}
                    className="bg-champagne text-black hover:opacity-90"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer le rapport
                  </Button>
                </div>
              )}

              {printUnlocked && (
                <p className="mb-4 text-xs text-muted">
                  Le gérant doit encore valider la clôture. Les ventes restent possibles aujourd&apos;hui
                  — le jour métier suivant commencera demain matin.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <div className="natus-closure-kpi px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Ventes</p>
                  <p className="mt-0.5 font-heading text-lg font-bold tabular-nums text-primary-dark">
                    {stats.count}
                  </p>
                </div>
                <div className="natus-closure-kpi natus-closure-kpi--total px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Total</p>
                  <p className="mt-0.5 font-heading text-lg font-bold tabular-nums text-primary-dark">
                    {formatCurrency(stats.total)}
                  </p>
                </div>
                <div className="natus-closure-kpi natus-closure-kpi--cash px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Esp.</p>
                  <p className="mt-0.5 font-heading text-lg font-bold tabular-nums">
                    {formatCurrency(stats.cash)}
                  </p>
                </div>
                <div className="natus-closure-kpi natus-closure-kpi--card px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">TPE</p>
                  <p className="mt-0.5 font-heading text-lg font-bold tabular-nums">
                    {formatCurrency(stats.card)}
                  </p>
                </div>
                <div className="natus-closure-kpi natus-closure-kpi--cheque px-3 py-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Chq.</p>
                  <p className="mt-0.5 font-heading text-lg font-bold tabular-nums">
                    {formatCurrency(stats.cheque)}
                  </p>
                </div>
              </div>

              {stats.cancelledCount > 0 && (
                <p className="mt-3 border border-primary/15 bg-primary-light/40 px-3 py-2 text-xs text-foreground">
                  {stats.cancelledCount} annulée{stats.cancelledCount > 1 ? "s" : ""} ·{" "}
                  {formatCurrency(stats.cancelledTotal)}
                </p>
              )}

              <div className="mt-4 max-h-[min(52vh,520px)] overflow-y-auto border border-primary/15 bg-white scrollbar-natus">
                <CashierSalesReport
                  sales={daySales}
                  stats={stats}
                  dateFrom={dateKey}
                  dateTo={dateKey}
                  periodLabel="Jour métier"
                  cashierName={storeMode ? undefined : cashierName}
                  variant="day-closure"
                  printId={null}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {printUnlocked && (
              <Button
                type="button"
                onClick={printDayClosureReport}
                disabled={loading || !!error}
                className="bg-champagne text-black hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Imprimer le rapport
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!pendingClosure && (
              <Button
                type="button"
                onClick={handleRequestClosure}
                disabled={loading || !!error || !resolvedStoreId || submitting}
                className="bg-champagne text-black hover:opacity-90"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Valider la clôture
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>

        {closureMessage && (
          <p className="border-t border-border px-5 py-3 text-sm text-muted">{closureMessage}</p>
        )}
      </Modal>

      {mounted &&
        dateKey &&
        printUnlocked &&
        createPortal(
          <div className="natus-sales-report-print-only" aria-hidden>
            <CashierSalesReport
              key={`report|${dateKey}|${daySales.length}`}
              sales={daySales}
              stats={stats}
              dateFrom={dateKey}
              dateTo={dateKey}
              periodLabel="Jour métier"
              cashierName={storeMode ? undefined : cashierName}
              variant="day-closure"
            />
          </div>,
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
