"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/pos/product-image";
import { StoreSelect } from "@/components/stores/store-select";
import { addStock, getProductStoreStock } from "@/lib/actions";
import { sanitizeStockQtyInput } from "@/components/stock/stock-adjustment-fields";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_BRAND } from "@/lib/constants/products";
import type { Product, Store } from "@/lib/types";

export function ManagerScanPanel({
  product,
  stores,
  defaultStoreId,
  onClose,
}: {
  product: Product;
  stores: Store[];
  defaultStoreId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [currentStock, setCurrentStock] = useState(product.stock);
  const [quantity, setQuantity] = useState("20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!storeId) return;
    getProductStoreStock(product.id, storeId).then((result) => {
      setCurrentStock(result.stock ?? 0);
    });
  }, [product.id, storeId]);

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La quantité doit être un nombre positif (minimum 1)");
      return;
    }
    if (!storeId) {
      setError("Veuillez sélectionner un magasin");
      return;
    }

    setLoading(true);
    setError("");
    const result = await addStock(product.id, qty, storeId, "Scan code-barres");
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(`+${qty} unités ajoutées — stock : ${currentStock + qty}`);
    router.refresh();
    setTimeout(onClose, 1500);
  }

  return (
    <Modal onClose={onClose} size="md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Réapprovisionnement</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ProductImage product={product} size="lg" />
          <div className="text-center">
            <p className="text-xl font-semibold">{product.name}</p>
            <p className="text-sm text-muted">{PRODUCT_BRAND} · {product.category}</p>
            <p className="mt-1 font-medium text-primary">{formatCurrency(product.price)}</p>
            <p className="mt-2 font-mono text-xs text-muted">{product.barcode}</p>
          </div>
          <Badge variant={currentStock < 10 ? "warning" : "success"}>
            Stock actuel : {currentStock}
          </Badge>
        </div>

        <form onSubmit={handleAddStock} className="mt-6 space-y-4">
          <StoreSelect
            stores={stores}
            value={storeId}
            onChange={setStoreId}
          />
          <Input
            label="Quantité à ajouter"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(sanitizeStockQtyInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
                e.preventDefault();
              }
            }}
            autoFocus
            required
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <Plus className="h-5 w-5" />
            Ajouter au stock
          </Button>
        </form>
    </Modal>
  );
}
