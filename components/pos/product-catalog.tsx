"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  LayoutGrid,
  Plus,
  Minus,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { getProductCategoryIcon } from "@/lib/products/category-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/pos/product-image";
import {
  ProductViewModal,
  PRODUCT_VIEW_ACTION_COLOR,
} from "@/components/products/product-view-modal";
import { formatCurrency, cn } from "@/lib/utils";
import { resolveParentImageSource } from "@/lib/product-image";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import {
  productDisplayName,
} from "@/lib/products/product-utils";
import {
  buildPosCategoryCards,
  filterProductsForCategory,
  sortProductsByBestSellers,
  type PosCategoryCard,
  type ProductSalesQtyMap,
} from "@/lib/pos/product-sales-rank";
import type { PosCategoryCardConfig } from "@/lib/pos/pos-category-cards/types";
import type { Product } from "@/lib/types";

function CategoryCardsGrid({
  cards,
  onSelect,
}: {
  cards: PosCategoryCard[];
  onSelect: (category: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs">
          Catégories
        </p>
        <p className="mt-1 text-xs text-muted">Choisissez une catégorie</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {cards.map((card) => {
          const Icon = getProductCategoryIcon(card.name);
          const parentImage = card.coverProduct
            ? resolveParentImageSource(card.coverProduct)
            : null;
          return (
            <button
              key={card.name}
              type="button"
              onClick={() => onSelect(card.name)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-surface text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md cursor-pointer"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                {card.coverImageUrl ? (
                  <img
                    src={card.coverImageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                ) : card.coverProduct ? (
                  <ProductImage
                    product={card.coverProduct}
                    parent={parentImage}
                    fill
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-champagne/50 to-page">
                    <Icon className="h-10 w-10 text-primary/70" />
                  </div>
                )}
              </div>
              <div className="p-3 text-black">
                <p className="font-heading text-sm font-semibold leading-tight md:text-base">
                  {card.name}
                </p>
                <p className="mt-1 text-[10px] text-black/75 md:text-xs">
                  {card.productCount} produit{card.productCount > 1 ? "s" : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary md:text-xs md:tracking-wide">
        Catégories
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-natus md:gap-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex shrink-0 flex-col items-center gap-1 cursor-pointer md:gap-1.5"
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border-2 bg-surface transition-colors md:h-14 md:w-14",
              selected === null
                ? "border-primary bg-champagne/40"
                : "border-border hover:border-primary/50"
            )}
          >
            <LayoutGrid className="h-4 w-4 text-black md:h-5 md:w-5" />
          </span>
          <span className="max-w-[3.5rem] truncate text-center text-[9px] font-medium text-black md:max-w-[4.5rem] md:text-[10px]">
            Tous
          </span>
        </button>

        {categories.map((cat) => {
          const Icon = getProductCategoryIcon(cat);
          const active = selected === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelect(active ? null : cat)}
              className="flex shrink-0 flex-col items-center gap-1 cursor-pointer md:gap-1.5"
            >
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 bg-surface transition-colors md:h-14 md:w-14",
                  active
                    ? "border-primary bg-champagne/40"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon className="h-4 w-4 text-black md:h-5 md:w-5" />
              </span>
              <span className="max-w-[3.5rem] truncate text-center text-[9px] font-medium text-black md:max-w-[4.5rem] md:text-[10px]">
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
  validatedQty = 0,
  onAddToCart,
  onUpdateQuantity,
  onView,
  highlighted,
  orderMode = false,
  luxuryMobile = false,
}: {
  product: Product;
  cartQty: number;
  validatedQty?: number;
  onAddToCart: (product: Product, qty: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onView: (product: Product) => void;
  highlighted?: boolean;
  orderMode?: boolean;
  luxuryMobile?: boolean;
}) {
  const outOfStock = product.stock <= 0;
  const inOrder = cartQty > 0;
  const orderValidated = validatedQty >= cartQty;
  const displayName = productDisplayName(
    product,
    product.parent_name ? ({ name: product.parent_name } as Product) : null
  );
  const parentImage = resolveParentImageSource(product);

  function handleCardClick() {
    if (outOfStock) {
      onAddToCart(product, 1);
      return;
    }
    if (orderMode) {
      if (inOrder && validatedQty < cartQty) {
        onAddToCart(product, 1);
      }
      return;
    }
    if (cartQty >= product.stock) {
      onAddToCart(product, 1);
      return;
    }
    onAddToCart(product, 1);
  }

  const cardClickable =
    orderMode
      ? !outOfStock && inOrder && validatedQty < cartQty
      : true;

  if (luxuryMobile) {
    const luxuryCard = (
      <div
        role={cardClickable ? "button" : undefined}
        tabIndex={cardClickable ? 0 : undefined}
        onClick={cardClickable ? handleCardClick : undefined}
        onKeyDown={
          cardClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick();
                }
              }
            : undefined
        }
        className={cn(
          "natus-card flex h-full flex-col overflow-hidden !p-0 transition-colors",
          highlighted && "ring-2 ring-success/30",
          cardClickable && "cursor-pointer"
        )}
      >
        <div className="relative aspect-square w-full shrink-0 bg-page">
          <ProductImage product={product} parent={parentImage} fill />
          {cartQty > 0 && (
            <span className="absolute right-1.5 top-1.5 z-[2] min-w-[1.25rem] rounded-md border-0 bg-champagne px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-black shadow-sm">
              {orderMode ? `${validatedQty}/${cartQty}` : cartQty}
            </span>
          )}
          {!outOfStock && cartQty === 0 && (
            <span
              className="absolute right-1.5 top-1.5 z-[1] min-w-[1.25rem] rounded-md border-0 bg-champagne px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-black shadow-sm"
              title={`${product.stock} en stock`}
            >
              {product.stock}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onView(product);
            }}
            title="Voir le produit"
            aria-label="Voir le produit"
            className="absolute left-1.5 top-1.5 z-[2] flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-white/95 hover:bg-[#B38C4A]/10 shadow-sm"
            style={{ borderColor: PRODUCT_VIEW_ACTION_COLOR, color: PRODUCT_VIEW_ACTION_COLOR }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <Badge variant="danger" className="text-[10px]">
                Rupture
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5 md:p-3">
          <p className="line-clamp-2 flex-1 text-[11px] font-semibold leading-snug md:text-sm">
            {displayName}
          </p>
          <p className="mt-1 text-sm font-bold text-primary">
            {formatCurrency(product.price)}
          </p>

          {cartQty > 0 && !orderMode && (
            <div
              className="mt-2 flex items-center justify-center rounded-full bg-page px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, -1)}
                disabled={cartQty <= 0}
                className="flex h-7 w-8 items-center justify-center text-primary disabled:opacity-40"
                aria-label="Retirer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.25rem] text-center text-xs font-bold">{cartQty}</span>
              <button
                type="button"
                onClick={() => onAddToCart(product, 1)}
                disabled={outOfStock || cartQty >= product.stock}
                className="flex h-7 w-8 items-center justify-center text-primary disabled:opacity-40"
                aria-label="Ajouter"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {orderMode && inOrder && (
            <div
              className="mt-2 flex items-center justify-center rounded-full bg-page px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, -1)}
                disabled={validatedQty <= 0}
                className="flex h-7 w-8 items-center justify-center text-primary disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2rem] text-center text-[10px] font-bold">
                {validatedQty}/{cartQty}
              </span>
              <button
                type="button"
                onClick={() => onAddToCart(product, 1)}
                disabled={validatedQty >= cartQty}
                className="flex h-7 w-8 items-center justify-center text-primary disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );

    const desktopCard = (
      <div
        role={cardClickable ? "button" : undefined}
        tabIndex={cardClickable ? 0 : undefined}
        onClick={cardClickable ? handleCardClick : undefined}
        onKeyDown={
          cardClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCardClick();
                }
              }
            : undefined
        }
        className={cn(
          "flex h-full flex-col overflow-hidden border bg-surface transition-colors",
          highlighted
            ? "border-success ring-2 ring-success/30"
            : "border-border",
          cardClickable && "cursor-pointer hover:border-primary"
        )}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 bg-page">
          <ProductImage product={product} parent={parentImage} fill />
          {!outOfStock && (
            <span
              className="absolute right-1.5 top-1.5 z-[1] min-w-[1.25rem] rounded-md border-0 bg-champagne px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-black shadow-sm"
              title={`${product.stock} en stock`}
            >
              {product.stock}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onView(product);
            }}
            title="Voir le produit"
            aria-label="Voir le produit"
            className="absolute left-1.5 top-1.5 z-[2] flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-white/95 hover:bg-[#B38C4A]/10 shadow-sm"
            style={{ borderColor: PRODUCT_VIEW_ACTION_COLOR, color: PRODUCT_VIEW_ACTION_COLOR }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Badge variant="danger">Rupture</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">
              {displayName}
            </p>
            <p className="shrink-0 text-sm font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
          </div>

          {orderMode ? (
            inOrder ? (
              <div
                className="mt-auto flex flex-col items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <p className="text-center text-xs text-muted">
                  {cartQty} commandé{cartQty !== 1 ? "s" : ""}
                  {orderValidated ? " · validé" : ""}
                </p>
                <div className="flex items-center rounded-full bg-page px-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(product.id, -1)}
                    disabled={validatedQty <= 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    aria-label="Retirer une validation"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2.75rem] text-center text-sm font-semibold">
                    {validatedQty}/{cartQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, 1)}
                    disabled={validatedQty >= cartQty}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    aria-label="Valider une unité"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-auto text-center text-xs text-muted">Hors commande</p>
            )
          ) : (
            <div
              className="mt-auto flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
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

    return (
      <div className="h-full">
        <div className="h-full md:hidden">{luxuryCard}</div>
        <div className="hidden h-full md:block">{desktopCard}</div>
      </div>
    );
  }

  return (
    <div
      role={cardClickable ? "button" : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onClick={cardClickable ? handleCardClick : undefined}
      onKeyDown={
        cardClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full flex-col overflow-hidden border bg-surface transition-colors",
        highlighted
          ? "border-success ring-2 ring-success/30"
          : "border-border",
        cardClickable && "cursor-pointer hover:border-primary"
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-page">
        <ProductImage product={product} parent={parentImage} fill />
        {!outOfStock && (
          <span
            className="absolute right-1.5 top-1.5 z-[1] min-w-[1.25rem] rounded-md border-0 bg-champagne px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-black shadow-sm"
            title={`${product.stock} en stock`}
          >
            {product.stock}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onView(product);
          }}
          title="Voir le produit"
          aria-label="Voir le produit"
          className="absolute left-1.5 top-1.5 z-[2] flex h-8 w-8 shrink-0 items-center justify-center !p-0 border bg-white/95 hover:bg-[#B38C4A]/10 shadow-sm"
          style={{ borderColor: PRODUCT_VIEW_ACTION_COLOR, color: PRODUCT_VIEW_ACTION_COLOR }}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="danger">Rupture</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug">
            {displayName}
          </p>
          <p className="shrink-0 text-sm font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>

        {orderMode ? (
          inOrder ? (
            <div
              className="mt-auto flex flex-col items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <p className="text-center text-xs text-muted">
                {cartQty} commandé{cartQty !== 1 ? "s" : ""}
                {orderValidated ? " · validé" : ""}
              </p>
              <div className="flex items-center rounded-full bg-page px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(product.id, -1)}
                  disabled={validatedQty <= 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  aria-label="Retirer une validation"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2.75rem] text-center text-sm font-semibold">
                  {validatedQty}/{cartQty}
                </span>
                <button
                  type="button"
                  onClick={() => onAddToCart(product, 1)}
                  disabled={validatedQty >= cartQty}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-champagne/50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  aria-label="Valider une unité"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-auto text-center text-xs text-muted">Hors commande</p>
          )
        ) : (
        <div
          className="mt-auto flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
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
  validatedQuantities,
  onBarcodeScan,
  lastAddedProduct = null,
  scannerEnabled = true,
  orderMode = false,
  compact = false,
  luxuryMobile = false,
  productSalesQty = {},
  posCategoryCards = [],
}: {
  products: Product[];
  onAddToCart: (product: Product, qty: number) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  cartQuantities: Record<string, number>;
  validatedQuantities?: Record<string, number>;
  onBarcodeScan?: (code: string) => void;
  lastAddedProduct?: Product | null;
  scannerEnabled?: boolean;
  orderMode?: boolean;
  compact?: boolean;
  luxuryMobile?: boolean;
  productSalesQty?: ProductSalesQtyMap;
  posCategoryCards?: PosCategoryCardConfig[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    return buildPosCategoryCards(products, productSalesQty, posCategoryCards).map(
      (card) => card.name
    );
  }, [products, productSalesQty, posCategoryCards]);

  const categoryCards = useMemo(
    () => buildPosCategoryCards(products, productSalesQty, posCategoryCards),
    [products, productSalesQty, posCategoryCards]
  );

  const hasSearch = searchQuery.trim().length > 0;
  const showCategoryGrid = !orderMode && !hasSearch && !selectedCategory;

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      onBarcodeScan?.(trimmed);
      setSearchQuery("");
    },
    [onBarcodeScan]
  );

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: scannerEnabled,
    autoRefocus: true,
  });

  const scannerActive = scannerEnabled;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      setSearchQuery(e.target.value);
    },
    [handleChange]
  );

  useEffect(() => {
    if (scannerEnabled) {
      setSearchQuery("");
      focusInput();
    }
  }, [scannerEnabled, focusInput]);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory) {
      list = filterProductsForCategory(products, selectedCategory, productSalesQty);
    } else if (hasSearch) {
      list = sortProductsByBestSellers(products, productSalesQty);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const displayName = productDisplayName(
          p,
          p.parent_name ? ({ name: p.parent_name } as Product) : null
        ).toLowerCase();
        return (
          displayName.includes(q) ||
          (p.barcode?.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return list;
  }, [products, searchQuery, selectedCategory, productSalesQty, hasSearch]);

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted">Aucun produit disponible</p>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="space-y-2">
        <div
          role="button"
          tabIndex={-1}
          onClick={() => focusInput()}
          className={cn(
            "flex cursor-text items-center gap-2 rounded-full border bg-page px-4 py-2",
            scannerActive ? "border-primary" : "border-border"
          )}
        >
          <Search
            className={cn(
              "h-4 w-4 shrink-0",
              scannerActive ? "text-primary" : "text-muted"
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onKeyDown={handleKeyDown}
            onChange={handleSearchChange}
            onFocus={() => focusInput()}
            placeholder={
              scannerActive
                ? orderMode
                  ? "Scannez ou cherchez un produit de la commande"
                  : "Nom ou code-barres — scannez pour ajouter"
                : "Nom ou code-barres…"
            }
            autoComplete="off"
            className="natus-filter-inline-input w-full cursor-default border-0 bg-transparent py-0 text-sm outline-none placeholder:text-muted"
          />
        </div>

        {!showCategoryGrid && (
          <p className="text-xs text-muted">
            {filtered.length} produit{filtered.length > 1 ? "s" : ""}
            {selectedCategory ? ` — ${selectedCategory}` : hasSearch ? " — recherche" : ""}
            {!orderMode ? " · triés par ventes" : ""}
          </p>
        )}
      </div>

      {showCategoryGrid ? (
        <CategoryCardsGrid
          cards={categoryCards}
          onSelect={(category) => setSelectedCategory(category)}
        />
      ) : (
        <>
          {!orderMode && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchQuery("");
                  focusInput();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Catégories
              </button>
              {selectedCategory && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {selectedCategory}
                </span>
              )}
            </div>
          )}

          {!orderMode && categories.length > 0 && (
            <CategoryStrip
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          )}

      {lastAddedProduct && !compact && (
        <Card className="flex items-center gap-4 border-success/40 bg-success/10 !p-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <ProductImage product={lastAddedProduct} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-success">
              Dernier produit ajouté
            </p>
            <p className="truncate font-semibold">
              {productDisplayName(
                lastAddedProduct,
                lastAddedProduct.parent_name
                  ? ({ name: lastAddedProduct.parent_name } as Product)
                  : null
              )}
            </p>
          </div>
          <p className="shrink-0 font-bold text-primary">
            {formatCurrency(lastAddedProduct.price)}
          </p>
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">Aucun produit ne correspond au filtre</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4 md:pb-0">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQty={cartQuantities[product.id] ?? 0}
              validatedQty={validatedQuantities?.[product.id] ?? 0}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              onView={setViewProduct}
              highlighted={lastAddedProduct?.id === product.id}
              orderMode={orderMode}
              luxuryMobile={luxuryMobile}
            />
          ))}
        </div>
      )}

      {viewProduct && (
        <ProductViewModal
          product={viewProduct}
          parent={
            viewProduct.parent_name
              ? ({ name: viewProduct.parent_name } as Product)
              : null
          }
          onClose={() => setViewProduct(null)}
        />
      )}
        </>
      )}
    </div>
  );
}
