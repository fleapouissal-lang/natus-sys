"use client";

import type { ReactNode } from "react";
import { Barcode, Package, Tag, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/pos/product-image";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import {
  getProductCategories,
  productDisplayName,
} from "@/lib/products/product-utils";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ProductViewModal({
  product,
  parent,
  variants = [],
  onClose,
  footer,
}: {
  product: Product;
  parent?: Product | null;
  variants?: Product[];
  onClose: () => void;
  footer?: ReactNode;
}) {
  const categories = getProductCategories(product);
  const displayName = productDisplayName(product, parent);
  const isParent = product.product_kind === "parent";

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Détail du produit</h3>
          <p className="mt-1 text-sm text-muted">{displayName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted hover:text-foreground cursor-pointer"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-[16rem] overflow-hidden rounded-lg border border-border bg-page">
          <ProductImage product={product} parent={parent} fill />
        </div>

        <dl className="space-y-4">
          <DetailRow label="Nom">
            <span className="font-medium">{displayName}</span>
          </DetailRow>

          {parent && (
            <DetailRow label="Produit parent">
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-4 w-4 shrink-0 text-primary" />
                {parent.name}
              </span>
            </DetailRow>
          )}

          <DetailRow label="Marque">{PRODUCT_BRAND}</DetailRow>

          {categories.length > 0 && (
            <DetailRow label="Catégories">
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => (
                  <Badge key={category}>
                    <Tag className="mr-1 h-3 w-3" />
                    {category}
                  </Badge>
                ))}
              </div>
            </DetailRow>
          )}

          {product.barcode && (
            <DetailRow label="Code-barres">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                <Barcode className="h-4 w-4 shrink-0 text-primary" />
                {product.barcode}
              </span>
            </DetailRow>
          )}

          {!isParent && (
            <DetailRow label="Prix">
              <span className="text-base font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
            </DetailRow>
          )}

          {!isParent && (
            <DetailRow label="Stock">
              <Badge variant={product.stock < 10 ? "warning" : "success"}>
                {product.stock} unité{product.stock !== 1 ? "s" : ""}
              </Badge>
            </DetailRow>
          )}

          {product.description?.trim() && (
            <DetailRow label="Description">
              <p className="whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </DetailRow>
          )}

          {isParent && variants.length > 0 && (
            <DetailRow label="Variantes">
              <ul className="space-y-1">
                {variants.map((variant) => (
                  <li key={variant.id} className="text-sm text-muted">
                    {variant.name}
                    {variant.barcode ? ` · ${variant.barcode}` : ""}
                    {" · "}
                    {formatCurrency(variant.price)}
                  </li>
                ))}
              </ul>
            </DetailRow>
          )}
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {footer}
        <Button type="button" variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </Modal>
  );
}

export const PRODUCT_VIEW_ACTION_COLOR = "#B38C4A";
