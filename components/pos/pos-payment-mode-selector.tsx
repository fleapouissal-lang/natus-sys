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
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        Mode de paiement
      </p>

      <div
        className={cn(
          "grid gap-2",
          options.length >= 3 ? "grid-cols-3" : "grid-cols-2"
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
                "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 transition-all cursor-pointer",
                "disabled:cursor-not-allowed disabled:opacity-45",
                selected
                  ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#faea9f] shadow-md"
                  : "border-border/80 bg-surface text-foreground hover:border-primary/35 hover:bg-champagne/15"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                  selected
                    ? "border-[#faea9f]/35 bg-[#faea9f]/10 text-[#faea9f]"
                    : "border-primary/20 bg-page text-muted"
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={selected ? 2.25 : 2} />
              </span>
              <span
                className={cn(
                  "text-center text-xs font-bold leading-tight",
                  selected ? "text-[#faea9f]" : "text-foreground"
                )}
              >
                {label}
              </span>
              {selected && (
                <span
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#faea9f] shadow-[0_0_0_2px_rgba(250,234,161,0.35)]"
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
