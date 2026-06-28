"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { SaleDetailModal } from "@/components/sales/sale-detail-modal";
import { SalesHistoryTable } from "@/components/sales/sales-history-table";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import { useSaleTicketReprint } from "@/components/sales/sale-ticket-reprint";
import { createClient } from "@/lib/supabase/client";
import { fetchCashierSales, fetchStoreSales } from "@/lib/sales/fetch-cashier-sales";
import {
  clampDateToCashierSalesWindow,
  type getCashierSalesHistoryDateBounds,
} from "@/lib/sales/manager-sales-window";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { formatCurrency, toLocalDateKey } from "@/lib/utils";
import {
  canCancelSaleAsCashier,
  cashierSaleCancelBlockedMessage,
} from "@/lib/sales/sale-cancel";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { PaymentMethod, Sale } from "@/lib/types";

const DEFAULT_DATE_PRESET: OrderDatePreset = "today";

export function CashierSalesHistory({
  initialSales,
  mode = "personal",
  storeId,
  cashierId,
  cashierName,
  historyBounds,
}: {
  initialSales: Sale[];
  mode?: "personal" | "store";
  storeId?: string;
  cashierId?: string;
  cashierName?: string;
  historyBounds: ReturnType<typeof getCashierSalesHistoryDateBounds>;
}) {
  const router = useRouter();
  const [sales, setSales] = useState(initialSales);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const initialToday = useMemo(() => orderDatePresetToKeys(DEFAULT_DATE_PRESET), []);
  const [dateFrom, setDateFrom] = useState(initialToday.from);
  const [dateTo, setDateTo] = useState(initialToday.to);
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const { reprintSale, printingSaleId, printPortal } = useSaleTicketReprint();

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
          ? await fetchStoreSales(supabase, storeId, historyBounds)
          : await fetchCashierSales(supabase, cashierId!, historyBounds);
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
  }, [mode, storeId, cashierId, router, historyBounds]);

  const windowedSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDay = toLocalDateKey(sale.created_at);
      return saleDay >= historyBounds.minDate && saleDay <= historyBounds.maxDate;
    });
  }, [sales, historyBounds]);

  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    return windowedSales.filter((sale) => {
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      const saleDay = toLocalDateKey(sale.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;

      return true;
    });
  }, [windowedSales, dateFrom, dateTo, paymentFilter]);

  const stats = useMemo(() => {
    const active = filtered.filter((s) => !s.cancelled_at);
    const total = active.reduce((sum, s) => sum + Number(s.total), 0);
    const cash = active
      .filter((s) => s.payment_method === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const card = active
      .filter((s) => s.payment_method === "card")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const cheque = active
      .filter((s) => s.payment_method === "cheque")
      .reduce((sum, s) => sum + Number(s.total), 0);
    return { count: active.length, total, cash, card, cheque };
  }, [filtered]);

  const hasDateFilter =
    dateFrom !== initialToday.from || dateTo !== initialToday.to;
  const hasFilters = Boolean(hasDateFilter || paymentFilter);

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    if (preset === "all") {
      setDateFrom(historyBounds.minDate);
      setDateTo(historyBounds.maxDate);
      return;
    }

    const clampedFrom = clampDateToCashierSalesWindow(from || historyBounds.minDate, historyBounds);
    const clampedTo = clampDateToCashierSalesWindow(to || historyBounds.maxDate, historyBounds);
    setDateFrom(clampedFrom);
    setDateTo(clampedTo > clampedFrom ? clampedTo : clampedFrom);
  }

  function handleDateFromChange(value: string) {
    setDateFrom(clampDateToCashierSalesWindow(value, historyBounds));
  }

  function handleDateToChange(value: string) {
    setDateTo(clampDateToCashierSalesWindow(value, historyBounds));
  }

  function resetFilters() {
    setDateFrom(initialToday.from);
    setDateTo(initialToday.to);
    setPaymentFilter("");
  }

  const periodHint =
    activeDatePreset !== "all" && activeDatePreset !== "custom"
      ? orderDatePresetLabel(activeDatePreset)
      : "Aujourd'hui et les 3 jours précédents";

  const activeSalesCount = useMemo(
    () => windowedSales.filter((s) => !s.cancelled_at).length,
    [windowedSales]
  );
  const filteredHiddenByDate =
    activeSalesCount > 0 && stats.count === 0 && activeDatePreset !== "all";

  const paginationKey = `${mode}|${dateFrom}|${dateTo}|${paymentFilter}`;
  const listPagination = usePagination(filtered, DEFAULT_PAGE_SIZE, paginationKey);

  return (
    <div className="space-y-6">
      {refreshError && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          Mise à jour impossible : {refreshError}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
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
          Vous avez {activeSalesCount} vente{activeSalesCount > 1 ? "s" : ""} sur les 4
          derniers jours, mais aucune pour « {periodHint} ». Essayez « Tout » ou ajustez les
          dates.
        </p>
      )}

      <SalesAgendaFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        paymentFilter={paymentFilter}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onPaymentChange={setPaymentFilter}
        onReset={resetFilters}
        resultCount={filtered.length}
        periodHint={periodHint}
        hasActiveFilters={hasFilters}
        dateMin={historyBounds.minDate}
        dateMax={historyBounds.maxDate}
        periodFilter={
          <OrderDatePeriodFilter
            activePreset={activeDatePreset}
            onPresetChange={applyDatePreset}
          />
        }
        pagination={{
          page: listPagination.page,
          totalPages: listPagination.totalPages,
          rangeStart: listPagination.rangeStart,
          rangeEnd: listPagination.rangeEnd,
          totalItems: listPagination.totalItems,
          onPageChange: listPagination.setPage,
        }}
      />

      <Card padding={false}>
        <div className="p-4 md:p-6">
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
          sales={listPagination.paginated}
          showStore={mode !== "store"}
          showCashier={mode === "store"}
          showLineItems={false}
          onViewSale={setDetailSale}
          onPrintSale={reprintSale}
          printingSaleId={printingSaleId}
          showPagination={false}
        />
      </Card>

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          canCancel={canCancelSaleAsCashier(detailSale)}
          cancelBlockedHint={
            !canCancelSaleAsCashier(detailSale) && !detailSale.cancelled_at
              ? cashierSaleCancelBlockedMessage()
              : undefined
          }
          onCancelled={() => router.refresh()}
        />
      )}

      {printPortal}
    </div>
  );
}
