"use client";

import { DateInputField } from "@/components/ui/date-input-field";
import { natusFilterChipClass } from "@/components/ui/natus-filter-chip";
import {
  STORE_TRACKING_PRESETS,
  type StoreTrackingPreset,
} from "@/lib/store-tracking-period";

export function StoreTrackingPeriodFilter({
  preset,
  customFrom,
  customTo,
  periodLabel,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: {
  preset: StoreTrackingPreset;
  customFrom: string;
  customTo: string;
  periodLabel: string;
  onPresetChange: (preset: StoreTrackingPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}) {
  return (
    <div className="natus-filter-bar overflow-visible p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">Période de suivi</p>
        <p className="text-sm text-muted">{periodLabel}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STORE_TRACKING_PRESETS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPresetChange(id)}
            className={natusFilterChipClass(preset === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
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
