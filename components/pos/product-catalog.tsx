"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Barcode, Search, Tag, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/pos/product-image";
import { formatCurrency, cn } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/product-image";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import type { Product } from "@/lib/types";

type FilterMode = "barcode" | "category" | "name";

const FILTER_MODES: { id: FilterMode; label: string; icon: typeof Search }[] = [
  { id: "barcode", label: "Code-barres", icon: Barcode },
  { id: "category", label: "Catégorie", icon: Tag },
  { id: "name", label: "Nom", icon: Search },
];

const PAGE_SIZE = 9;

export function ProductCatalog({
  products,
  onSelect,
  onBarcodeScan,
  lastAddedProduct = null,
  scannerEnabled = true,
}: {
  products: Product[];
  onSelect: (product: Product) => void;
  onBarcodeScan?: (code: string) => void;
  lastAddedProduct?: Product | null;
  scannerEnabled?: boolean;
}) {
  const [filterMode, setFilterMode] = useState<FilterMode>("barcode");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return [...set].sort();
  }, [products]);

  const handleScan = useCallback(
    (code: string) => {
      setQuery(code);
      onBarcodeScan?.(code);
    },
    [onBarcodeScan]
  );

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: scannerEnabled && filterMode === "barcode",
  });

  useEffect(() => {
    setPage(1);
  }, [filterMode, query]);

  useEffect(() => {
    if (filterMode === "barcode" && scannerEnabled) {
      focusInput();
    }
  }, [filterMode, scannerEnabled, focusInput]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) => {
      if (filterMode === "barcode") {
        return product.barcode.toLowerCase().includes(q);
      }
      if (filterMode === "category") {
        return product.category?.toLowerCase().includes(q) ?? false;
      }
      return product.name.toLowerCase().includes(q);
    });
  }, [products, filterMode, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleModeChange(mode: FilterMode) {
    setFilterMode(mode);
    setQuery("");
    setPage(1);
  }

  const inputPlaceholder =
    filterMode === "barcode"
      ? "Passez le code-barres devant le lecteur…"
      : filterMode === "category"
        ? "Tapez une catégorie…"
        : "Rechercher par nom…";

  const InputIcon =
    filterMode === "barcode" ? Barcode : filterMode === "category" ? Tag : Search;

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted">Aucun produit disponible</p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 !p-4">
        <div className="flex flex-wrap gap-2">
          {FILTER_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={cn(
                "flex items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                filterMode === id
                  ? "border-primary bg-primary text-black"
                  : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border border-border bg-background px-3 py-1">
          <InputIcon className="h-5 w-5 shrink-0 text-primary" />
          <input
            ref={filterMode === "barcode" ? inputRef : undefined}
            type="text"
            value={query}
            readOnly={filterMode === "barcode"}
            onKeyDown={filterMode === "barcode" ? handleKeyDown : undefined}
            onChange={(e) => {
              if (filterMode === "barcode") {
                handleChange(e);
              } else {
                setQuery(e.target.value);
              }
            }}
            placeholder={inputPlaceholder}
            list={filterMode === "category" ? "catalog-categories" : undefined}
            autoComplete="off"
            className={cn(
              "w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted",
              filterMode === "barcode" && "cursor-default"
            )}
          />
          {filterMode === "category" && (
            <datalist id="catalog-categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          )}
          {filterMode === "barcode" && (
            <Badge variant="accent" className="shrink-0">
              Scanner actif
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""} — page {safePage} / {totalPages}
        </p>
      </Card>

      {lastAddedProduct && (
        <Card className="flex items-center gap-4 border-success/40 bg-success/10 !p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <ProductImage product={lastAddedProduct} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-success">
              Dernier produit ajouté
            </p>
            <p className="truncate font-semibold">{lastAddedProduct.name}</p>
          </div>
          <p className="shrink-0 font-bold text-primary">
            {formatCurrency(lastAddedProduct.price)}
          </p>
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucun produit ne correspond au filtre</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {paginated.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                disabled={product.stock <= 0}
                className={cn(
                  "flex h-full flex-col overflow-hidden border bg-surface text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                  lastAddedProduct?.id === product.id
                    ? "border-success ring-2 ring-success/30"
                    : "border-border"
                )}
              >
                <div className="relative aspect-[4/5] w-full shrink-0 bg-background">
                  <Image
                    src={getProductImageUrl(product)}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {product.category && (
                    <Badge className="absolute top-3 right-3 px-2.5 py-1 text-xs shadow-sm">
                      {product.category}
                    </Badge>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Badge variant="danger">Rupture</Badge>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <p className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug">
                    {product.name}
                  </p>
                  <p className="mt-auto pt-2 text-right text-lg font-bold text-primary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {totalPages >= 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <span className="min-w-[4rem] text-center text-sm text-muted">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
