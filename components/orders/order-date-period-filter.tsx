"use client";

import { DateInputField } from "@/components/ui/date-input-field";
import { cn } from "@/lib/utils";
import {
  ORDER_DATE_PRESETS,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";

export function OrderDatePeriodFilter({
  activePreset,
  onPresetChange,
  className,
  customRange,
  presets,
}: {
  activePreset: OrderDatePreset | "custom";
  onPresetChange: (preset: OrderDatePreset) => void;
  className?: string;
  customRange?: {
    open: boolean;
    dateFrom: string;
    dateTo: string;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onOpen: () => void;
  };
  /** Restreint les boutons de période affichés (par défaut : tous). */
  presets?: OrderDatePreset[];
}) {
  const customActive = activePreset === "custom" || Boolean(customRange?.open);
  const presetList = presets
    ? ORDER_DATE_PRESETS.filter((p) => presets.includes(p.id))
    : ORDER_DATE_PRESETS;

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      {presetList.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPresetChange(id)}
          className={natusFilterChipClass(activePreset === id && !customRange?.open)}
        >
          {label}
        </button>
      ))}
      {customRange && (
        <>
          <button
            type="button"
            onClick={customRange.onOpen}
            className={natusFilterChipClass(customActive)}
          >
            Date
          </button>
          {customRange.open && (
            <>
              <div className="w-full sm:w-auto sm:min-w-[9.5rem]">
                <DateInputField
                  label="Date début"
                  value={customRange.dateFrom}
                  onChange={customRange.onDateFromChange}
                />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[9.5rem]">
                <DateInputField
                  label="Date fin"
                  value={customRange.dateTo}
                  onChange={customRange.onDateToChange}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
