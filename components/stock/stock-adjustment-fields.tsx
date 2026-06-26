"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/** Refuse les valeurs négatives dans les champs quantité */
export function sanitizeStockQtyInput(value: string): string {
  if (value === "") return "";
  const cleaned = value.replace(/[^\d]/g, "");
  if (cleaned === "") return "";
  return String(parseInt(cleaned, 10));
}

function blockNegativeKey(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault();
  }
}

export function StockAdjustmentFields({
  currentStock,
  addQty,
  newTotal,
  onAddQtyChange,
  onNewTotalChange,
  storeName,
  canEditTotal = false,
}: {
  currentStock: number;
  addQty: string;
  newTotal: string;
  onAddQtyChange: (value: string) => void;
  onNewTotalChange: (value: string) => void;
  storeName?: string;
  /** Directeur uniquement — le gérant ne peut qu'ajouter une quantité */
  canEditTotal?: boolean;
}) {
  const parsedAdd = Math.max(0, parseInt(addQty, 10) || 0);
  const parsedNew = parseInt(newTotal);
  const computedTotal = canEditTotal
    ? !isNaN(parsedNew)
      ? parsedNew
      : currentStock + parsedAdd
    : currentStock + parsedAdd;
  const diff = computedTotal - currentStock;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Stock magasin{storeName ? ` — ${storeName}` : ""}</p>
        <Badge variant={currentStock < 10 ? "warning" : "success"}>
          Actuel : {currentStock}
        </Badge>
      </div>

      {canEditTotal ? (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ajout Q (+)"
            type="number"
            min="0"
            step="1"
            value={addQty}
            onKeyDown={blockNegativeKey}
            onChange={(e) => onAddQtyChange(sanitizeStockQtyInput(e.target.value))}
            placeholder="0"
          />
          <Input
            label="Nouveau stock total"
            type="number"
            min="0"
            step="1"
            value={newTotal}
            onKeyDown={blockNegativeKey}
            onChange={(e) => onNewTotalChange(sanitizeStockQtyInput(e.target.value))}
            required
          />
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            label="Ajout Q (+)"
            type="number"
            min="1"
            step="1"
            value={addQty}
            onKeyDown={blockNegativeKey}
            onChange={(e) => onAddQtyChange(sanitizeStockQtyInput(e.target.value))}
            placeholder="Ex: 10"
            required
            autoFocus
          />
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="text-sm text-muted">Nouveau stock total</span>
            <span className="text-lg font-bold text-primary">{computedTotal}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        {canEditTotal ? (
          <>
            {diff > 0 && `+${diff} unité(s) seront ajoutées`}
            {diff === 0 && "Aucune modification"}
            {diff < 0 && `${Math.abs(diff)} unité(s) seront retirées`}
            {" · "}Le total se calcule à partir du stock actuel ({currentStock})
          </>
        ) : (
          <>
            {parsedAdd > 0
              ? `${currentStock} + ${parsedAdd} = ${computedTotal} unité(s)`
              : "Saisissez la quantité à ajouter — le total est calculé automatiquement"}
          </>
        )}
      </p>
    </div>
  );
}

export function useStockAdjustment(currentStock: number) {
  function syncFromAdd(addQty: string) {
    const add = Math.max(0, parseInt(addQty, 10) || 0);
    return String(Math.max(0, currentStock + add));
  }

  function syncFromTotal(newTotal: string) {
    const total = parseInt(newTotal, 10);
    if (isNaN(total)) return "";
    const safeTotal = Math.max(0, total);
    return String(Math.max(0, safeTotal - currentStock));
  }

  return { syncFromAdd, syncFromTotal };
}
