"use client";

import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import { Input } from "@/components/ui/input";
import { MOROCCAN_BANKS } from "@/lib/constants/banks";
import { cn, formatCurrency } from "@/lib/utils";

function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return 0;
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function parseChequeAmount(raw: string): number {
  return parseAmount(raw);
}

function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (rounded <= 0) return "";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2);
}

export type ChequePaymentFormValue = {
  bankName: string;
  chequeNumber: string;
  chequeAmount: string;
  drawerName: string;
  issueDate: string;
  notes: string;
};

export function ChequePaymentForm({
  total,
  value,
  onChange,
  checkout = false,
  className,
}: {
  total: number;
  value: ChequePaymentFormValue;
  onChange: (value: ChequePaymentFormValue) => void;
  checkout?: boolean;
  className?: string;
}) {
  const amount = parseAmount(value.chequeAmount);
  const sufficient = amount >= total;
  const shortfall = total - amount;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!keyboardOpen) return;
    const timer = window.setTimeout(() => {
      keyboardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [keyboardOpen]);

  useEffect(() => {
    if (!value.chequeAmount) {
      setKeyboardOpen(false);
    }
  }, [value.chequeAmount]);

  function patch(partial: Partial<ChequePaymentFormValue>) {
    onChange({ ...value, ...partial });
  }

  function appendAmountKey(key: string) {
    const current = value.chequeAmount;
    if (key === "C") {
      patch({ chequeAmount: "" });
      return;
    }
    if (key === "⌫") {
      patch({ chequeAmount: current.slice(0, -1) });
      return;
    }
    if (key === "." || key === ",") {
      if (current.includes(".") || current.includes(",")) return;
      patch({ chequeAmount: current ? `${current}.` : "0." });
      return;
    }
    if (current === "0") {
      patch({ chequeAmount: key });
      return;
    }
    const [, decimals = ""] = current.replace(",", ".").split(".");
    if (decimals.length >= 2) return;
    patch({ chequeAmount: current + key });
  }

  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "."];

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/30 bg-gradient-to-b from-champagne/25 to-champagne/10 p-4 shadow-[0_8px_24px_rgba(179,140,74,0.12)]",
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Paiement par chèque
      </p>

      <div className="mt-3 space-y-3">
        <SelectMenu
          label="Banque"
          value={value.bankName}
          onChange={(bankName) => patch({ bankName })}
          options={MOROCCAN_BANKS.map((bank) => ({ value: bank, label: bank }))}
          required
        />

        <Input
          label="N° de chèque"
          value={value.chequeNumber}
          onChange={(e) => patch({ chequeNumber: e.target.value.replace(/\s/g, "") })}
          placeholder="Numéro du chèque"
          inputMode="numeric"
          required
        />

        <Input
          label="Nom du tireur (optionnel)"
          value={value.drawerName}
          onChange={(e) => patch({ drawerName: e.target.value })}
          placeholder="Client ou société"
        />

        <Input
          label="Date du chèque (optionnel)"
          type="date"
          value={value.issueDate}
          onChange={(e) => patch({ issueDate: e.target.value })}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Montant du chèque
        </p>
        <button
          type="button"
          onClick={() => setKeyboardOpen((open) => !open)}
          className={cn(
            "mt-2 w-full rounded-xl border bg-white px-3 py-3 text-right font-mono text-3xl font-bold tabular-nums shadow-inner transition-colors cursor-pointer",
            keyboardOpen
              ? "border-primary ring-2 ring-primary/25"
              : "border-primary/25 hover:border-primary/50"
          )}
          aria-expanded={keyboardOpen}
          aria-label="Saisir le montant du chèque"
        >
          {value.chequeAmount || "0"}
          <span className="ml-1 text-lg font-semibold text-muted">DH</span>
        </button>
        <p className="mt-2 text-xs text-muted">
          Total à payer : <strong>{formatCurrency(total)}</strong>
          {!keyboardOpen ? (
            <span className="block mt-0.5">Toucher le montant pour ouvrir le clavier</span>
          ) : null}
        </p>
      </div>

      {keyboardOpen && (
        <div ref={keyboardRef} className="mt-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => appendAmountKey(key)}
                className={cn(
                  "flex h-12 items-center justify-center rounded-xl border text-lg font-semibold transition-colors cursor-pointer",
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
              onClick={() => {
                patch({ chequeAmount: formatAmount(total) });
                setKeyboardOpen(false);
              }}
              className="col-span-3 rounded-xl border border-primary/40 bg-champagne/40 py-2.5 text-sm font-bold text-primary hover:bg-champagne/60 cursor-pointer"
            >
              Montant exact ({formatCurrency(total)})
            </button>
            <button
              type="button"
              onClick={() => appendAmountKey("⌫")}
              className="col-span-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:border-primary/60 hover:bg-page cursor-pointer"
            >
              <Delete className="h-4 w-4" />
              Effacer le montant
            </button>
          </div>
          <button
            type="button"
            onClick={() => setKeyboardOpen(false)}
            className="w-full rounded-lg border border-border py-2 text-xs font-semibold text-muted hover:bg-page cursor-pointer"
          >
            Fermer le clavier
          </button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-primary/20 bg-white/70 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted">Montant chèque vs total</span>
          <span
            className={cn(
              "text-xl font-bold tabular-nums",
              amount <= 0 ? "text-muted" : sufficient ? "text-success" : "text-danger"
            )}
          >
            {amount <= 0 ? "—" : sufficient ? "OK" : "Insuffisant"}
          </span>
        </div>
        {amount > 0 && !sufficient && (
          <p className="mt-1 text-right text-xs font-medium text-danger">
            Manque {formatCurrency(shortfall)}
          </p>
        )}
      </div>

      {checkout && (
        <Input
          label="Note (optionnel)"
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          className="mt-3"
          placeholder="Remarque sur le chèque"
        />
      )}
    </div>
  );
}

export function isChequePaymentReady(
  total: number,
  value: ChequePaymentFormValue
): boolean {
  return (
    Boolean(value.bankName.trim()) &&
    Boolean(value.chequeNumber.trim()) &&
    parseAmount(value.chequeAmount) >= total
  );
}

export const EMPTY_CHEQUE_PAYMENT: ChequePaymentFormValue = {
  bankName: "",
  chequeNumber: "",
  chequeAmount: "",
  drawerName: "",
  issueDate: "",
  notes: "",
};
