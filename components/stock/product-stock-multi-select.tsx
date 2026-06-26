"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="w-full">
      <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2">
        <p className="text-base font-medium text-foreground">{label}</p>
        <div className="flex shrink-0 gap-2">
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

      <p className="mb-3 text-sm text-muted">
        {value.length} produit{value.length !== 1 ? "s" : ""} sélectionné
        {value.length !== 1 ? "s" : ""}
      </p>

      <Input
        inputSize="lg"
        icon={Search}
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher nom ou code-barres…"
        className="mb-4 w-full"
      />

      <div className="max-h-[32rem] min-h-[16rem] w-full space-y-1 overflow-y-auto rounded-xl border border-border bg-surface p-2">
        {filteredProducts.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">Aucun produit trouvé</p>
        ) : (
          filteredProducts.map((product) => {
            const active = selected.has(product.id);
            return (
              <label
                key={product.id}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  active
                    ? "border-primary/40 bg-primary-light/20"
                    : "border-transparent hover:bg-primary-light/10"
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(product.id)}
                  className="h-4 w-4 shrink-0 accent-primary"
                />
                <ProductImage product={product} size="sm" className="h-14 w-14 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-foreground">
                    {product.name}
                  </span>
                  <span className="mt-1 block font-mono text-xs text-muted">
                    {product.barcode || "—"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Stock actuel : {product.stock}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
