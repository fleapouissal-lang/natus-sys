"use client";

import { CalendarRange } from "lucide-react";
import { DateInputField } from "@/components/ui/date-input-field";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";

export type DashboardGlobalPeriod = "all" | "today" | "week" | "month" | "custom";

export const DASHBOARD_GLOBAL_PERIODS: {
  id: DashboardGlobalPeriod;
  label: string;
}[] = [
  { id: "all", label: "Toutes les périodes" },
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "custom", label: "Personnalisé" },
];

export function DashboardPeriodFilter({
  period,
  customFrom,
  customTo,
  periodLabel,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
}: {
  period: DashboardGlobalPeriod;
  customFrom: string;
  customTo: string;
  periodLabel: string;
  onPeriodChange: (period: DashboardGlobalPeriod) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}) {
  return (
    <div className="natus-filter-bar overflow-visible rounded-2xl p-4 md:rounded-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <CalendarRange className="h-4 w-4" />
          Période d&apos;analyse
        </p>
        <p className="text-sm text-muted">{periodLabel}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DASHBOARD_GLOBAL_PERIODS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPeriodChange(id)}
            className={natusFilterChipClass(period === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-xl lg:items-end">
          <DateInputField
            label="Date début"
            value={customFrom}
            onChange={onCustomFromChange}
          />
          <DateInputField label="Date fin" value={customTo} onChange={onCustomToChange} />
        </div>
      )}
    </div>
  );
}
