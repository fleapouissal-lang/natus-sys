"use client";

import type { RefObject } from "react";
import { List, PackagePlus, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProductImage } from "@/components/pos/product-image";
import { productPickOptions } from "@/lib/select-options";
import {
  StockAdjustmentFields,
} from "@/components/stock/stock-adjustment-fields";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductPickMode = "select" | "scan";

export function AddStockCard({
  title,
  description,
  storeName,
  canEditTotal,
  products,
  selectedId,
  selectedProduct,
  pickMode,
  addQty,
  newTotal,
  notes,
  currentStock,
  loading,
  error,
  success,
  scanHint,
  scanQuery,
  scannerActive = false,
  inputRef,
  onPickModeChange,
  onArmScanner,
  onDisarmScanner,
  onProductChange,
  onAddQtyChange,
  onNewTotalChange,
  onNotesChange,
  onScanKeyDown,
  onScanChange,
  onSubmit,
}: {
  title: string;
  description: string;
  storeName?: string;
  canEditTotal: boolean;
  products: Product[];
  selectedId: string;
  selectedProduct?: Product;
  pickMode: ProductPickMode;
  addQty: string;
  newTotal: string;
  notes: string;
  currentStock: number;
  loading: boolean;
  error: string;
  success: string;
  scanHint: string;
  scanQuery: string;
  scannerActive?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPickModeChange: (mode: ProductPickMode) => void;
  onArmScanner?: () => void;
  onDisarmScanner?: () => void;
  onProductChange: (id: string) => void;
  onAddQtyChange: (value: string) => void;
  onNewTotalChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onScanKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const parsedAdd = Math.max(0, parseInt(addQty, 10) || 0);
  const previewTotal = canEditTotal
    ? parseInt(newTotal, 10) || currentStock
    : currentStock + parsedAdd;

  return (
    <div className="overflow-hidden border border-primary/25 bg-surface shadow-sm">
      <div className="h-1 bg-primary" />

      <div className="border-b border-primary/15 bg-primary/8 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/15 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            </div>
          </div>
          {storeName && (
            <Badge className="shrink-0">{storeName}</Badge>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-black">
                1
              </span>
              <p className="text-sm font-semibold text-foreground">Choisir le produit</p>
            </div>

            <div className="inline-flex w-full border border-primary/30 bg-background p-1">
              <button
                type="button"
                onClick={() => onPickModeChange("select")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  pickMode === "select"
                    ? "bg-champagne text-black"
                    : "text-muted hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => onPickModeChange("scan")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  pickMode === "scan"
                    ? "bg-champagne text-black"
                    : "text-muted hover:text-foreground"
                )}
              >
                <ScanBarcode className="h-4 w-4" />
                Scanner
              </button>
            </div>

            {pickMode === "select" ? (
              <SelectMenu
                value={selectedId}
                onChange={onProductChange}
                options={productPickOptions(products)}
                placeholder="Rechercher un produit..."
                size="sm"
              />
            ) : (
              <div>
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={onArmScanner}
                  className={cn(
                    "flex cursor-text items-center gap-2 rounded-full border bg-page px-4 py-2",
                    scannerActive ? "border-primary" : "border-border"
                  )}
                >
                  <ScanBarcode
                    className={cn(
                      "h-4 w-4 shrink-0",
                      scannerActive ? "text-primary" : "text-muted"
                    )}
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanQuery ?? ""}
                    onKeyDown={onScanKeyDown}
                    onChange={onScanChange}
                    onFocus={onArmScanner}
                    onBlur={onDisarmScanner}
                    placeholder={
                      scannerActive
                        ? "Passez le code-barres devant le lecteur…"
                        : "Cliquez pour activer le scanner…"
                    }
                    className="natus-filter-inline-input w-full min-w-0 cursor-default border-0 bg-transparent py-0 text-sm font-mono outline-none placeholder:text-muted"
                    autoComplete="off"
                  />
                  <Badge
                    variant={scannerActive ? "accent" : "default"}
                    className={cn("shrink-0", !scannerActive && "bg-page text-muted")}
                  >
                    {scannerActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Scan automatique — le produit se sélectionne seul
                </p>
                {scanHint && (
                  <p className="mt-2 text-sm text-danger">{scanHint}</p>
                )}
              </div>
            )}

            {selectedProduct ? (
              <div className="border border-primary/25 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <ProductImage product={selectedProduct} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{selectedProduct.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {selectedProduct.barcode}
                    </p>
                    {selectedProduct.category && (
                      <p className="mt-1 text-xs text-muted">{selectedProduct.category}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-primary/15 pt-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    Stock actuel
                  </span>
                  <Badge variant={currentStock < 10 ? "warning" : "success"}>
                    {currentStock} unité{currentStock !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[120px] items-center justify-center border border-dashed border-primary/25 bg-background/60 px-4 text-center text-sm text-muted">
                Sélectionnez ou scannez un produit pour continuer
              </div>
            )}
          </section>

          <section
            className={cn(
              "space-y-4",
              !selectedProduct && "opacity-50 pointer-events-none"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-black">
                2
              </span>
              <p className="text-sm font-semibold text-foreground">Quantité à ajouter</p>
            </div>

            {selectedProduct && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-border bg-background px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Actuel
                    </p>
                    <p className="mt-1 text-xl font-bold">{currentStock}</p>
                  </div>
                  <div className="border border-primary/30 bg-primary/10 px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-primary">
                      {canEditTotal ? "Ajust." : "Ajout"}
                    </p>
                    <p className="mt-1 text-xl font-bold text-primary">
                      {canEditTotal ? (parsedAdd > 0 ? `+${parsedAdd}` : "—") : addQty || "—"}
                    </p>
                  </div>
                  <div className="border border-primary/40 bg-primary/15 px-2 py-3">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-foreground">
                      Nouveau
                    </p>
                    <p className="mt-1 text-xl font-bold">{previewTotal}</p>
                  </div>
                </div>

                <StockAdjustmentFields
                  currentStock={currentStock}
                  addQty={addQty}
                  newTotal={newTotal}
                  onAddQtyChange={onAddQtyChange}
                  onNewTotalChange={onNewTotalChange}
                  storeName={storeName}
                  canEditTotal={canEditTotal}
                />

                {!canEditTotal && (
                  <Input
                    label="Notes (optionnel)"
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    placeholder="Ex: Livraison fournisseur, réassort..."
                  />
                )}
              </>
            )}
          </section>
        </div>

        {(error || success) && (
          <div className="mt-6">
            {error && (
              <p className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            {success && (
              <p className="rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success">
                {success}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {selectedProduct
              ? canEditTotal
                ? "Modification directe du stock total"
                : "Seules les quantités positives sont acceptées"
              : "Complétez l'étape 1 pour valider"}
          </p>
          <Button
            type="submit"
            loading={loading}
            disabled={!selectedProduct}
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            <PackagePlus className="h-4 w-4" />
            {canEditTotal ? "Enregistrer le stock" : "Ajouter au stock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
