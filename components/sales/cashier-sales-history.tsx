"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Printer } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { SaleDetailModal } from "@/components/sales/sale-detail-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { CashierSalesReport } from "@/components/sales/cashier-sales-report";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import { createClient } from "@/lib/supabase/client";
import { fetchCashierSales, fetchStoreSales } from "@/lib/sales/fetch-cashier-sales";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import {
  printCashierSalesReport,
  salesReportPrintLabel,
} from "@/lib/sales/cashier-report";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/lib/types";

const DEFAULT_DATE_PRESET: OrderDatePreset = "today";

export function CashierSalesHistory({
  initialSales,
  mode = "personal",
  storeId,
  cashierId,
  cashierName,
}: {
  initialSales: Sale[];
  mode?: "personal" | "store";
  storeId?: string;
  cashierId?: string;
  cashierName?: string;
}) {
  const router = useRouter();
  const [sales, setSales] = useState(initialSales);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const initialToday = useMemo(() => orderDatePresetToKeys(DEFAULT_DATE_PRESET), []);
  const [dateFrom, setDateFrom] = useState(initialToday.from);
  const [dateTo, setDateTo] = useState(initialToday.to);
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSales(initialSales);
  }, [initialSales]);

  useEffect(() => {
    if (mode === "store" && !storeId) return;
    if (mode === "personal" && !cashierId) return;

    let cancelled = false;

    async function refreshSales() {
      const supabase = createClient();
      const { sales: rows, error } =
        mode === "store" && storeId
          ? await fetchStoreSales(supabase, storeId)
          : await fetchCashierSales(supabase, cashierId!);
      if (cancelled) return;
      if (error) {
        setRefreshError(error);
        return;
      }
      setRefreshError(null);
      setSales(rows);
    }

    void refreshSales();
    router.refresh();

    return () => {
      cancelled = true;
    };
  }, [mode, storeId, cashierId, router]);

  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    return sales.filter((sale) => {
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      const saleDay = toLocalDateKey(sale.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;

      return true;
    });
  }, [sales, dateFrom, dateTo, paymentFilter]);

  const stats = useMemo(() => {
    const active = filtered.filter((s) => !s.cancelled_at);
    const total = active.reduce((sum, s) => sum + Number(s.total), 0);
    const cash = active
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const card = active
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { count: active.length, total, cash, card };
  }, [filtered]);

  const hasDateFilter =
    dateFrom !== initialToday.from || dateTo !== initialToday.to;
  const hasFilters = Boolean(hasDateFilter || paymentFilter);

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    setDateFrom(from);
    setDateTo(to);
  }

  function resetFilters() {
    setDateFrom(initialToday.from);
    setDateTo(initialToday.to);
    setPaymentFilter("");
  }

  const periodHint =
    activeDatePreset !== "all"
      ? orderDatePresetLabel(activeDatePreset)
      : undefined;

  const activeSalesCount = useMemo(
    () => sales.filter((s) => !s.cancelled_at).length,
    [sales]
  );
  const filteredHiddenByDate =
    activeSalesCount > 0 && stats.count === 0 && activeDatePreset !== "all";

  return (
    <div className="space-y-6">
      {refreshError && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Mise à jour impossible : {refreshError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Ventes affichées</p>
          <p className="mt-1 text-2xl font-bold">{stats.count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Chiffre d&apos;affaires</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.total)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Banknote className="h-4 w-4" />
            Espèces
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.cash)}</p>
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <CreditCard className="h-4 w-4" />
            TPE
          </p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(stats.card)}</p>
        </Card>
      </div>

      {filteredHiddenByDate && (
        <p className="rounded-lg bg-primary-light/50 px-4 py-3 text-sm text-foreground">
          Vous avez {activeSalesCount} vente{activeSalesCount > 1 ? "s" : ""} enregistrée
          {activeSalesCount > 1 ? "s" : ""}, mais aucune pour « {periodHint} ». Essayez « Tout »
          ou élargissez les dates.
        </p>
      )}

      <SalesAgendaFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        paymentFilter={paymentFilter}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onPaymentChange={setPaymentFilter}
        onReset={resetFilters}
        resultCount={filtered.length}
        periodHint={periodHint}
        hasActiveFilters={hasFilters}
        periodFilter={
          <OrderDatePeriodFilter
            activePreset={activeDatePreset}
            onPresetChange={applyDatePreset}
          />
        }
        extraActions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={printCashierSalesReport}
            disabled={filtered.length === 0}
          >
            <Printer className="h-4 w-4" />
            {salesReportPrintLabel(activeDatePreset)}
          </Button>
        }
      />

      {mounted &&
        createPortal(
          <div className="natus-sales-report-print-only" aria-hidden>
            <CashierSalesReport
              key={`${dateFrom}|${dateTo}|${paymentFilter}|${filtered.length}`}
              sales={filtered}
              stats={stats}
              dateFrom={dateFrom}
              dateTo={dateTo}
              periodLabel={orderDatePresetLabel(activeDatePreset)}
              cashierName={cashierName}
              paymentFilter={paymentFilter}
            />
          </div>,
          document.body
        )}

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Historique des ventes"
            description={
              mode === "store"
                ? `${filtered.length} transaction(s) — ventes du magasin par caissier`
                : `${filtered.length} transaction(s) — vos ventes en caisse`
            }
          />
        </div>

        <SalesHistoryTable
          sales={filtered}
          showStore={mode !== "store"}
          showCashier={mode === "store"}
          onViewSale={setDetailSale}
          paginationKey={`${mode}|${dateFrom}|${dateTo}|${paymentFilter}`}
        />
      </Card>

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          canCancel={!detailSale.cancelled_at}
          onCancelled={() => router.refresh()}
        />
      )}
    </div>
  );
}
