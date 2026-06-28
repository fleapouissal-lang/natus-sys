"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DateInputField } from "@/components/ui/date-input-field";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { cn } from "@/lib/utils";

export function ClosureHistoryFilterBar({
  dateFrom,
  dateTo,
  search,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onReset,
  resultCount,
  hasActiveFilters,
  dateMin,
  dateMax,
  className,
}: {
  dateFrom: string;
  dateTo: string;
  search: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onReset: () => void;
  resultCount: number;
  hasActiveFilters: boolean;
  dateMin?: string;
  dateMax?: string;
  className?: string;
}) {
  const summary = `${resultCount} rapport${resultCount !== 1 ? "s" : ""}`;

  return (
    <FilterTogglePanel toggleLabel="Filtrer les clôtures" summary={summary}>
      <div className={cn("natus-filter-bar overflow-visible p-4", className)}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary">Filtrer les clôtures</p>
          <div className="flex flex-wrap items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline cursor-pointer"
              >
                Tout effacer
              </button>
            )}
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">{resultCount}</span> rapport
              {resultCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <Input
            label="Recherche"
            icon={Search}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="N° de clôture, date, magasin, demandeur..."
            inputSize="sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
          <DateInputField
            label="Date début"
            value={dateFrom}
            onChange={onDateFromChange}
            minDate={dateMin}
            maxDate={dateMax}
          />
          <DateInputField
            label="Date fin"
            value={dateTo}
            onChange={onDateToChange}
            minDate={dateMin}
            maxDate={dateMax}
          />
        </div>
      </div>
    </FilterTogglePanel>
  );
}
