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
  className,
}: {
  value: PaymentMethod;
  options: PosPaymentOption[];
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
        Mode de paiement
      </p>
      <div className="grid w-full grid-cols-2 gap-2.5" role="tablist" aria-label="Mode de paiement">
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
                "group relative flex min-h-[3.25rem] w-full flex-row items-center justify-start gap-3 rounded-2xl border-2 px-3 py-2.5 transition-all duration-200 cursor-pointer",
                "disabled:cursor-not-allowed disabled:opacity-45",
                selected
                  ? "border-primary bg-gradient-to-r from-champagne/55 to-champagne/15 shadow-[0_4px_14px_rgba(179,140,74,0.22)]"
                  : "border-border/70 bg-surface hover:border-primary/35 hover:bg-champagne/10"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-primary/30 bg-champagne text-primary"
                    : "border-border bg-page text-muted group-hover:border-primary/25 group-hover:text-primary"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={selected ? 2.25 : 2} />
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 text-left text-sm font-bold leading-tight",
                  selected ? "text-foreground" : "text-muted group-hover:text-foreground"
                )}
              >
                {label}
              </span>
              {selected && (
                <span
                  className="absolute right-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_3px_rgba(179,140,74,0.25)]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
