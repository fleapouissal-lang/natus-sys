"use client";

import { Delete } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const BILL_DENOMINATIONS = [200, 100, 50, 20, 10, 5, 1];

function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return "";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

function addDenomination(current: string, bill: number): string {
  return formatAmount(parseAmount(current) + bill);
}

export function CashChangeCalculator({
  total,
  value,
  onChange,
  compact = false,
  dense = false,
  className,
}: {
  total: number;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const received = parseAmount(value);
  const change = received - total;
  const sufficient = received >= total;
  const shortfall = total - received;

  function appendKey(key: string) {
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." || key === ",") {
      if (value.includes(".") || value.includes(",")) return;
      onChange(value ? `${value}.` : "0.");
      return;
    }
    if (value === "0") {
      onChange(key);
      return;
    }
    const [, decimals = ""] = value.replace(",", ".").split(".");
    if (decimals.length >= 2) return;
    onChange(value + key);
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  const bottomKeys = ["C", "0", "."] as const;

  return (
    <div
      className={cn(
        "rounded-lg border border-primary/25 bg-champagne/15",
        dense ? "p-2" : compact ? "p-2.5" : "p-3",
        !dense && !compact && "mt-3",
        className
      )}
    >
      <div className={cn(dense ? "flex items-end justify-between gap-3" : "block")}>
        <div className={cn(dense ? "min-w-0 flex-1" : "w-full")}>
          <p className={cn("font-medium text-muted", dense ? "text-[10px]" : "text-xs")}>
            Montant remis
          </p>
          <div
            className={cn(
              "rounded-lg border border-border bg-surface px-2.5 text-right font-mono font-bold tabular-nums text-foreground",
              dense ? "mt-1 py-1.5 text-lg" : compact ? "mt-1.5 py-2 text-xl" : "mt-1.5 py-2.5 text-2xl"
            )}
            aria-live="polite"
          >
            {value || "0"}
            <span
              className={cn(
                "ml-1 font-semibold text-muted",
                dense ? "text-xs" : compact ? "text-sm" : "text-base"
              )}
            >
              DH
            </span>
          </div>
        </div>

        {dense && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium text-muted">À rendre</p>
            <p
              className={cn(
                "mt-1 text-lg font-bold tabular-nums leading-none",
                received <= 0
                  ? "text-muted"
                  : sufficient
                    ? "text-success"
                    : "text-danger"
              )}
            >
              {received <= 0 ? "—" : sufficient ? formatCurrency(change) : "—"}
            </p>
          </div>
        )}
      </div>

      {!compact && !dense && (
        <p className="mt-2 text-xs text-muted">
          Touchez un billet ou une pièce pour l&apos;ajouter au montant remis
        </p>
      )}

      <div
        className={cn(
          "grid grid-cols-4",
          dense ? "mt-1.5 gap-1" : compact ? "mt-2 gap-1.5" : "mt-2 gap-1.5"
        )}
      >
        {BILL_DENOMINATIONS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(addDenomination(value, amount))}
            className={cn(
              "rounded-md border border-border bg-surface font-semibold transition-colors hover:border-primary/60 hover:bg-champagne/30 cursor-pointer",
              dense ? "py-1 text-[10px]" : compact ? "py-1.5 text-[11px]" : "py-2 text-xs"
            )}
          >
            +{amount}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(formatAmount(total))}
          className={cn(
            "rounded-md border border-primary/40 bg-champagne/40 font-semibold text-primary transition-colors hover:bg-champagne/60 cursor-pointer",
            dense ? "py-1 text-[10px]" : compact ? "py-1.5 text-[11px]" : "py-2 text-xs"
          )}
        >
          Exact
        </button>
      </div>

      <div className={cn("grid grid-cols-3", dense ? "mt-1.5 gap-1" : "mt-2 gap-1.5")}>
        {(dense ? keys : [...keys, "C", "0", "."]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => appendKey(key)}
            className={cn(
              "flex items-center justify-center rounded-md border font-semibold transition-colors cursor-pointer",
              dense ? "h-8 text-sm" : compact ? "h-9 text-sm" : "h-11 text-base",
              key === "C"
                ? "border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
                : "border-border bg-surface hover:border-primary/60 hover:bg-page"
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {dense ? (
        <div className="mt-1 grid grid-cols-4 gap-1">
          {bottomKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendKey(key)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md border text-sm font-semibold transition-colors cursor-pointer",
                key === "C"
                  ? "border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
                  : "border-border bg-surface hover:border-primary/60 hover:bg-page"
              )}
            >
              {key}
            </button>
          ))}
          <button
            type="button"
            onClick={() => appendKey("⌫")}
            className="flex h-8 items-center justify-center rounded-md border border-border bg-surface text-xs font-medium transition-colors hover:border-primary/60 hover:bg-page cursor-pointer"
            aria-label="Effacer le dernier chiffre"
          >
            <Delete className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => appendKey("⌫")}
          className={cn(
            "mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-surface font-medium transition-colors hover:border-primary/60 hover:bg-page cursor-pointer",
            compact ? "h-8 text-xs" : "h-10 text-sm"
          )}
          aria-label="Effacer le dernier chiffre"
        >
          <Delete className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          Effacer
        </button>
      )}

      {!dense && (
        <div className={cn("border-t border-dashed border-border", compact ? "mt-2 pt-2" : "mt-3 pt-3")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted">À rendre au client</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                compact ? "text-lg" : "text-xl",
                received <= 0
                  ? "text-muted"
                  : sufficient
                    ? "text-success"
                    : "text-danger"
              )}
            >
              {received <= 0 ? "—" : sufficient ? formatCurrency(change) : "—"}
            </span>
          </div>
          {received > 0 && !sufficient && (
            <p className="mt-1 text-right text-xs font-medium text-danger">
              Manque {formatCurrency(shortfall)}
            </p>
          )}
        </div>
      )}

      {dense && received > 0 && !sufficient && (
        <p className="mt-1.5 text-right text-[11px] font-medium text-danger">
          Manque {formatCurrency(shortfall)}
        </p>
      )}
    </div>
  );
}

export function parseCashReceived(raw: string): number {
  return parseAmount(raw);
}
