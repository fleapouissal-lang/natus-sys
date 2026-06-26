"use client";

import type { RefObject } from "react";
import { List, PackagePlus, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ProductImage } from "@/components/pos/product-image";
import { ProductStockMultiSelect } from "@/components/stock/product-stock-multi-select";
import {
  StockAdjustmentFields,
  sanitizeStockQtyInput,
} from "@/components/stock/stock-adjustment-fields";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

type ProductPickMode = "select" | "scan";

function SelectedProductsPreview({
  products,
  onRemove,
  onClear,
}: {
  products: Product[];
  onRemove: (productId: string) => void;
  onClear: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {products.length} produit{products.length !== 1 ? "s" : ""} sélectionné
          {products.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer text-xs font-medium text-muted hover:text-foreground"
        >
          Tout effacer
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {products.map((product) => (
          <div
            key={product.id}
            className="relative flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-page"
          >
            <button
              type="button"
              onClick={() => onRemove(product.id)}
              className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-muted shadow-sm hover:bg-danger/10 hover:text-danger"
              aria-label={`Retirer ${product.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex h-28 items-center justify-center bg-surface p-2">
              <ProductImage product={product} size="sm" className="h-24 w-24 object-contain" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5 border-t border-border p-2.5">
              <p className="line-clamp-2 text-xs font-medium leading-tight">{product.name}</p>
              <Badge
                variant={product.stock < 10 ? "warning" : "default"}
                className="w-fit text-[10px]"
              >
                Stock : {product.stock}
              </Badge>
            </div>
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
  perProductAdds,
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
  onPerProductAddChange,
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
  perProductAdds: Record<string, string>;
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
  onPerProductAddChange: (productId: string, value: string) => void;
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
  const hasSelection = selectedProducts.length > 0;
  const isBatch = selectedProducts.length > 1;

  return (
    <Card padding={false} className="overflow-hidden">
      <div className="border-b border-border p-6">
        <CardHeader
          title={title}
          description={description}
          action={storeName ? <Badge>{storeName}</Badge> : undefined}
        />

        <div className="flex gap-2">
          {(
            [
              { id: "select" as const, label: "Liste", icon: List },
              { id: "scan" as const, label: "Scanner", icon: ScanBarcode },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onPickModeChange(id)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer sm:flex-none sm:min-w-[9rem]",
                pickMode === id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:border-primary/25 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 p-6">
        <div className="w-full space-y-4">
          {pickMode === "select" ? (
            <ProductStockMultiSelect
              products={products}
              value={selectedIds}
              onChange={onSelectionChange}
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-base font-medium text-foreground">Lecteur code-barres</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-primary">
                    <ScanBarcode className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={scanQuery ?? ""}
                    onKeyDown={onScanKeyDown}
                    onChange={onScanChange}
                    onFocus={() => onFocusScanner?.()}
                    placeholder="Scannez un ou plusieurs produits…"
                    autoComplete="off"
                    className={cn(
                      "natus-field w-full bg-surface px-4 py-3 pl-10 text-base font-mono transition-colors placeholder:text-muted",
                      scannerActive && "border-primary ring-2 ring-primary/15"
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={scannerActive ? "accent" : "default"}>
                  {scannerActive ? "Prêt" : "Pause"}
                </Badge>
              </div>
              <p className="text-sm text-muted">
                Chaque scan ajoute le produit à la sélection. Continuez à scanner avant de valider.
              </p>
              {scanHint && <p className="text-sm text-danger">{scanHint}</p>}
            </div>
          )}
        </div>

        <SelectedProductsPreview
          products={selectedProducts}
          onRemove={onRemoveProduct}
          onClear={onClearSelection}
        />

        {hasSelection && (
          <div className="space-y-4 rounded-xl border border-primary/15 bg-gradient-to-b from-primary/5 to-surface p-5">
            <div>
              <h3 className="font-heading text-base font-semibold text-primary">
                {isBatch ? "Ajuster la sélection" : "Ajuster le stock"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {isBatch
                  ? canEditTotal
                    ? "Stock actuel du magasin, quantité à ajouter (positive) et total modifiable par ligne."
                    : "Stock actuel du magasin — saisissez la quantité à ajouter (positive) par produit."
                  : canEditTotal
                    ? "Saisissez la quantité à ajouter ou le nouveau total."
                    : "Indiquez combien d'unités ajouter au stock actuel."}
              </p>
            </div>

            {isBatch ? (
              <div className="w-full space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={`Ajouter la même quantité à tous (${selectedProducts.length})`}
                    type="number"
                    min="0"
                    step="1"
                    value={addQty}
                    onChange={(e) => onAddQtyChange(sanitizeStockQtyInput(e.target.value))}
                    placeholder="Ex: 10 (0 = référencer au magasin)"
                    inputSize="lg"
                  />
                  {!canEditTotal && (
                    <Input
                      label="Notes (optionnel)"
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Livraison, réassort…"
                      inputSize="lg"
                    />
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-primary-light/30">
                        <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                        <th className="px-4 py-3 text-right font-medium text-muted">
                          Stock actuel{storeName ? ` — ${storeName}` : " magasin"}
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted">
                          Ajout Q (+)
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted">
                          Total en magasin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((product) => {
                        const rowAddRaw = perProductAdds[product.id] ?? addQty;
                        const parsedAdd = Math.max(0, parseInt(rowAddRaw, 10) || 0);
                        const rawTotal = perProductTotals[product.id] ?? String(product.stock);
                        const parsedTotal = parseInt(rawTotal, 10);
                        const totalInStore = canEditTotal
                          ? Number.isNaN(parsedTotal)
                            ? product.stock
                            : parsedTotal
                          : product.stock + parsedAdd;

                        return (
                          <tr key={product.id} className="border-b border-border last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <ProductImage product={product} size="sm" className="h-12 w-12 shrink-0" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{product.name}</p>
                                  <p className="font-mono text-xs text-muted">{product.barcode}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-medium">
                              {product.stock}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={rowAddRaw}
                                onChange={(e) =>
                                  onPerProductAddChange(
                                    product.id,
                                    sanitizeStockQtyInput(e.target.value)
                                  )
                                }
                                placeholder="0"
                                className="natus-field ml-auto w-28 bg-page px-3 py-2.5 text-right text-base tabular-nums"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {canEditTotal ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={rawTotal}
                                  onChange={(e) =>
                                    onPerProductTotalChange(
                                      product.id,
                                      sanitizeStockQtyInput(e.target.value)
                                    )
                                  }
                                  className="natus-field ml-auto w-28 bg-page px-3 py-2.5 text-right text-base tabular-nums"
                                />
                              ) : (
                                <span className="font-semibold text-primary tabular-nums">
                                  {totalInStore}
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
              <div className="w-full space-y-4">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
                  <ProductImage product={singleProduct} size="sm" className="h-20 w-20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{singleProduct.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted">{singleProduct.barcode}</p>
                    <Badge
                      variant={currentStock < 10 ? "warning" : "success"}
                      className="mt-3 w-fit"
                    >
                      Stock actuel : {currentStock}
                    </Badge>
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
                    placeholder="Livraison, réassort…"
                  />
                )}
              </div>
            ) : null}

            {(error || success) && (
              <div className="space-y-2">
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

            <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                {isBatch
                  ? canEditTotal
                    ? `${selectedProducts.length} produits — stock actuel, ajout et total modifiables`
                    : parsedAdd === 0 && !addQty
                      ? `${selectedProducts.length} produit(s) — quantité 0 = référencer au magasin`
                      : `Ajout par produit · total calculé automatiquement`
                  : canEditTotal
                    ? "Enregistrement du nouveau stock total (0 autorisé)"
                    : "Quantité 0 = référencer au magasin sans ajout"}
              </p>
              <Button type="submit" loading={loading} className="w-full sm:w-auto sm:min-w-[220px]">
                <PackagePlus className="h-4 w-4" />
                {isBatch
                  ? canEditTotal
                    ? `Enregistrer ${selectedProducts.length} produits`
                    : `Ajouter à ${selectedProducts.length} produits`
                  : canEditTotal
                    ? "Enregistrer le stock"
                    : "Ajouter au stock"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
}
