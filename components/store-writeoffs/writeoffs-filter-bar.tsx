"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DateInputField } from "@/components/ui/date-input-field";
import { CityStoreFilterBar } from "@/components/stores/city-store-filter-bar";
import { OrderDatePeriodFilter } from "@/components/orders/order-date-period-filter";
import {
  detectOrderDatePreset,
  orderDatePresetLabel,
  orderDatePresetToKeys,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import type { WriteoffsFilterScope } from "@/lib/store-writeoffs/page-data";

function WriteoffsFilterBarInner({
  filter,
  resultCount,
}: {
  filter: WriteoffsFilterScope;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeDatePreset = useMemo(
    () => detectOrderDatePreset(filter.dateFrom, filter.dateTo),
    [filter.dateFrom, filter.dateTo]
  );

  const showLocationFilters = filter.showCityFilter || filter.showStoreFilter;

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function applyDatePreset(preset: OrderDatePreset) {
    const { from, to } = orderDatePresetToKeys(preset);
    pushParams({ from: from || undefined, to: to || undefined });
  }

  function resetDates() {
    pushParams({ from: undefined, to: undefined });
  }

  const hasDateFilter = Boolean(filter.dateFrom || filter.dateTo);
  const periodHint =
    activeDatePreset !== "all" ? orderDatePresetLabel(activeDatePreset) : undefined;

  return (
    <div className="space-y-4">
      <Card className="natus-filter-bar space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Filtrer les retours</p>
              <p className="text-xs text-muted">
                {resultCount} demande{resultCount !== 1 ? "s" : ""}
                {periodHint ? ` — ${periodHint}` : ""}
                {filter.scopeLabel ? ` · ${filter.scopeLabel}` : ""}
              </p>
            </div>
          </div>
          {hasDateFilter && (
            <button
              type="button"
              onClick={resetDates}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              Effacer les dates
            </button>
          )}
        </div>

        <OrderDatePeriodFilter
          activePreset={activeDatePreset}
          onPresetChange={applyDatePreset}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl lg:grid-cols-2">
          <DateInputField
            label="Date début"
            value={filter.dateFrom}
            onChange={(from) => pushParams({ from: from || undefined })}
          />
          <DateInputField
            label="Date fin"
            value={filter.dateTo}
            onChange={(to) => pushParams({ to: to || undefined })}
          />
        </div>
      </Card>

      {showLocationFilters && (
        <CityStoreFilterBar
          stores={filter.stores}
          selectedCity={filter.selectedCity}
          selectedStoreId={filter.selectedStoreId}
          showCity={filter.showCityFilter}
          showStore={filter.showStoreFilter}
          title="Magasin"
          description={
            filter.showCityFilter
              ? "Choisissez une ville puis un magasin"
              : "Filtrez par magasin de votre périmètre"
          }
        />
      )}
    </div>
  );
}

export function WriteoffsFilterBar(props: {
  filter: WriteoffsFilterScope;
  resultCount: number;
}) {
  return (
    <Suspense fallback={null}>
      <WriteoffsFilterBarInner {...props} />
    </Suspense>
  );
}
