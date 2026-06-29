"use client";

import { ArrowRight, ArrowRightLeft, Store as StoreIcon, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/pos/product-image";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export type StockTransferConfirmSite = {
  name: string;
  city?: string | null;
  siteType: "hub" | "store";
};

export type StockTransferConfirmItem = {
  product: Product;
  quantity: number;
};

export type StockTransferConfirmModalProps = {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  from: StockTransferConfirmSite;
  to: StockTransferConfirmSite;
  items: StockTransferConfirmItem[];
  totalQty: number;
  eyebrow?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionSummary?: string;
  processDescription?: string;
  sourceStockLabel?: string;
  showInitialStatus?: boolean;
  confirmLabel?: string;
  modifyLabel?: string;
};

function SiteIcon({ siteType }: { siteType: "hub" | "store" }) {
  return siteType === "hub" ? (
    <Warehouse className="h-4 w-4 shrink-0 text-primary" />
  ) : (
    <StoreIcon className="h-4 w-4 shrink-0 text-primary" />
  );
}

export function StockTransferConfirmModal({
  onClose,
  onConfirm,
  loading = false,
  from,
  to,
  items,
  totalQty,
  eyebrow = "Commande entrepôt",
  title = "Confirmer l'envoi",
  description = "Vérifiez les produits avant de créer la commande. Le stock dépôt sera déduit lorsque le livreur prendra la commande en charge.",
  actionLabel = "Envoi",
  actionSummary,
  processDescription = "Vous allez créer une commande entrepôt. Le dépôt prépare, le livreur transporte, le magasin valide la réception.",
  sourceStockLabel = "Stock entrepôt",
  showInitialStatus = true,
  confirmLabel = "Confirmer l'envoi",
  modifyLabel = "Modifier",
}: StockTransferConfirmModalProps) {
  const summaryText =
    actionSummary ?? `${totalQty} unité${totalQty > 1 ? "s" : ""} vers ${to.name}`;

  return (
    <Modal onClose={() => !loading && onClose()} size="lg" className="!p-0 overflow-hidden">
      <div className="border-b border-primary/15 bg-gradient-to-br from-champagne/35 via-surface to-surface px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <div className="rounded-xl border border-primary/15 bg-page/80 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Depuis
            </p>
            <div className="mt-1 flex items-center gap-2">
              <SiteIcon siteType={from.siteType} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{from.name}</p>
                {from.city ? <p className="text-xs text-muted">{from.city}</p> : null}
              </div>
            </div>
          </div>

          <div className="hidden justify-center sm:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-champagne/30 text-primary">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-page/80 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Vers</p>
            <div className="mt-1 flex items-center gap-2">
              <SiteIcon siteType={to.siteType} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{to.name}</p>
                {to.city ? <p className="text-xs text-muted">{to.city}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5 sm:px-8">
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-primary/10 via-champagne/45 to-primary/5 px-6 py-6 text-center shadow-sm">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-primary/75">Action</p>
          <p className="mt-2 font-heading text-4xl font-bold uppercase tracking-[0.14em] text-primary sm:text-5xl">
            {actionLabel}
          </p>
          <p className="mt-3 text-lg font-semibold text-foreground">{summaryText}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {processDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {items.length} produit{items.length > 1 ? "s" : ""} à envoyer
            </p>
            <p className="text-xs text-muted">
              {totalQty} unité{totalQty > 1 ? "s" : ""} au total
            </p>
          </div>
          {showInitialStatus ? (
            <Badge variant="accent" className="px-3 py-1 text-xs">
              Statut initial : En cours
            </Badge>
          ) : null}
        </div>

        <ul className="max-h-[min(52vh,420px)] space-y-3 overflow-y-auto pr-1 scrollbar-natus">
          {items.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 shadow-sm transition-colors hover:border-primary/20"
            >
              <ProductImage
                product={product}
                size="sm"
                className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-page"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{product.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">{product.barcode}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="default">{product.category || "Sans catégorie"}</Badge>
                  <span className="text-muted">
                    {sourceStockLabel} :{" "}
                    <span className="font-semibold text-foreground">{product.stock}</span>
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  Qté
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">×{quantity}</p>
                <p className="mt-1 text-xs text-muted">{formatCurrency(product.price)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-page/50 px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={onClose}
          className="sm:min-w-[140px]"
        >
          {modifyLabel}
        </Button>
        <Button
          type="button"
          loading={loading}
          onClick={onConfirm}
          className="sm:min-w-[180px]"
        >
          <ArrowRightLeft className="h-4 w-4" />
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
