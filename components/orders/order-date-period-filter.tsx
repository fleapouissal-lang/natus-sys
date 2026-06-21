"use client";

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
}: {
  activePreset: OrderDatePreset | "custom";
  onPresetChange: (preset: OrderDatePreset) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ORDER_DATE_PRESETS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPresetChange(id)}
          className={natusFilterChipClass(activePreset === id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
