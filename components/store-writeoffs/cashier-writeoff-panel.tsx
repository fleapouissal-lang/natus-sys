"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Minus, Plus, ScanBarcode, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import {
  WriteoffPhotoUpload,
  WriteoffPhotosGallery,
  type PendingPhoto,
} from "@/components/store-writeoffs/writeoff-photos";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { createStoreProductWriteoff } from "@/lib/actions";
import { productDisplayName } from "@/lib/products/product-utils";
import {
  MAX_WRITEOFF_PHOTOS,
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
  comment: string;
};

function buildWriteoffNotes(globalNotes: string, lines: LineItem[]): string {
  const parts: string[] = [];
  const trimmedGlobal = globalNotes.trim();
  if (trimmedGlobal) parts.push(trimmedGlobal);

  const lineComments = lines
    .filter((line) => line.comment.trim())
    .map(
      (line) =>
        `${productDisplayName(line.product, null)} (×${line.quantity}, ${WRITEOFF_REASON_LABELS[line.reason]}): ${line.comment.trim()}`
    );

  if (lineComments.length > 0) {
    if (parts.length > 0) parts.push("");
    parts.push(...lineComments);
  }

  return parts.join("\n").trim();
}

function WriteoffHistorySection({ writeoffs }: { writeoffs: StoreProductWriteoff[] }) {
  const {
    paginated: paginatedWriteoffs,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems: writeoffTotal,
  } = usePagination(writeoffs, WRITEOFF_PAGE_SIZE, writeoffs.length);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Historique des retours
        </h2>
        <span className="text-xs text-muted">
          {writeoffTotal} retour{writeoffTotal !== 1 ? "s" : ""}
        </span>
      </div>

      {writeoffTotal === 0 ? (
        <Card className="py-10 text-center text-sm text-muted">
          Aucun retour enregistré pour le moment.
        </Card>
      ) : (
        <>
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
                {writeoff.notes && (
                  <p className="border-t border-border px-4 py-2 text-sm text-foreground whitespace-pre-wrap">
                    {writeoff.notes}
                  </p>
                )}
                <WriteoffPhotosGallery photos={writeoff.photos || []} />
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
        </>
      )}
    </section>
  );
}

