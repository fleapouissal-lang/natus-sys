"use client";

import { cn } from "@/lib/utils";
import {
  ORDER_DATE_PRESETS,
  type OrderDatePreset,
} from "@/lib/store-tracking-period";

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
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            activePreset === id
              ? "border-primary bg-primary text-black"
              : "border-border bg-surface text-foreground hover:border-primary/50"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
