"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ScanBarcode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { createStoreProductWriteoff } from "@/lib/actions";
import { productDisplayName } from "@/lib/products/product-utils";
import {
  WRITEOFF_REASON_LABELS,
  WRITEOFF_STATUS_LABELS,
  writeoffReasonSummary,
  writeoffValidatorLine,
  type StoreProductWriteoff,
  type StoreWriteoffReason,
} from "@/lib/store-writeoffs/types";
import { formatDate } from "@/lib/utils";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { WRITEOFF_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
import type { Product } from "@/lib/types";

type LineItem = {
  product: Product;
  quantity: number;
  reason: StoreWriteoffReason;
};

export function CashierWriteoffPanel({
  products,
  writeoffs,
}: {
  products: Product[];
  writeoffs: StoreProductWriteoff[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sellableProducts = useMemo(
    () => products.filter((p) => p.product_kind !== "parent" && p.barcode),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellableProducts.slice(0, 12);
    return sellableProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 20);
  }, [sellableProducts, search]);

  const selectedIds = useMemo(() => new Set(lines.map((l) => l.product.id)), [lines]);

  const {
    paginated: paginatedWriteoffs,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems: writeoffTotal,
  } = usePagination(writeoffs, WRITEOFF_PAGE_SIZE, writeoffs.length);

  function addProduct(product: Product, qty = 1, reason: StoreWriteoffReason = "expired") {
    if (product.product_kind === "parent") {
      setError("Choisissez une variante vendable");
      return;
    }
    setError("");
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, product.stock || existing.quantity + qty);
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: nextQty } : l
        );
      }
      return [...prev, { product, quantity: Math.max(1, qty), reason }];
    });
  }

  function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const product = sellableProducts.find((p) => p.barcode === trimmed);
    if (!product) {
      setError(`Produit introuvable : ${trimmed}`);
      return;
    }
    addProduct(product, 1);
    setSearch("");
  }

  const { inputRef, handleKeyDown, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: true,
    autoRefocus: false,
  });

  function updateQty(productId: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          const max = l.product.stock ?? 9999;
          const next = Math.min(max, Math.max(1, l.quantity + delta));
          return { ...l, quantity: next };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function setLineReason(productId: string, reason: StoreWriteoffReason) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, reason } : l))
    );
  }

  function submit() {
    if (lines.length === 0) {
      setError("Ajoutez au moins un produit");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createStoreProductWriteoff({
        notes,
        items: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          reason: l.reason,
        })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setLines([]);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold">Retour produit — périmé ou cassé</h2>
          <p className="mt-1 text-sm text-muted">
            Scannez ou sélectionnez plusieurs produits, indiquez la quantité et le motif (périmé ou
            cassé) pour chaque ligne. Validation par le gérant ou le directeur avant déduction du
            stock.
          </p>
        </div>

        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => focusInput()}
            placeholder="Scanner ou rechercher un produit…"
            className="natus-field w-full bg-surface py-2 pl-10 pr-3 text-sm"
          />
        </div>

        {search.trim() && (
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface scrollbar-natus">
            {filteredProducts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">Aucun produit trouvé</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={selectedIds.has(product.id)}
                  onClick={() => addProduct(product)}
                  className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-primary-light/20 disabled:opacity-50 cursor-pointer"
                >
                  <ProductImage product={product} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-muted">
                      Stock {product.stock} · {product.barcode}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-primary" />
                </button>
              ))
            )}
          </div>
        )}

        {lines.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Produits sélectionnés ({lines.length})
            </p>
            {lines.map(({ product, quantity, reason }) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-page p-3 sm:flex-row sm:items-center"
              >
                <ProductImage product={product} size="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {productDisplayName(product, null)}
                  </p>
                  <p className="text-xs text-muted">Stock dispo : {product.stock}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(WRITEOFF_REASON_LABELS) as StoreWriteoffReason[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLineReason(product.id, key)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        reason === key
                          ? "border-primary bg-champagne/50 text-foreground"
                          : "border-border bg-surface text-muted hover:border-primary/40"
                      }`}
                    >
                      {key === "expired" ? "Périmé" : "Cassé"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-full bg-surface px-1">
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-champagne/40 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, 1)}
                    disabled={quantity >= product.stock}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-champagne/40 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(product.id)}
                  className="text-muted hover:text-danger cursor-pointer"
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note optionnelle…"
          rows={2}
          className="natus-field w-full bg-surface px-3 py-2 text-sm"
        />

        {error && (
          <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="button" className="w-full sm:w-auto" loading={pending} onClick={submit}>
          Envoyer pour validation
        </Button>
      </Card>

      {writeoffs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Mes demandes récentes
          </h3>
          {paginatedWriteoffs.map((writeoff) => {
            const validatorLine = writeoffValidatorLine(writeoff);
            return (
            <Card key={writeoff.id} padding={false}>
              <div className="border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{writeoffReasonSummary(writeoff)}</p>
                    <p className="text-xs text-muted">{formatDate(writeoff.created_at)}</p>
                  </div>
                  <Badge
                    variant={
                      writeoff.status === "approved"
                        ? "success"
                        : writeoff.status === "rejected"
                          ? "warning"
                          : "accent"
                    }
                  >
                    {WRITEOFF_STATUS_LABELS[writeoff.status]}
                  </Badge>
                </div>
              </div>
              <ul className="divide-y divide-border px-4 py-2 text-sm">
                {(writeoff.items || []).map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 py-2">
                    <span className="truncate">
                      {item.products?.name || "Produit"}
                      <span className="ml-1 text-xs text-muted">
                        · {WRITEOFF_REASON_LABELS[item.reason]}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">× {item.quantity}</span>
                  </li>
                ))}
              </ul>
              {writeoff.rejection_note && (
                <p className="border-t border-border px-4 py-2 text-xs text-warning">
                  Refus : {writeoff.rejection_note}
                </p>
              )}
              {validatorLine && (
                <p className="border-t border-border px-4 py-2 text-xs text-muted">
                  {validatorLine}
                  {writeoff.validated_at ? ` · ${formatDate(writeoff.validated_at)}` : ""}
                </p>
              )}
            </Card>
            );
          })}
          {writeoffTotal > WRITEOFF_PAGE_SIZE && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              totalItems={writeoffTotal}
              onPageChange={setPage}
              className="rounded-lg border border-border bg-surface px-4 py-4"
            />
          )}
        </div>
      )}
    </div>
  );
}