function ReasonToggle({
  value,
  onChange,
  size = "sm",
}: {
  value: StoreWriteoffReason;
  onChange: (reason: StoreWriteoffReason) => void;
  size?: "sm" | "xs";
}) {
  const btnClass =
    size === "xs"
      ? "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors cursor-pointer"
      : "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(Object.keys(WRITEOFF_REASON_LABELS) as StoreWriteoffReason[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`${btnClass} ${
            value === key
              ? "border-primary bg-champagne/50 text-foreground"
              : "border-border bg-surface text-muted hover:border-primary/40"
          }`}
        >
          {key === "expired" ? "Périmé" : "Cassé"}
        </button>
      ))}
    </div>
  );
}

export function CashierWriteoffPanel({
  products,
  writeoffs,
}: {
  products: Product[];
  writeoffs: StoreProductWriteoff[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(true);
  const [defaultReason, setDefaultReason] = useState<StoreWriteoffReason>("expired");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [globalPhotos, setGlobalPhotos] = useState<PendingPhoto[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const sellableProducts = useMemo(
    () => products.filter((p) => p.product_kind !== "parent" && p.barcode),
    [products]
  );

  const searchQuery = search.trim();
  const isSearching = searchQuery.length > 0;

  const filteredProducts = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return sellableProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q) ?? false)
      )
      .slice(0, 15);
  }, [sellableProducts, searchQuery, isSearching]);

  const lineQtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) map.set(line.product.id, line.quantity);
    return map;
  }, [lines]);

  const totalUnits = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines]
  );

  const totalPhotos = globalPhotos.length;

  function addProduct(product: Product, qty = 1, reason?: StoreWriteoffReason) {
    if (product.product_kind === "parent") {
      setError("Choisissez une variante vendable");
      return;
    }
    setError("");
    setScanHint("");
    setFormOpen(true);
    setLastAddedId(product.id);

    const itemReason = reason ?? defaultReason;

    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const maxStock = product.stock ?? 9999;
        const nextQty = Math.min(existing.quantity + qty, maxStock);
        if (nextQty === existing.quantity && existing.quantity >= maxStock) {
          setError(`Stock insuffisant pour ${product.name}`);
        }
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: nextQty } : l
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: Math.max(1, qty),
          reason: itemReason,
          comment: "",
        },
      ];
    });
  }

  function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;

    const product = sellableProducts.find((p) => p.barcode === trimmed);
    if (!product) {
      setError(`Produit introuvable : ${trimmed}`);
      setScanHint("");
      return;
    }

    addProduct(product, 1);
    setSearch("");
    setScanHint(`Ajouté : ${productDisplayName(product, null)}`);
  }

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleScan,
    enabled: formOpen,
    autoRefocus: true,
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
    if (lastAddedId === productId) setLastAddedId(null);
  }

  function setLineReason(productId: string, reason: StoreWriteoffReason) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, reason } : l))
    );
  }

  function setLineComment(productId: string, comment: string) {
    setLines((prev) =>
      prev.map((l) => (l.product.id === productId ? { ...l, comment } : l))
    );
  }

  function resetForm() {
    setLines([]);
    setNotes("");
    setGlobalPhotos([]);
    setSearch("");
    setError("");
    setScanHint("");
    setLastAddedId(null);
  }

  function submit() {
    if (lines.length === 0) {
      setError("Scannez ou sélectionnez au moins un produit");
      setFormOpen(true);
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createStoreProductWriteoff(
        {
          notes: buildWriteoffNotes(notes, lines),
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            reason: l.reason,
          })),
        },
        globalPhotos.map((photo) => photo.file)
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      resetForm();
      setFormOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Nouveau retour</h2>
            <p className="mt-0.5 text-sm text-muted">
              Scannez les produits ou recherchez-les — chaque ajout incrémente la quantité.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
          >
            {formOpen ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Masquer
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Afficher
              </>
            )}
          </Button>
        </div>

        {!formOpen && lines.length > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-champagne/10 px-4 py-3">
            <p className="text-sm">
              Retour en cours —{" "}
              <span className="font-semibold">
                {lines.length} produit{lines.length !== 1 ? "s" : ""} · {totalUnits} unité
                {totalUnits !== 1 ? "s" : ""}
              </span>
            </p>
            <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
              Reprendre
            </Button>
          </Card>
        )}

        {formOpen && (
          <Card className="space-y-4 p-4 md:p-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Scanner ou rechercher
              </label>
              <div className="relative">
                {isSearching ? (
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                ) : (
                  <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    handleChange(e);
                    if (error) setError("");
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => focusInput()}
                  placeholder="Scannez un code-barres ou tapez pour rechercher…"
                  className="natus-field w-full bg-surface py-3 pl-10 pr-3 text-sm"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {scanHint && !error && (
                <p className="text-xs font-medium text-success">{scanHint}</p>
              )}
            </div>

            {isSearching && (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-surface scrollbar-natus">
                {filteredProducts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">Aucun produit trouvé</p>
                ) : (
                  filteredProducts.map((product) => {
                    const inListQty = lineQtyByProductId.get(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          addProduct(product);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-light/20 cursor-pointer"
                      >
                        <ProductImage product={product} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{product.name}</span>
                          <span className="text-xs text-muted">
                            Stock {product.stock} · {product.barcode}
                          </span>
                        </span>
                        {inListQty ? (
                          <Badge variant="accent" className="shrink-0">
                            × {inListQty}
                          </Badge>
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {!isSearching && lines.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-page px-4 py-8 text-center">
                <ScanBarcode className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                <p className="text-sm font-medium">Prêt à scanner</p>
                <p className="mt-1 text-xs text-muted">
                  Pointez le lecteur vers le champ ci-dessus, ou tapez le nom / code-barres pour
                  rechercher.
                </p>
              </div>
            )}

            {lines.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Produits du retour
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Motif par défaut</span>
                      <ReasonToggle value={defaultReason} onChange={setDefaultReason} size="xs" />
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs text-muted hover:text-danger cursor-pointer"
                    >
                      Tout effacer
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {lines.map(({ product, quantity, reason, comment }) => (
                    <div
                      key={product.id}
                      className={`rounded-xl border bg-page p-3 transition-colors ${
                        lastAddedId === product.id
                          ? "border-primary/40 bg-champagne/10"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <ProductImage product={product} size="xs" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {productDisplayName(product, null)}
                              </p>
                              <p className="text-xs text-muted">Stock {product.stock}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <div className="flex items-center gap-0.5 rounded-full bg-surface px-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateQty(product.id, -1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-champagne/40 cursor-pointer"
                                  aria-label="Diminuer la quantité"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-[1.75rem] text-center text-sm font-semibold">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(product.id, 1)}
                                  disabled={quantity >= (product.stock ?? 9999)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-champagne/40 disabled:opacity-40 cursor-pointer"
                                  aria-label="Augmenter la quantité"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeLine(product.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger cursor-pointer"
                                aria-label="Retirer le produit"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <ReasonToggle
                            value={reason}
                            onChange={(next) => setLineReason(product.id, next)}
                            size="xs"
                          />

                          <input
                            type="text"
                            value={comment}
                            onChange={(e) => setLineComment(product.id, e.target.value)}
                            placeholder="Commentaire (optionnel)…"
                            className="natus-field w-full bg-surface px-3 py-1.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-sm font-medium" htmlFor="writeoff-global-notes">
                    Commentaire général (optionnel)
                  </label>
                  <input
                    id="writeoff-global-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contexte du retour, lot, remarque globale…"
                    className="natus-field w-full bg-surface px-3 py-2 text-sm"
                  />
                </div>

                <WriteoffPhotoUpload
                  photos={globalPhotos}
                  maxPhotos={MAX_WRITEOFF_PHOTOS}
                  disabled={pending}
                  hint={`Jusqu'à ${MAX_WRITEOFF_PHOTOS} photos pour l'ensemble du retour · JPG, PNG, WebP, GIF · max 5 Mo`}
                  onChange={setGlobalPhotos}
                />

                <div className="rounded-xl border border-primary/25 bg-champagne/20 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Récapitulatif</p>
                  <p className="mt-1 text-sm text-muted">
                    {lines.length} produit{lines.length !== 1 ? "s" : ""} · {totalUnits} unité
                    {totalUnits !== 1 ? "s" : ""} au total
                    {totalPhotos > 0
                      ? ` · ${totalPhotos} photo${totalPhotos !== 1 ? "s" : ""}`
                      : ""}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {lines.map((line) => (
                      <li key={line.product.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {productDisplayName(line.product, null)} —{" "}
                          {line.reason === "expired" ? "Périmé" : "Cassé"}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">
                          × {line.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {error && (
              <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            {lines.length > 0 && (
              <div className="sticky bottom-2 z-10 border-t border-border bg-surface/95 pt-4 backdrop-blur-sm">
                <Button
                  type="button"
                  className="w-full py-3 text-base"
                  loading={pending}
                  onClick={submit}
                >
                  Valider le retour
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      <WriteoffHistorySection writeoffs={writeoffs} />
    </div>
  );
}
