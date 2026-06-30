"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination-bar";
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
  cashierSaleCancelBlockedMessage,
} from "@/lib/sales/sale-cancel";
import { DEFAULT_PAGE_SIZE } from "@/lib/use-pagination";
import type { PaymentMethod, Sale } from "@/lib/types";

const DEFAULT_DATE_PRESET: OrderDatePreset = "today";

const PARAM_FROM = "vfrom";
const PARAM_TO = "vto";
const PARAM_PAY = "vpay";
const PARAM_SEARCH = "vq";
const PARAM_PAGE = "vpage";

function saleMatchesSearch(sale: Sale, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    sale.id,
    sale.id.slice(0, 8),
    sale.customer_name,
    sale.customer_phone,
    sale.customer_email,
    sale.customer_ice,
    sale.customers?.full_name,
    sale.customers?.card_number,
    sale.customers?.phone,
    sale.profiles?.full_name,
    sale.profiles?.email,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(needle));
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sales, setSales] = useState(initialSales);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const initialToday = useMemo(() => orderDatePresetToKeys(DEFAULT_DATE_PRESET), []);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const { reprintSale, printingSaleId, printPortal } = useSaleTicketReprint();

  const dateFrom = searchParams.get(PARAM_FROM) || initialToday.from;
  const dateTo = searchParams.get(PARAM_TO) || initialToday.to;
  const paymentFilter = (searchParams.get(PARAM_PAY) as "" | PaymentMethod) || "";
  const search = searchParams.get(PARAM_SEARCH) || "";
  const page = Math.max(1, Number(searchParams.get(PARAM_PAGE)) || 1);

  const updateParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (resetPage) params.delete(PARAM_PAGE);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

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

      if (!saleMatchesSearch(sale, search)) return false;

      return true;
    });
  }, [windowedSales, dateFrom, dateTo, paymentFilter, search]);

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
  const hasFilters = Boolean(hasDateFilter || paymentFilter || search);

  const dateParamValue = useCallback(
    (key: string, value: string) =>
      value === (key === PARAM_FROM ? initialToday.from : initialToday.to)
        ? null
        : value,
    [initialToday]
  );

  function applyDatePreset(preset: OrderDatePreset) {
    if (preset === "all") {
      updateParams({
        [PARAM_FROM]: dateParamValue(PARAM_FROM, historyBounds.minDate),
        [PARAM_TO]: dateParamValue(PARAM_TO, historyBounds.maxDate),
      });
      return;
    }

    const { from, to } = orderDatePresetToKeys(preset);
    const clampedFrom = clampDateToCashierSalesWindow(from || historyBounds.minDate, historyBounds);
    const clampedToRaw = clampDateToCashierSalesWindow(to || historyBounds.maxDate, historyBounds);
    const clampedTo = clampedToRaw > clampedFrom ? clampedToRaw : clampedFrom;
    updateParams({
      [PARAM_FROM]: dateParamValue(PARAM_FROM, clampedFrom),
      [PARAM_TO]: dateParamValue(PARAM_TO, clampedTo),
    });
  }

  function handleDateFromChange(value: string) {
    const clamped = clampDateToCashierSalesWindow(value, historyBounds);
    updateParams({ [PARAM_FROM]: dateParamValue(PARAM_FROM, clamped) });
  }

  function handleDateToChange(value: string) {
    const clamped = clampDateToCashierSalesWindow(value, historyBounds);
    updateParams({ [PARAM_TO]: dateParamValue(PARAM_TO, clamped) });
  }

  function handlePaymentChange(value: "" | PaymentMethod) {
    updateParams({ [PARAM_PAY]: value || null });
  }

  function handleSearchChange(value: string) {
    updateParams({ [PARAM_SEARCH]: value || null });
  }

  function resetFilters() {
    updateParams({
      [PARAM_FROM]: null,
      [PARAM_TO]: null,
      [PARAM_PAY]: null,
      [PARAM_SEARCH]: null,
    });
  }

  function setPage(next: number) {
    updateParams({ [PARAM_PAGE]: next <= 1 ? null : String(next) }, false);
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

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * DEFAULT_PAGE_SIZE, safePage * DEFAULT_PAGE_SIZE),
    [filtered, safePage]
  );
  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * DEFAULT_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * DEFAULT_PAGE_SIZE, totalItems);

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
        onPaymentChange={handlePaymentChange}
        onReset={resetFilters}
        resultCount={filtered.length}
        periodHint={periodHint}
        hasActiveFilters={hasFilters}
        dateMin={historyBounds.minDate}
        dateMax={historyBounds.maxDate}
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="N° de ticket, client, téléphone, ICE..."
        periodFilter={
          <OrderDatePeriodFilter
            activePreset={activeDatePreset}
            onPresetChange={applyDatePreset}
            presets={["today"]}
          />
        }
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
          sales={paginated}
          showStore={mode !== "store"}
          showCashier={mode === "store"}
          showLineItems={false}
          onViewSale={setDetailSale}
          onPrintSale={reprintSale}
          printingSaleId={printingSaleId}
          showPagination={false}
        />

        {totalItems > 0 && (
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>

      {detailSale && (
        <SaleDetailModal
          sale={detailSale}
          onClose={() => setDetailSale(null)}
          canCancel={false}
          cancelBlockedHint={
            !detailSale.cancelled_at ? cashierSaleCancelBlockedMessage() : undefined
          }
          onCancelled={() => router.refresh()}
        />
      )}

      {printPortal}
    </div>
  );
}
