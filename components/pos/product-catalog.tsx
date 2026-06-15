"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Barcode,
  Search,
  CheckCircle2,
  LayoutGrid,
  Sparkles,
  Palette,
  Droplets,
  Flower2,
  Heart,
  Scissors,
  Gift,
  Plus,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/pos/product-image";
import { formatCurrency, cn } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/product-image";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { PRODUCT_CATEGORIES } from "@/lib/constants/products";
import type { Product } from "@/lib/types";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Soin visage": Sparkles,
  Maquillage: Palette,
  Nettoyage: Droplets,
  Parfum: Flower2,
  Corps: Heart,
  Cheveux: Scissors,
  Accessoires: Gift,
};

function CategoryStrip({
  categories,
  selected,
  onSelect,
}: {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <div className="shrink-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
        Catégories
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-natus">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex shrink-0 flex-col items-center gap-1.5 cursor-pointer"
        >
          <span
            className={cn(
              "avatar-round flex h-14 w-14 items-center justify-center border-2 bg-surface transition-colors",
              selected === null
                ? "border-primary bg-champagne/40"
                : "border-border hover:border-primary/50"
            )}
          >
            <LayoutGrid className="h-5 w-5 text-black" />
          </span>
          <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-black">
            Tous
          </span>
        </button>

        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat] ?? Sparkles;
          const active = selected === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(active ? null : cat)}
              className="flex shrink-0 flex-col items-center gap-1.5 cursor-pointer"
            >
              <span
                className={cn(
                  "avatar-round flex h-14 w-14 items-center justify-center border-2 bg-surface transition-colors",
                  active
                    ? "border-primary bg-champagne/40"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-5 w-5 text-black" />
              </span>
              <span className="max-w-[4.5rem] truncate text-center text-[10px] font-medium text-black">
                {cat}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  cartQty,
  onAddToCart,
  onUpdateQuantity,
  highlighted,
  orderMode = false,
}: {
  product: Product;
  cartQty: number;
  onAddToCart: (product: Product, qty: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  highlighted?: boolean;
  orderMode?: boolean;
}) {
  const outOfStock = product.stock <= 0;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden border bg-surface transition-colors hover:border-primary",
        highlighted
          ? "border-success ring-2 ring-success/30"
          : "border-border"
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-page">
        <Image
          src={getProductImageUrl(product)}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="danger">Rupture</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">
            {product.name}
          </p>
          <p className="shrink-0 text-sm font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>

        {orderMode ? (
          <p className="mt-auto text-center text-xs text-muted">
            {cartQty > 0 ? `${cartQty} dans la commande — scannez pour valider` : "—"}
          </p>
        ) : (
        <div className="mt-auto flex items-center justify-center">
          <div className="flex items-center rounded-full bg-page px-1 py-0.5">
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, -1)}
              disabled={outOfStock || cartQty <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Retirer du panier"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[2rem] text-center text-sm font-semibold">
              {cartQty}
            </span>
            <button
              type="button"
              onClick={() => onAddToCart(product, 1)}
              disabled={outOfStock || cartQty >= product.stock}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Ajouter au panier"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export function ProductCatalog({
  products,
  onAddToCart,
  onUpdateQuantity,
  cartQuantities,
  onBarcodeScan,
  lastAddedProduct = null,
  scannerEnabled = true,
  orderMode = false,
  compact = false,
}: {
  products: Product[];
  onAddToCart: (product: Product, qty: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  cartQuantities: Record<string, number>;
  onBarcodeScan?: (code: string) => void;
  lastAddedProduct?: Product | null;
  scannerEnabled?: boolean;
  orderMode?: boolean;
  compact?: boolean;
}) {
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const fromProducts = new Set<string>();
    for (const p of products) {
      if (p.category) fromProducts.add(p.category);
    }
    return PRODUCT_CATEGORIES.filter((c) => fromProducts.has(c));
  }, [products]);

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      onBarcodeScan?.(trimmed);
      setBarcodeQuery("");
    },
    [onBarcodeScan]
  );

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: scannerEnabled,
    autoRefocus: true,
  });

  const scannerActive = scannerEnabled;

  const handleBarcodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      setBarcodeQuery(e.target.value);
    },
    [handleChange]
  );

  useEffect(() => {
    if (scannerEnabled) {
      setBarcodeQuery("");
      focusInput();
    }
  }, [scannerEnabled, focusInput]);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory);
    }
    const barcode = barcodeQuery.trim().toLowerCase();
    const name = nameQuery.trim().toLowerCase();

    if (barcode) {
      list = list.filter((p) => p.barcode.toLowerCase().includes(barcode));
    }
    if (name) {
      list = list.filter((p) => p.name.toLowerCase().includes(name));
    }
    return list;
  }, [products, barcodeQuery, nameQuery, selectedCategory]);

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted">Aucun produit disponible</p>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryStrip
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            role="button"
            tabIndex={-1}
            onClick={() => focusInput()}
            className={cn(
              "flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-full border bg-page px-4 py-2",
              scannerActive ? "border-primary" : "border-border"
            )}
          >
            <Barcode
              className={cn(
                "h-4 w-4 shrink-0",
                scannerActive ? "text-primary" : "text-muted"
              )}
            />
            <input
              ref={inputRef}
              type="text"
              value={barcodeQuery ?? ""}
              onKeyDown={handleKeyDown}
              onChange={handleBarcodeChange}
              onFocus={() => focusInput()}
              placeholder={
                scannerActive
                  ? "Passez le code-barres devant le lecteur…"
                  : "Scanner indisponible"
              }
              autoComplete="off"
              className="natus-filter-inline-input w-full cursor-default border-0 bg-transparent py-0 text-sm outline-none placeholder:text-muted"
            />
            <Badge
              variant={scannerActive ? "accent" : "default"}
              className={cn("shrink-0", !scannerActive && "bg-page text-muted")}
            >
              {scannerActive ? "Actif" : "Inactif"}
            </Badge>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-primary bg-page px-4 py-2">
            <Search className="h-4 w-4 shrink-0 text-primary" />
            <input
              type="text"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Nom du produit…"
              autoComplete="off"
              className="natus-filter-inline-input w-full border-0 bg-transparent py-0 text-sm outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""}
          {selectedCategory ? ` — ${selectedCategory}` : ""}
        </p>
      </div>

      {lastAddedProduct && !compact && (
        <Card className="flex items-center gap-4 border-success/40 bg-success/10 !p-3">
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQty={cartQuantities[product.id] ?? 0}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              highlighted={lastAddedProduct?.id === product.id}
              orderMode={orderMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
