"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { SalesAgendaFilter } from "@/components/sales/sales-agenda-filter";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { saleDocumentNumber } from "@/components/pos/sale-document-types";
import { saleInvoiceCustomerName } from "@/lib/sales/invoice-customer";
import type { InvoiceSale } from "@/lib/sales/sale-to-document";
import { toLocalDateKey } from "@/lib/utils";
import type { PaymentMethod, Store } from "@/lib/types";

export type InvoiceTypeFilter = "" | "pos" | "order";

const TYPE_FILTER_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "pos", label: "Caisse (POS)" },
  { value: "order", label: "Commande Shopify" },
];

export function InvoicesHistory({
  sales,
  detailBasePath,
  scopeLabel,
  stores,
  selectedStoreId,
  showStore = false,
  showCashier = false,
  defaultDatePreset = "all",
}: {
  sales: InvoiceSale[];
  detailBasePath: string;
  scopeLabel: string;
  stores?: Store[];
  selectedStoreId?: string;
  showStore?: boolean;
  showCashier?: boolean;
  defaultDatePreset?: OrderDatePreset;
}) {
  const initialRange = useMemo(
    () => orderDatePresetToKeys(defaultDatePreset),
    [defaultDatePreset]
  );

  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [paymentFilter, setPaymentFilter] = useState<"" | PaymentMethod>("");
  const [typeFilter, setTypeFilter] = useState<InvoiceTypeFilter>("");
  const [search, setSearch] = useState("");
  const [hideCancelled, setHideCancelled] = useState(true);

  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      if (hideCancelled && sale.cancelled_at) return false;
      if (paymentFilter && sale.payment_method !== paymentFilter) return false;

      if (typeFilter === "pos" && sale.shopify_order_id) return false;
      if (typeFilter === "order" && !sale.shopify_order_id) return false;

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
  }, [sales, dateFrom, dateTo, paymentFilter, typeFilter, search, hideCancelled]);

  const hasDateFilter =
    dateFrom !== initialRange.from || dateTo !== initialRange.to;
  const hasFilters = Boolean(
    hasDateFilter || paymentFilter || typeFilter || search || !hideCancelled
  );

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    setDateFrom(from);
    setDateTo(to);
  }

  function resetFilters() {
    setDateFrom(initialRange.from);
    setDateTo(initialRange.to);
    setPaymentFilter("");
    setTypeFilter("");
    setSearch("");
    setHideCancelled(true);
  }

  const periodHint =
    activeDatePreset !== "all"
      ? orderDatePresetLabel(activeDatePreset)
      : undefined;

  const paginationKey = [
    dateFrom,
    dateTo,
    paymentFilter,
    typeFilter,
    search,
    hideCancelled,
    selectedStoreId,
  ].join("|");

  return (
    <div className="space-y-6">
      {stores && stores.length > 1 && (
        <StoreFilterBar
          stores={stores}
          selectedStoreId={selectedStoreId || ""}
          allowAll
        />
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
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectMenu
          id="invoice-type-filter"
          label="Type de facture"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as InvoiceTypeFilter)}
          options={TYPE_FILTER_OPTIONS}
          size="sm"
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Recherche</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="N° facture, client, commande…"
            className="rounded-[var(--radius-natus)] border border-border bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={hideCancelled}
            onChange={(event) => setHideCancelled(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Masquer les factures annulées
        </label>
      </div>

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Factures"
            description={`${filtered.length} facture${filtered.length > 1 ? "s" : ""} — ${scopeLabel}`}
          />
          <InvoicesTable
            sales={filtered}
            detailBasePath={detailBasePath}
            showStore={showStore}
            showCashier={showCashier}
            paginationKey={paginationKey}
          />
        </div>
      </Card>
    </div>
  );
}
