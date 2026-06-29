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
  presets = STORE_TRACKING_PRESETS,
  minDate,
  maxDate,
}: {
  preset: StoreTrackingPreset;
  customFrom: string;
  customTo: string;
  periodLabel: string;
  onPresetChange: (preset: StoreTrackingPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  presets?: { id: StoreTrackingPreset; label: string }[];
  /** Borne min (ex. J-3) — dates antérieures désactivées dans le calendrier. */
  minDate?: string;
  /** Borne max (ex. aujourd'hui). */
  maxDate?: string;
}) {
  return (
    <div className="natus-filter-bar overflow-visible rounded-2xl p-4 md:rounded-lg">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-primary">Période de suivi</p>
        <p className="text-sm text-muted">{periodLabel}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map(({ id, label }) => (
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
            minDate={minDate}
            maxDate={maxDate}
          />
          <DateInputField
            label="Date fin"
            value={customTo}
            onChange={onCustomToChange}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  );
}
