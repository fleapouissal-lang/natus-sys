"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Warehouse, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProductImage } from "@/components/pos/product-image";
import { StoreSelect } from "@/components/stores/store-select";
import {
  StockAdjustmentFields,
  useStockAdjustment,
} from "@/components/stock/stock-adjustment-fields";
import { addStock, getProductStoreStock, setProductStock } from "@/lib/actions";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import type { Product, Store } from "@/lib/types";

export function StockEditModal({
  product,
  stores,
  defaultStoreId,
  canEditTotal,
  onClose,
}: {
  product: Product;
  stores: Store[];
  defaultStoreId: string;
  canEditTotal: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [currentStock, setCurrentStock] = useState(0);
  const [addQty, setAddQty] = useState("");
  const [newTotal, setNewTotal] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { syncFromAdd, syncFromTotal } = useStockAdjustment(currentStock);

  const selectedStore = stores.find((s) => s.id === storeId);

  useEffect(() => {
    if (!storeId) return;
    getProductStoreStock(product.id, storeId).then((result) => {
      const stock = result.stock ?? 0;
      setCurrentStock(stock);
      setAddQty("");
      setNewTotal(String(stock));
    });
  }, [product.id, storeId]);

  function handleAddQtyChange(value: string) {
    setAddQty(value);
    setNewTotal(syncFromAdd(value));
  }

  function handleNewTotalChange(value: string) {
    setNewTotal(value);
    setAddQty(syncFromTotal(value));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) {
      setError("Veuillez sélectionner un magasin");
      return;
    }

    setLoading(true);
    setError("");

    let result;
    if (canEditTotal) {
      const qty = parseInt(newTotal);
      if (isNaN(qty) || qty < 0) {
        setError("Stock invalide");
        setLoading(false);
        return;
      }
      result = await setProductStock(product.id, qty, storeId);
    } else {
      const add = parseInt(addQty);
      if (isNaN(add) || add <= 0) {
        setError("La quantité doit être un nombre positif (minimum 1)");
        setLoading(false);
        return;
      }
      result = await addStock(product.id, add, storeId, "Ajout via fiche produit");
    }

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {canEditTotal ? "Modifier le stock" : "Ajouter du stock"}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <ProductImage product={product} size="sm" />
        <div>
          <p className="font-semibold">{product.name}</p>
          <p className="text-xs text-muted">{PRODUCT_BRAND} · {product.category}</p>
          <p className="text-sm text-muted font-mono">{product.barcode}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <StoreSelect stores={stores} value={storeId} onChange={setStoreId} />

        <StockAdjustmentFields
          currentStock={currentStock}
          addQty={addQty}
          newTotal={newTotal}
          onAddQtyChange={handleAddQtyChange}
          onNewTotalChange={handleNewTotalChange}
          storeName={selectedStore?.name}
          canEditTotal={canEditTotal}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={loading}>
            <Warehouse className="h-4 w-4" />
            {canEditTotal ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
