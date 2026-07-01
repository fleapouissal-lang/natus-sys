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
import { DayClosureTicket } from "@/components/pos/day-closure-ticket";
import { createClient } from "@/lib/supabase/client";
import { fetchCashierSales, fetchStoreSales } from "@/lib/sales/fetch-cashier-sales";
import {
  computeDayClosureStats,
  filterSalesForDateKey,
  formatDayClosureDate,
  printDayClosureTicket,
  uniqueCashierLabels,
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
  const [dayClosureValidated, setDayClosureValidated] = useState(false);
  const [closedBusinessDate, setClosedBusinessDate] = useState<string>("");
  const [autoValidatedClosure, setAutoValidatedClosure] = useState(false);
  const [printUnlocked, setPrintUnlocked] = useState(false);
  const [canRequestClosure, setCanRequestClosure] = useState(true);
  const [closureBlockedReason, setClosureBlockedReason] = useState<string | null>(null);
  const [requireManagerCode, setRequireManagerCode] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
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
    setDayClosureValidated(stateResult.state.day_closure_validated);
    setClosedBusinessDate(stateResult.state.validated_closure?.business_date ?? "");
    setAutoValidatedClosure(Boolean(stateResult.state.validated_closure?.auto_validated));
    setCanRequestClosure(stateResult.state.can_request_closure);
    setClosureBlockedReason(stateResult.state.closure_blocked_reason ?? null);
    setRequireManagerCode(stateResult.state.require_manager_code);
    setPendingClosure(Boolean(pending));
    setPrintUnlocked(
      stateResult.state.day_closure_validated ||
        (stateResult.state.require_manager_code && Boolean(pending?.cashier_code_confirmed))
    );
    setCodeExpiresAt(pending?.code_expires_at ?? null);
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
          setDayClosureValidated(false);
          setClosedBusinessDate("");
          setPrintUnlocked(false);
        } else {
          setBusinessDate(stateResult.state.business_date);
          const pending = stateResult.state.pending;
          setDayClosureValidated(stateResult.state.day_closure_validated);
          setClosedBusinessDate(stateResult.state.validated_closure?.business_date ?? "");
          setAutoValidatedClosure(Boolean(stateResult.state.validated_closure?.auto_validated));
          setCanRequestClosure(stateResult.state.can_request_closure);
          setClosureBlockedReason(stateResult.state.closure_blocked_reason ?? null);
          setRequireManagerCode(stateResult.state.require_manager_code);
          setPendingClosure(Boolean(pending));
          setPrintUnlocked(
            stateResult.state.day_closure_validated ||
              (!stateResult.state.require_manager_code && Boolean(pending)) ||
              (stateResult.state.require_manager_code &&
                Boolean(pending?.cashier_code_confirmed))
          );
          setCodeExpiresAt(pending?.code_expires_at ?? null);
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

  useEffect(() => {
    if (!open || !pendingClosure || !codeExpiresAt || !resolvedStoreId) return;

    const fireExpiryRefresh = () => {
      void (async () => {
        const stateResult = await getStorePosDayState(resolvedStoreId);
        if ("error" in stateResult) return;

        const pending = stateResult.state.pending;
        setBusinessDate(stateResult.state.business_date);
        setDayClosureValidated(stateResult.state.day_closure_validated);
        setClosedBusinessDate(stateResult.state.validated_closure?.business_date ?? "");
        setAutoValidatedClosure(Boolean(stateResult.state.validated_closure?.auto_validated));
        setCanRequestClosure(stateResult.state.can_request_closure);
        setClosureBlockedReason(stateResult.state.closure_blocked_reason ?? null);
        setPendingClosure(Boolean(pending));
        setPrintUnlocked(Boolean(pending?.cashier_code_confirmed));
        setCodeExpiresAt(pending?.code_expires_at ?? null);
        setCodeInput("");
        setConfirmError(null);
        setClosureMessage(
          "Le code a expiré (2 h). Un nouveau code a été généré — demandez-le au gérant."
        );
      })();
    };

    const ms = new Date(codeExpiresAt).getTime() - Date.now();
    if (ms <= 0) {
      fireExpiryRefresh();
      return;
    }

    const timer = window.setTimeout(fireExpiryRefresh, ms + 500);
    return () => window.clearTimeout(timer);
  }, [open, pendingClosure, codeExpiresAt, resolvedStoreId]);

  const dateKey =
    dayClosureValidated && closedBusinessDate
      ? closedBusinessDate
      : pendingClosure && businessDate
        ? businessDate
        : businessDate;
  const daySales = useMemo(
    () => (dateKey ? filterSalesForDateKey(sales, dateKey) : []),
    [sales, dateKey]
  );
  const stats = useMemo(() => computeDayClosureStats(daySales), [daySales]);
  const closureCashierLabel = useMemo(() => {
    if (!storeMode && cashierName) return cashierName;
    const labels = uniqueCashierLabels(daySales);
    if (labels.length === 0) return undefined;
    if (labels.length === 1) return labels[0];
    return labels.join(", ");
  }, [storeMode, cashierName, daySales]);

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

      if (result.immediate) {
        setPendingClosure(false);
        setDayClosureValidated(true);
        setPrintUnlocked(true);
        setClosedBusinessDate(result.closedBusinessDate ?? result.businessDate);
        setBusinessDate(result.nextBusinessDate ?? result.businessDate);
        setClosureMessage(
          `Jour métier clôturé (${formatDayClosureDate(result.closedBusinessDate ?? result.businessDate)}). Vous pouvez imprimer le rapport.`
        );
        await refreshClosureState();
        return;
      }

      setPendingClosure(true);
      setPrintUnlocked(false);
      setBusinessDate(result.businessDate);
      setClosureMessage(
        "Demande envoyée au gérant. Demandez le code au gérant pour débloquer l'impression du ticket."
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
      setClosureMessage("Code accepté. Vous pouvez imprimer le ticket du jour.");
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
                  Clôture du jour
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

              {!canRequestClosure && closureBlockedReason && !pendingClosure && !dayClosureValidated && (
                <div className="mb-4 border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm text-foreground">
                  {closureBlockedReason}
                </div>
              )}

              {dayClosureValidated && autoValidatedClosure && (
                <div className="mb-4 border border-primary/20 bg-primary-light/40 px-4 py-3 text-sm text-muted">
                  Clôture automatique (caissier absent) — validée sans code gérant.
                </div>
              )}

              {dayClosureValidated && (
                <div className="mb-4 border border-success/35 bg-success/10 px-4 py-3 text-sm text-foreground">
                  Jour métier clôturé ({formatDayClosureDate(closedBusinessDate || dateKey)}).
                  Les nouvelles ventes sont enregistrées sur le jour suivant
                  {businessDate ? ` (${formatDayClosureDate(businessDate)})` : ""}.
                </div>
              )}

              {pendingClosure && requireManagerCode && (
                <div className="mb-4 border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-foreground">
                  La caisse reste ouverte — vous pouvez continuer à encaisser des ventes pendant
                  l&apos;attente de validation du gérant.
                </div>
              )}

              {pendingClosure && requireManagerCode && !dayClosureValidated && !printUnlocked && (
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
                        Le gérant a reçu un code valide 2 h. Saisissez-le ici pour débloquer
                        l&apos;impression du ticket.
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
                    {requireManagerCode
                      ? "Code confirmé — ticket prêt à imprimer."
                      : "Clôture validée — ticket prêt à imprimer."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={printDayClosureTicket}
                      disabled={loading || !!error}
                      className="bg-champagne text-black hover:opacity-90"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimer le ticket
                    </Button>
                  </div>
                </div>
              )}

              {printUnlocked && requireManagerCode && !dayClosureValidated && (
                <p className="mb-4 text-xs text-muted">
                  Le gérant doit encore valider la clôture. Les ventes restent comptées sur le jour
                  en cours jusqu&apos;à validation.
                </p>
              )}

              {printUnlocked && !requireManagerCode && dayClosureValidated && (
                <p className="mb-4 text-xs text-muted">
                  Clôture directe — le jour métier est fermé. Les nouvelles ventes passent au jour
                  suivant.
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

              <div className="mt-4 space-y-4">
                <div className="flex justify-center overflow-y-auto border border-primary/15 bg-[#ebe6dc] p-4 scrollbar-natus print:hidden">
                  <DayClosureTicket
                    sales={daySales}
                    stats={stats}
                    dateKey={dateKey}
                    storeName={storeName}
                    cashierLabel={closureCashierLabel}
                    printId={null}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {printUnlocked && (
              <Button
                type="button"
                onClick={printDayClosureTicket}
                disabled={loading || !!error}
                className="bg-champagne text-black hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Imprimer le ticket
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!pendingClosure && !dayClosureValidated && canRequestClosure && (
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
          <div className="natus-day-closure-print-only" aria-hidden>
            <DayClosureTicket
              key={`ticket|${dateKey}|${daySales.length}`}
              sales={daySales}
              stats={stats}
              dateKey={dateKey}
              storeName={storeName}
              cashierLabel={closureCashierLabel}
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
  disabled,
  title,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={className}
    >
      <ScrollText className="h-4 w-4" />
      <span className="hidden sm:inline">Clôture</span>
    </Button>
  );
}
