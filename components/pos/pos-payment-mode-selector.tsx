"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/types";

export type PosPaymentOption = {
  id: PaymentMethod;
  label: string;
  icon: LucideIcon;
};

export function PosPaymentModeSelector({
  value,
  options,
  onChange,
  disabled = false,
  compact = false,
  className,
}: {
  value: PaymentMethod;
  options: PosPaymentOption[];
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <p
        className={cn(
          "font-semibold uppercase tracking-[0.14em] text-muted",
          compact ? "mb-2 text-[10px]" : "mb-2.5 text-[11px]"
        )}
      >
        Mode de paiement
      </p>

      <div
        className={cn(
          "natus-pos-pay-segment",
          compact && "natus-pos-pay-segment--compact"
        )}
        role="tablist"
        aria-label="Mode de paiement"
      >
        {options.map(({ id, label, icon: Icon }) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => onChange(id)}
              className={cn(
                "natus-pos-pay-segment-btn",
                selected && "natus-pos-pay-segment-btn--active"
              )}
            >
              <span className="natus-pos-pay-segment-icon" aria-hidden>
                <Icon strokeWidth={selected ? 2.25 : 2} />
              </span>
              <span className="natus-pos-pay-segment-label">{label}</span>
              {selected && (
                <span className="natus-pos-pay-segment-dot" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
