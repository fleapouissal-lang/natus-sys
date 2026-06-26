"use client";

import type { RefObject } from "react";
import { List, PackagePlus, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { ProductStockMultiSelect } from "@/components/stock/product-stock-multi-select";
import {
  StockAdjustmentFields,
  sanitizeStockQtyInput,
} from "@/components/stock/stock-adjustment-fields";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductPickMode = "select" | "scan";

function SelectedProductsBasket({
  products,
  selectedIds,
  onRemove,
  onClear,
}: {
  products: Product[];
  selectedIds: string[];
  onRemove: (productId: string) => void;
  onClear: () => void;
}) {
  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  if (selectedProducts.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center border border-dashed border-primary/25 bg-background/60 px-4 text-center text-sm text-muted">
        Sélectionnez ou scannez un ou plusieurs produits
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {selectedProducts.length} produit{selectedProducts.length !== 1 ? "s" : ""} retenu
          {selectedProducts.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Tout effacer
        </button>
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-primary/20 bg-background/50 p-2">
        {selectedProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
          >
            <ProductImage product={product} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="font-mono text-xs text-muted">{product.barcode}</p>
            </div>
            <Badge variant={product.stock < 10 ? "warning" : "success"}>{product.stock}</Badge>
            <button
              type="button"
              onClick={() => onRemove(product.id)}
              className="cursor-pointer rounded-md p-1 text-muted hover:bg-danger/10 hover:text-danger"
              aria-label={`Retirer ${product.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AddStockCard({
  title,
  description,
  storeName,
  canEditTotal,
  products,
  selectedIds,
  pickMode,
  addQty,
  newTotal,
  perProductTotals,
  notes,
  loading,
  error,
  success,
  scanHint,
  scanQuery,
  scannerActive = false,
  inputRef,
  onPickModeChange,
  onFocusScanner,
  onSelectionChange,
  onRemoveProduct,
  onClearSelection,
  onAddQtyChange,
  onNewTotalChange,
  onPerProductTotalChange,
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
  selectedIds: string[];
  pickMode: ProductPickMode;
  addQty: string;
  newTotal: string;
  perProductTotals: Record<string, string>;
  notes: string;
  loading: boolean;
  error: string;
  success: string;
  scanHint: string;
  scanQuery: string;
  scannerActive?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPickModeChange: (mode: ProductPickMode) => void;
  onFocusScanner?: () => void;
  onSelectionChange: (ids: string[]) => void;
  onRemoveProduct: (productId: string) => void;
  onClearSelection: () => void;
  onAddQtyChange: (value: string) => void;
  onNewTotalChange: (value: string) => void;
  onPerProductTotalChange: (productId: string, value: string) => void;
  onNotesChange: (value: string) => void;
  onScanKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onScanChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));
  const singleProduct = selectedProducts.length === 1 ? selectedProducts[0] : null;
  const currentStock = singleProduct?.stock ?? 0;
  const parsedAdd = Math.max(0, parseInt(addQty, 10) || 0);
  const previewTotal = canEditTotal
    ? parseInt(newTotal, 10) || currentStock
    : currentStock + parsedAdd;
  const hasSelection = selectedProducts.length > 0;
  const isBatch = selectedProducts.length > 1;

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
          {storeName && <Badge className="shrink-0">{storeName}</Badge>}
        </div>
      </div>

      <form onSubmit={onSubmit} className="p-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-black">
                1
              </span>
              <p className="text-sm font-semibold text-foreground">Choisir le(s) produit(s)</p>
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
              <ProductStockMultiSelect
                products={products}
                value={selectedIds}
                onChange={onSelectionChange}
              />
            ) : (
              <div>
                <div
                  role="button"
                  tabIndex={-1}
                  onClick={() => onFocusScanner?.()}
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
                    onFocus={() => onFocusScanner?.()}
                    placeholder="Scannez plusieurs codes-barres…"
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
                  Chaque scan ajoute le produit à la sélection — continuez à scanner
                </p>
                {scanHint && <p className="mt-2 text-sm text-danger">{scanHint}</p>}
              </div>
            )}

            {pickMode === "scan" && (
              <SelectedProductsBasket
                products={products}
                selectedIds={selectedIds}
                onRemove={onRemoveProduct}
                onClear={onClearSelection}
              />
            )}
          </section>

          <section className={cn("space-y-4", !hasSelection && "opacity-50 pointer-events-none")}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center bg-primary text-xs font-bold text-black">
                2
              </span>
              <p className="text-sm font-semibold text-foreground">
                {isBatch ? "Quantités pour la sélection" : "Quantité à ajouter"}
              </p>
            </div>

            {!hasSelection ? (
              <div className="flex min-h-[160px] items-center justify-center border border-dashed border-primary/25 bg-background/60 px-4 text-center text-sm text-muted">
                Ajoutez des produits à l&apos;étape 1
              </div>
            ) : isBatch ? (
              <div className="space-y-4">
                {canEditTotal && (
                  <Input
                    label="Ajouter la même quantité à tous"
                    type="number"
                    min="0"
                    step="1"
                    value={addQty}
                    onChange={(e) => onAddQtyChange(sanitizeStockQtyInput(e.target.value))}
                    placeholder="Ex: 5"
                  />
                )}

                {!canEditTotal && (
                  <>
                    <Input
                      label={`Quantité à ajouter à chaque produit (${selectedProducts.length})`}
                      type="number"
                      min="1"
                      step="1"
                      value={addQty}
                      onChange={(e) => onAddQtyChange(sanitizeStockQtyInput(e.target.value))}
                      placeholder="Ex: 10"
                      required
                      autoFocus
                    />
                    <Input
                      label="Notes (optionnel)"
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Ex: Livraison fournisseur, réassort..."
                    />
                  </>
                )}

                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-primary-light/40">
                        <th className="px-3 py-2 text-left font-medium text-muted">Produit</th>
                        <th className="px-3 py-2 text-right font-medium text-muted">Actuel</th>
                        {canEditTotal ? (
                          <th className="px-3 py-2 text-right font-medium text-muted">Nouveau</th>
                        ) : (
                          <th className="px-3 py-2 text-right font-medium text-muted">Après</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((product) => {
                        const afterQty = canEditTotal
                          ? parseInt(perProductTotals[product.id] ?? String(product.stock), 10) ||
                            product.stock
                          : product.stock + parsedAdd;
                        return (
                          <tr key={product.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              <p className="truncate font-medium">{product.name}</p>
                              <p className="font-mono text-xs text-muted">{product.barcode}</p>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">{product.stock}</td>
                            <td className="px-3 py-2 text-right">
                              {canEditTotal ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={perProductTotals[product.id] ?? String(product.stock)}
                                  onChange={(e) =>
                                    onPerProductTotalChange(
                                      product.id,
                                      sanitizeStockQtyInput(e.target.value)
                                    )
                                  }
                                  className="natus-field w-20 bg-surface py-1 text-right text-sm tabular-nums"
                                />
                              ) : (
                                <span className="font-semibold text-primary tabular-nums">
                                  {afterQty}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : singleProduct ? (
              <>
                <div className="border border-primary/25 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <ProductImage product={singleProduct} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{singleProduct.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted">{singleProduct.barcode}</p>
                    </div>
                  </div>
                </div>

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
            ) : null}
          </section>
        </div>

        {(error || success) && (
          <div className="mt-6">
            {error && (
              <p className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">{error}</p>
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
            {hasSelection
              ? isBatch
                ? canEditTotal
                  ? `${selectedProducts.length} produits seront mis à jour`
                  : `+${parsedAdd || "…"} unité(s) par produit (${selectedProducts.length} produits)`
                : canEditTotal
                  ? "Modification directe du stock total"
                  : "Seules les quantités positives sont acceptées"
              : "Complétez l'étape 1 pour valider"}
          </p>
          <Button
            type="submit"
            loading={loading}
            disabled={!hasSelection}
            className="w-full sm:w-auto sm:min-w-[200px]"
          >
            <PackagePlus className="h-4 w-4" />
            {isBatch
              ? canEditTotal
                ? `Enregistrer (${selectedProducts.length})`
                : `Ajouter à ${selectedProducts.length} produits`
              : canEditTotal
                ? "Enregistrer le stock"
                : "Ajouter au stock"}
          </Button>
        </div>
      </form>
    </div>
  );
}
