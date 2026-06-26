"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/pos/product-image";
import type { Product } from "@/lib/types";

export function ProductStockMultiSelect({
  products,
  value,
  onChange,
  label = "Produits sélectionnés",
}: {
  products: Product[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const selected = new Set(value);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false)
    );
  }, [products, search]);

  function toggle(productId: string) {
    const next = new Set(selected);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    onChange([...next]);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onChange(products.map((product) => product.id))}
          >
            Tout sélectionner
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange([])}>
            Tout retirer
          </Button>
        </div>
      </div>

      <p className="mb-2 text-xs text-muted">
        {value.length} produit{value.length !== 1 ? "s" : ""} sélectionné
        {value.length !== 1 ? "s" : ""}
      </p>

      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher nom ou code-barres..."
          className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
        />
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
        {filteredProducts.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted">Aucun produit trouvé</p>
        ) : (
          filteredProducts.map((product) => {
            const active = selected.has(product.id);
            return (
              <label
                key={product.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                  active
                    ? "border-primary/40 bg-primary-light/20"
                    : "border-transparent hover:bg-primary-light/10"
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(product.id)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <ProductImage product={product} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {product.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-muted">
                    {product.barcode || "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">Stock actuel : {product.stock}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
