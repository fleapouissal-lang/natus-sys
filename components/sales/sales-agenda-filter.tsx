"use client";

import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar, type PaginationBarProps } from "@/components/ui/pagination-bar";
import { DateInputField } from "@/components/ui/date-input-field";
import { paymentFilterOptions, storeOptions } from "@/lib/select-options";
import { cn } from "@/lib/utils";
import type { PaymentMethod, Store } from "@/lib/types";

function PaymentSelectField({
  value,
  onChange,
}: {
  value: "" | PaymentMethod;
  onChange: (v: "" | PaymentMethod) => void;
}) {
  return (
    <SelectMenu
      id="payment-filter-select"
      label="Mode de paiement"
      value={value}
      onChange={(v) => onChange(v as "" | PaymentMethod)}
      options={paymentFilterOptions()}
      size="sm"
    />
  );
}

export function SalesAgendaFilter({
  dateFrom,
  dateTo,
  paymentFilter,
  onDateFromChange,
  onDateToChange,
  onPaymentChange,
  onReset,
  resultCount,
  className,
  stores,
  selectedStoreId,
  onStoreChange,
  storeAllowAll = false,
  periodFilter,
  periodHint,
  extraActions,
  hasActiveFilters,
  collapsible = true,
  toggleLabel = "Filtrer les ventes",
  pagination,
}: {
  dateFrom: string;
  dateTo: string;
  paymentFilter: "" | PaymentMethod;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onPaymentChange: (v: "" | PaymentMethod) => void;
  onReset: () => void;
  resultCount: number;
  className?: string;
  stores?: Store[];
  selectedStoreId?: string;
  onStoreChange?: (storeId: string) => void;
  storeAllowAll?: boolean;
  periodFilter?: ReactNode;
  periodHint?: string;
  extraActions?: ReactNode;
  /** Si défini, remplace la détection automatique des filtres actifs. */
  hasActiveFilters?: boolean;
  collapsible?: boolean;
  toggleLabel?: string;
  pagination?: Pick<
    PaginationBarProps,
    "page" | "totalPages" | "rangeStart" | "rangeEnd" | "totalItems" | "onPageChange"
  >;
}) {
  const hasFilters =
    hasActiveFilters ?? Boolean(dateFrom || dateTo || paymentFilter);
  const showStore = stores && stores.length > 0 && onStoreChange;
  const summary = `${resultCount} transaction${resultCount !== 1 ? "s" : ""}${
    periodHint ? ` — ${periodHint}` : ""
  }`;

  return (
    <FilterTogglePanel
      toggleLabel={toggleLabel}
      summary={summary}
      collapsible={collapsible}
      footer={
        pagination ? (
          <PaginationBar {...pagination} variant="inline" />
        ) : undefined
      }
    >
    <div className={cn("natus-filter-bar overflow-visible p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">{toggleLabel}</p>
        <div className="flex flex-wrap items-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              Tout effacer
            </button>
          )}
          {extraActions}
          <p className="text-sm text-muted">
            <span className="font-semibold text-foreground">{resultCount}</span>{" "}
            transaction{resultCount !== 1 ? "s" : ""}
            {periodHint ? ` — ${periodHint}` : ""}
          </p>
        </div>
      </div>

      {periodFilter ? <div className="mb-4">{periodFilter}</div> : null}

      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end",
          showStore ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        {showStore && (
          <SelectMenu
            label="Magasin"
            value={selectedStoreId || ""}
            onChange={onStoreChange}
            options={storeOptions(stores, {
              includeAll: storeAllowAll,
              allLabel: "Tous les magasins",
            })}
            placeholder="Sélectionner un magasin"
            defaultIcon={MapPin}
            size="sm"
          />
        )}
        <DateInputField label="Date début" value={dateFrom} onChange={onDateFromChange} />
        <DateInputField label="Date fin" value={dateTo} onChange={onDateToChange} />
        <PaymentSelectField value={paymentFilter} onChange={onPaymentChange} />
      </div>
    </div>
    </FilterTogglePanel>
  );
}
