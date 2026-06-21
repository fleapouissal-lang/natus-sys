"use client";

import { Delete } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const QUICK_AMOUNTS = [200, 100, 50, 20];

function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function CashChangeCalculator({
  total,
  value,
  onChange,
}: {
  total: number;
  value: string;
  onChange: (value: string) => void;
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

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "."];

  return (
    <div className="mt-3 rounded-lg border border-primary/25 bg-champagne/15 p-3">
      <p className="text-xs font-medium text-muted">Montant remis par le client</p>
      <div
        className="mt-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-right font-mono text-2xl font-bold tabular-nums text-foreground"
        aria-live="polite"
      >
        {value || "0"}
        <span className="ml-1 text-base font-semibold text-muted">DH</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(String(amount))}
            className="rounded-md border border-border bg-surface py-1.5 text-xs font-semibold transition-colors hover:border-primary/60 hover:bg-champagne/30 cursor-pointer"
          >
            {amount} DH
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(total.toFixed(2))}
          className="rounded-md border border-primary/40 bg-champagne/40 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-champagne/60 cursor-pointer"
        >
          Exact
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => appendKey(key)}
            className={cn(
              "flex h-11 items-center justify-center rounded-md border text-base font-semibold transition-colors cursor-pointer",
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
          className="col-span-3 flex h-10 items-center justify-center gap-1.5 rounded-md border border-border bg-surface text-sm font-medium transition-colors hover:border-primary/60 hover:bg-page cursor-pointer"
          aria-label="Effacer le dernier chiffre"
        >
          <Delete className="h-4 w-4" />
          Effacer
        </button>
      </div>

      <div className="mt-3 border-t border-dashed border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted">À rendre au client</span>
          <span
            className={cn(
              "text-xl font-bold tabular-nums",
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
    </div>
  );
}

export function parseCashReceived(raw: string): number {
  return parseAmount(raw);
}
