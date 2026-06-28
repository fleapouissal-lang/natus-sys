"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  PackagePlus,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { SelectMenu } from "@/components/ui/select-menu";
import { ProductImage } from "@/components/pos/product-image";
import {
  fetchRestockSourceProducts,
  submitCashierRestockOrder,
  type RestockOrderItem,
} from "@/lib/restock/actions";
import type { RestockSource } from "@/lib/restock/restock.server";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

type RestockAlert = { title: string; message: string };

export function CashierRestockManager({
  storeName,
  sources,
  defaultSourceId,
  outOfStockProductIds,
  pendingCount,
  initialSourceProducts,
}: {
  storeName: string;
  sources: RestockSource[];
  defaultSourceId: string | null;
  outOfStockProductIds: string[];
  pendingCount: number;
  initialSourceProducts: Product[];
}) {
  const router = useRouter();
  const scanRef = useRef<HTMLInputElement>(null);

  const [sourceId, setSourceId] = useState(defaultSourceId || "");
  const [sourceProducts, setSourceProducts] = useState<Product[]>(
    initialSourceProducts
  );
  const [loadingSource, startSourceLoad] = useTransition();

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [alert, setAlert] = useState<RestockAlert | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ruptureSet = useMemo(
    () => new Set(outOfStockProductIds),
    [outOfStockProductIds]
  );

  const productsById = useMemo(() => {
    const map = new Map<string, Product>();
    sourceProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [sourceProducts]);

  const sourceOptions = useMemo(
    () =>
      sources.map((s) => ({
        value: s.id,
        label: s.is_hub ? `${s.name} — Dépôt` : s.name,
      })),
    [sources]
  );

  const selectedSource = sources.find((s) => s.id === sourceId) || null;

  // Lignes affichées : ruptures + produits ajoutés + tout produit avec quantité.
  const displayedProducts = useMemo(() => {
    const ids = new Set<string>();
    outOfStockProductIds.forEach((id) => ids.add(id));
    addedIds.forEach((id) => ids.add(id));
    Object.entries(quantities).forEach(([id, qty]) => {
      if (parseInt(qty || "", 10) > 0) ids.add(id);
    });

    const rows = [...ids]
      .map((id) => productsById.get(id))
      .filter((p): p is Product => Boolean(p));

    return rows.sort((a, b) => {
      const aRupture = ruptureSet.has(a.id) ? 0 : 1;
      const bRupture = ruptureSet.has(b.id) ? 0 : 1;
      if (aRupture !== bRupture) return aRupture - bRupture;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [outOfStockProductIds, addedIds, quantities, productsById, ruptureSet]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const shown = new Set(displayedProducts.map((p) => p.id));
    return sourceProducts
      .filter((p) => {
        if (shown.has(p.id)) return false;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q) ?? false) ||
          (p.product_code?.toLowerCase().includes(q) ?? false) ||
          (p.category?.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, 8);
  }, [search, sourceProducts, displayedProducts]);

  const orderItems = useMemo<RestockOrderItem[]>(() => {
    return Object.entries(quantities)
      .map(([productId, raw]) => {
        const qty = parseInt(raw || "", 10);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        return { productId, quantity: qty };
      })
      .filter((x): x is RestockOrderItem => x !== null);
  }, [quantities]);

  const totalUnits = orderItems.reduce((sum, i) => sum + i.quantity, 0);

  function changeSource(nextSourceId: string) {
    if (!nextSourceId || nextSourceId === sourceId) return;
    setSourceId(nextSourceId);
    setQuantities({});
    setAddedIds([]);
    setSuccess("");
    startSourceLoad(async () => {
      const result = await fetchRestockSourceProducts(nextSourceId);
      if ("error" in result) {
        setAlert({ title: "Chargement impossible", message: result.error });
        setSourceProducts([]);
        return;
      }
      setSourceProducts(result.products);
    });
  }

  function setQty(productId: string, value: string) {
    setSuccess("");
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  }

  function addProduct(productId: string) {
    setAddedIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    setQuantities((prev) => ({
      ...prev,
      [productId]: prev[productId] && parseInt(prev[productId], 10) > 0 ? prev[productId] : "1",
    }));
    setSearch("");
  }

  function removeRow(productId: string) {
    setAddedIds((prev) => prev.filter((id) => id !== productId));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const code = scanValue.trim().toLowerCase();
    if (!code) return;
    const match = sourceProducts.find(
      (p) =>
        p.barcode?.toLowerCase() === code ||
        p.product_code?.toLowerCase() === code
    );
    if (!match) {
      setAlert({
        title: "Produit introuvable",
        message: "Aucun produit ne correspond à ce code à la source sélectionnée.",
      });
      setScanValue("");
      return;
    }
    setAddedIds((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));
    setQuantities((prev) => {
      const current = parseInt(prev[match.id] || "0", 10);
      return { ...prev, [match.id]: String((current > 0 ? current : 0) + 1) };
    });
    setScanValue("");
    scanRef.current?.focus();
  }

  function openConfirm() {
    setSuccess("");
    if (!sourceId) {
      setAlert({ title: "Source requise", message: "Sélectionnez un magasin ou dépôt source." });
      return;
    }
    if (orderItems.length === 0) {
      setAlert({ title: "Aucune quantité", message: "Indiquez au moins une quantité à commander." });
      return;
    }
    const tooMuch = orderItems.find((item) => {
      const product = productsById.get(item.productId);
      return product ? item.quantity > product.stock : true;
    });
    if (tooMuch) {
      const product = productsById.get(tooMuch.productId);
      setAlert({
        title: "Quantité trop élevée",
        message: `La quantité demandée pour « ${product?.name ?? "ce produit"} » dépasse le stock disponible à la source.`,
      });
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmOrder() {
    setSubmitting(true);
    const result = await submitCashierRestockOrder(sourceId, orderItems, notes);
    setSubmitting(false);
    setConfirmOpen(false);

    if ("error" in result) {
      setAlert({ title: "Commande impossible", message: result.error });
      return;
    }

    setQuantities({});
    setAddedIds([]);
    setNotes("");
    setSuccess(
      `Commande créée depuis ${result.sourceName || "la source"} — visible en « Stocks envoyés » côté source et « Stocks reçus » dans votre magasin.`
    );
    router.refresh();
  }

  const confirmRows = orderItems
    .map((item) => {
      const product = productsById.get(item.productId);
      return product ? { product, quantity: item.quantity } : null;
    })
    .filter((x): x is { product: Product; quantity: number } => x !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
          Commander du stock
        </h1>
        <p className="mt-1 text-sm text-muted">
          Réapprovisionnez {storeName} depuis un dépôt ou un autre magasin. Les
          produits en rupture sont proposés par défaut.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Produits en rupture à commander</p>
          <p className="mt-1 text-3xl font-bold text-danger">
            {outOfStockProductIds.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Déjà commandés (en cours)</p>
          <p className="mt-1 text-3xl font-bold">{pendingCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unités dans la commande</p>
          <p className="mt-1 text-3xl font-bold text-primary">{totalUnits}</p>
        </Card>
      </div>

      <Card padding={false}>
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Nouvelle commande</h2>
          </div>

          {sources.length === 0 ? (
            <p className="text-sm text-muted">
              Aucun dépôt ni magasin source disponible.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-end">
              <SelectMenu
                label="Commander depuis"
                value={sourceId}
                onChange={changeSource}
                options={sourceOptions}
                size="sm"
                showIcons={false}
              />
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">
                  Note (optionnel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. urgent, réassort week-end…"
                  className="natus-field w-full bg-surface px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          {selectedSource && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
              {selectedSource.is_hub ? (
                <Warehouse className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
              <span>Source : {selectedSource.name}</span>
              {loadingSource && <span className="text-primary">· chargement…</span>}
            </p>
          )}

          {success && <p className="mt-3 text-sm text-success">{success}</p>}
        </div>

        {/* Recherche + scan */}
        <div className="natus-filter-bar border-b border-border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:items-end">
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium">
                Ajouter un produit
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom, code, code-barres…"
                  className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-primary-light/40"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        <span className="truncate">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        Stock source : {product.stock}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Scanner un code-barres
              </label>
              <div className="relative">
                <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <input
                  ref={scanRef}
                  type="text"
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={handleScan}
                  placeholder="Scannez puis Entrée…"
                  className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

        {!sourceId ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Sélectionnez une source de commande.
          </p>
        ) : displayedProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun produit en rupture. Recherchez ou scannez un produit à commander.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-primary-light/50">
                  <th className="px-4 py-3 text-left font-medium text-muted">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Stock source</th>
                  <th className="px-4 py-3 text-right font-medium text-muted">Qté à commander</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map((product) => {
                  const qty = parseInt(quantities[product.id] || "", 10);
                  const overStock = Number.isFinite(qty) && qty > product.stock;
                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductImage product={product} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-medium">
                              <span className="truncate">{product.name}</span>
                              {ruptureSet.has(product.id) && (
                                <Badge variant="danger">Rupture</Badge>
                              )}
                            </p>
                            <p className="font-mono text-xs text-muted">
                              {product.product_code || product.barcode || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{product.category || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={product.stock <= 0 ? "text-danger" : undefined}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          max={product.stock}
                          value={quantities[product.id] || ""}
                          onChange={(e) => setQty(product.id, e.target.value)}
                          className={`natus-field w-24 bg-surface px-2 py-1 text-right text-sm ${
                            overStock ? "border-danger text-danger" : ""
                          }`}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(product.id)}
                          className="text-muted transition-colors hover:text-danger"
                          title="Retirer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <p className="text-sm text-muted">
            {orderItems.length} produit{orderItems.length !== 1 ? "s" : ""} ·{" "}
            {totalUnits} unité{totalUnits !== 1 ? "s" : ""}
          </p>
          <Button
            type="button"
            loading={submitting}
            disabled={!sourceId || orderItems.length === 0}
            onClick={openConfirm}
          >
            <PackagePlus className="h-4 w-4" />
            Valider la commande {orderItems.length > 0 ? `(${orderItems.length})` : ""}
          </Button>
        </div>
      </Card>

      {confirmOpen && selectedSource && (
        <Modal onClose={() => setConfirmOpen(false)} size="md">
          <h3 className="text-lg font-semibold">Confirmer la commande</h3>
          <p className="mt-2 text-sm text-muted">
            Depuis {selectedSource.name} → {storeName} · {totalUnits} unité
            {totalUnits !== 1 ? "s" : ""}
          </p>
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {confirmRows.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 font-medium">× {quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" loading={submitting} onClick={confirmOrder}>
              Confirmer la commande
            </Button>
          </div>
        </Modal>
      )}

      {alert && (
        <Modal onClose={() => setAlert(null)} size="sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h3 className="font-semibold">{alert.title}</h3>
              <p className="mt-2 text-sm text-muted">{alert.message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setAlert(null)}>
              <X className="h-4 w-4" />
              OK
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
