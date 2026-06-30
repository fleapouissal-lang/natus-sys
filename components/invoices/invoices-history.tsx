"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { InvoicesBulkActions } from "@/components/invoices/invoices-bulk-actions";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  ORDER_DATE_PRESETS,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { isSaleInvoiceValidated } from "@/lib/sales/invoice-validation";
import { saleInvoiceCustomerName } from "@/lib/sales/invoice-customer";
import { validateSaleInvoice } from "@/lib/actions";
import { getExportableInvoices } from "@/lib/sales/export-invoices";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import { toLocalDateKey } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { PaymentMethod, Store } from "@/lib/types";

export function InvoicesHistory({
  sales,
  detailBasePath,
  scopeLabel,
  stores,
  selectedStoreId,
  showStore = false,
  showCashier = false,
  canValidateInvoices = false,
  defaultDatePreset = "all",
  historyMinDate,
}: {
  sales: InvoiceSale[];
  detailBasePath: string;
  scopeLabel: string;
  stores?: Store[];
  selectedStoreId?: string;
  showStore?: boolean;
  showCashier?: boolean;
  canValidateInvoices?: boolean;
  defaultDatePreset?: OrderDatePreset;
  /** Borne basse (compte caisse magasin) — ex. 45 derniers jours */
  historyMinDate?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const pendingAccessNotice = searchParams.get("pending") === "1";

  const initialRange = useMemo(() => {
    if (historyMinDate) {
      return {
        from: historyMinDate,
        to: toLocalDateKey(new Date()),
      };
    }
    return orderDatePresetToKeys(defaultDatePreset);
  }, [defaultDatePreset, historyMinDate]);

  const datePresets = useMemo(() => {
    if (!historyMinDate) return undefined;
    return ORDER_DATE_PRESETS.filter(({ id }) => id !== "all").map((p) => p.id);
  }, [historyMinDate]);

  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [customDateOpen, setCustomDateOpen] = useState(
    () => detectOrderDatePreset(initialRange.from, initialRange.to) === "custom"
  );
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      const saleDay = toLocalDateKey(sale.created_at);
      if (dateFrom && saleDay < dateFrom) return false;
      if (dateTo && saleDay > dateTo) return false;

      if (query) {
        const invoiceNo = saleDocumentNumber(sale.id).toLowerCase();
        const customer = saleInvoiceCustomerName(sale).toLowerCase();
        const orderNo = sale.shopify_orders?.order_number?.toLowerCase() || "";
        if (
          !invoiceNo.includes(query) &&
          !customer.includes(query) &&
          !orderNo.includes(query) &&
          !sale.id.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [sales, dateFrom, dateTo, paymentFilter, search]);

  const pendingCount = useMemo(
    () => sales.filter((sale) => !sale.cancelled_at && !isSaleInvoiceValidated(sale)).length,
    [sales]
  );

  const hasDateFilter =
    dateFrom !== initialRange.from || dateTo !== initialRange.to;
  const hasFilters = Boolean(hasDateFilter || paymentFilter || search);

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    setDateFrom(historyMinDate && from && from < historyMinDate ? historyMinDate : from);
    setDateTo(to);
    setCustomDateOpen(false);
  }

  function openCustomDateRange() {
    setCustomDateOpen(true);
    if (activeDatePreset !== "custom") {
      const { from, to } = orderDatePresetToKeys("month");
      setDateFrom(historyMinDate && from < historyMinDate ? historyMinDate : from);
      setDateTo(to);
    }
  }

  function handleDateFromChange(value: string) {
    if (historyMinDate && value && value < historyMinDate) {
      setDateFrom(historyMinDate);
      return;
    }
    setDateFrom(value);
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
  }

  function resetFilters() {
    setDateFrom(initialRange.from);
    setDateTo(initialRange.to);
    setCustomDateOpen(
      detectOrderDatePreset(initialRange.from, initialRange.to) === "custom"
    );
    setPaymentFilter("");
    setSearch("");
  }

  function handleStoreChange(storeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (storeId) {
      params.set("store", storeId);
    } else {
      params.delete("store");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleValidate(saleId: string) {
    setActionError("");
    setValidatingId(saleId);
    startTransition(async () => {
      const result = await validateSaleInvoice(saleId);
      setValidatingId(null);
      if ("error" in result && result.error) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const periodHint =
    activeDatePreset !== "all"
      ? orderDatePresetLabel(activeDatePreset)
      : undefined;

  const paginationKey = [dateFrom, dateTo, paymentFilter, search, selectedStoreId].join("|");

  const listPagination = usePagination(filtered, DEFAULT_PAGE_SIZE, paginationKey);

  const exportableFiltered = useMemo(
    () => getExportableInvoices(filtered),
    [filtered]
  );

  const selectedSales = useMemo(
    () => exportableFiltered.filter((sale) => selectedIds.includes(sale.id)),
    [exportableFiltered, selectedIds]
  );

  const toggleSale = useCallback((saleId: string) => {
    setSelectedIds((current) =>
      current.includes(saleId)
        ? current.filter((id) => id !== saleId)
        : [...current, saleId]
    );
  }, []);

  const togglePage = useCallback((saleIds: string[], selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of saleIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return [...next];
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(exportableFiltered.map((sale) => sale.id));
  }, [exportableFiltered]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return (
    <div className="space-y-6">
      {pendingAccessNotice && !canValidateInvoices && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Cette facture n&apos;est pas encore validée par le directeur et n&apos;est pas accessible.
        </p>
      )}

      {canValidateInvoices && pendingCount > 0 && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {pendingCount} facture{pendingCount !== 1 ? "s" : ""} en attente de validation — invisible
          {pendingCount !== 1 ? "s" : ""} pour le caissier et le gérant jusqu&apos;à validation.
        </p>
      )}

      {actionError && (
        <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{actionError}</p>
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
        hideDateRangeFields
        stores={stores && stores.length > 1 ? stores : undefined}
        selectedStoreId={selectedStoreId}
        onStoreChange={stores && stores.length > 1 ? handleStoreChange : undefined}
        storeAllowAll
        toggleLabel="Filtrer les factures"
        periodFilter={
          <OrderDatePeriodFilter
            activePreset={activeDatePreset}
            onPresetChange={applyDatePreset}
            presets={datePresets}
            customRange={{
              open: customDateOpen,
              dateFrom,
              dateTo,
              minDate: historyMinDate,
              onDateFromChange: handleDateFromChange,
              onDateToChange: handleDateToChange,
              onOpen: openCustomDateRange,
            }}
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

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-muted">Recherche</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="N° facture, client, commande…"
          className="natus-field w-full bg-surface px-4 py-3 text-base"
        />
      </label>

      <Card padding={false}>
        <div className="p-6 space-y-4">
          <CardHeader
            title="Factures"
            description={`${filtered.length} facture${filtered.length > 1 ? "s" : ""} — ${scopeLabel}${exportableFiltered.length !== filtered.length ? ` · ${exportableFiltered.length} exportable${exportableFiltered.length > 1 ? "s" : ""}` : ""}`}
          />

          {exportableFiltered.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">
                Sélection multiple — cochez les factures validées puis téléchargez-les une par une.
              </span>
              {exportableFiltered.length > DEFAULT_PAGE_SIZE && (
                <Button type="button" size="sm" variant="ghost" onClick={selectAllFiltered}>
                  Tout sélectionner ({exportableFiltered.length})
                </Button>
              )}
            </div>
          )}

          {exportableFiltered.length === 0 && filtered.length > 0 && (
            <p className="rounded-lg border border-border bg-primary-light/20 px-4 py-3 text-sm text-muted">
              Aucune facture exportable dans cette liste
              {canValidateInvoices
                ? " — validez les factures en attente pour pouvoir les sélectionner."
                : " — seules les factures validées et non annulées sont exportables."}
            </p>
          )}

          <InvoicesBulkActions
            selectedSales={selectedSales}
            scopeLabel={scopeLabel}
            onClearSelection={clearSelection}
          />

          <InvoicesTable
            sales={listPagination.paginated}
            detailBasePath={detailBasePath}
            showStore={showStore}
            showCashier={showCashier}
            canValidateInvoices={canValidateInvoices}
            validatingId={isPending ? validatingId : null}
            onValidate={canValidateInvoices ? handleValidate : undefined}
            selectedIds={selectedIds}
            onToggleSale={toggleSale}
            onTogglePage={togglePage}
            showPagination={false}
            selectedStoreId={selectedStoreId}
          />
        </div>
      </Card>
    </div>
  );
}
