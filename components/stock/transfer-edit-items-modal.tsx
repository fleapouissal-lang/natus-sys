"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/pos/product-image";
import {
  editHubStockTransferItems,
  editStoreStockTransferItems,
  getStoreProductsForTransfer,
} from "@/lib/actions";
import type { TransferEditProduct } from "@/lib/stock-transfers/transfer-edit-types";
import type { ReceivedTransferRow } from "@/lib/stock-transfers/received-transfer-rows";

type EditEntry = {
  id: string;
  name: string;
  barcode: string | null;
  image_url: string | null;
  category: string | null;
  storeStock: number;
  oldQty: number;
};

export function TransferEditItemsModal({
  row,
  onClose,
  onSaved,
}: {
  row: ReceivedTransferRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const transfer = row.transfer;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<TransferEditProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    transfer.items.forEach((item) => {
      initial[item.product_id] = String(item.quantity);
    });
    return initial;
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStoreProductsForTransfer(transfer.from_store_id).then((result) => {
      if (!active) return;
      if ("error" in result) {
        setError(result.error);
      } else {
        setProducts(result.products);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [transfer.from_store_id]);

  const oldQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    transfer.items.forEach((item) => {
      map[item.product_id] = item.quantity;
    });
    return map;
  }, [transfer.items]);

  const entries = useMemo<EditEntry[]>(() => {
    const byId = new Map<string, EditEntry>();

    // Produits actuellement dans la commande (peuvent avoir un stock magasin à 0).
    transfer.items.forEach((item) => {
      byId.set(item.product_id, {
        id: item.product_id,
        name: item.product_name,
        barcode: item.product_barcode ?? null,
        image_url: item.product_image_url ?? null,
        category: null,
        storeStock: 0,
        oldQty: item.quantity,
      });
    });

    // Produits disponibles au magasin source.
    products.forEach((product) => {
      const existing = byId.get(product.id);
      if (existing) {
        existing.storeStock = product.stock;
        existing.name = product.name;
        existing.barcode = product.barcode;
        existing.image_url = product.image_url;
        existing.category = product.category;
      } else {
        byId.set(product.id, {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          image_url: product.image_url,
          category: product.category,
          storeStock: product.stock,
          oldQty: 0,
        });
      }
    });

    const list = Array.from(byId.values());
    list.sort((a, b) => {
      // Produits déjà dans la commande en premier.
      if ((b.oldQty > 0 ? 1 : 0) !== (a.oldQty > 0 ? 1 : 0)) {
        return (b.oldQty > 0 ? 1 : 0) - (a.oldQty > 0 ? 1 : 0);
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [products, transfer.items]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(q) ||
        (entry.barcode ?? "").toLowerCase().includes(q)
    );
  }, [entries, search]);

  function maxFor(entry: EditEntry): number {
    // Le stock déjà réservé par la commande peut être re-transféré.
    return entry.storeStock + entry.oldQty;
  }

  function setQty(entry: EditEntry, value: string) {
    const numeric = value.replace(/[^0-9]/g, "");
    setError("");
    if (numeric === "") {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[entry.id];
        return next;
      });
      return;
    }
    const capped = Math.min(Number(numeric), maxFor(entry));
    setQuantities((prev) => ({ ...prev, [entry.id]: String(capped) }));
  }

  const selectedItems = useMemo(() => {
    return Object.entries(quantities)
      .map(([productId, qty]) => ({ productId, quantity: Number(qty) }))
      .filter((item) => item.quantity > 0);
  }, [quantities]);

  const totalUnits = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasChange = useMemo(() => {
    const currentIds = new Set(Object.keys(oldQtyById));
    const selectedIds = new Set(selectedItems.map((i) => i.productId));
    if (currentIds.size !== selectedIds.size) return true;
    for (const item of selectedItems) {
      if ((oldQtyById[item.productId] ?? 0) !== item.quantity) return true;
    }
    return false;
  }, [oldQtyById, selectedItems]);

  async function handleSave() {
    if (selectedItems.length === 0) {
      setError("Indiquez au moins une quantité à transférer");
      return;
    }
    setSaving(true);
    setError("");
    const action =
      row.source === "hub"
        ? editHubStockTransferItems
        : editStoreStockTransferItems;
    const result = await action(transfer.id, selectedItems);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg" className="!max-w-[min(96vw,860px)] !p-0">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-primary-dark">
            Modifier la commande
          </h2>
          <p className="mt-1 text-sm text-muted">
            {transfer.from_store_name || "—"} → {transfer.to_store_name || "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-primary/10 hover:text-primary-dark"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border px-5 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit à ajouter…"
            className="w-full rounded-lg border border-border bg-page py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <div className="max-h-[min(55vh,460px)] overflow-y-auto p-4 scrollbar-natus">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des produits…
          </div>
        ) : filteredEntries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Aucun produit</p>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const max = maxFor(entry);
              const inOrder = entry.oldQty > 0;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-page px-3 py-2"
                >
                  <ProductImage
                    product={{
                      name: entry.name,
                      image_url: entry.image_url,
                      category: entry.category ?? "",
                    }}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted">
                      {entry.barcode ? `${entry.barcode} · ` : ""}
                      Dispo. {max}
                      {inOrder ? " · dans la commande" : ""}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={max}
                    value={quantities[entry.id] ?? ""}
                    onChange={(e) => setQty(entry, e.target.value)}
                    placeholder="0"
                    className="w-20 rounded-lg border border-border bg-white px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-primary/40"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div className="text-sm text-muted">
          {selectedItems.length} produit{selectedItems.length !== 1 ? "s" : ""} ·{" "}
          {totalUnits} unité{totalUnits !== 1 ? "s" : ""}
          {error && <span className="ml-2 text-danger">{error}</span>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button
            type="button"
            loading={saving}
            disabled={loading || !hasChange || selectedItems.length === 0}
            onClick={() => void handleSave()}
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
