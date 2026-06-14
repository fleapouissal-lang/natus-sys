"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, ScanBarcode, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoreSelect } from "@/components/stores/store-select";
import { SelectMenu } from "@/components/ui/select-menu";
import { productPickOptions } from "@/lib/select-options";
import { ProductImage } from "@/components/pos/product-image";
import {
  StockAdjustmentFields,
  useStockAdjustment,
} from "@/components/stock/stock-adjustment-fields";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { addStock, setProductStock } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { Product, Store } from "@/lib/types";

type ProductPickMode = "select" | "scan";

export function StockManager({
  stores,
  products,
  defaultStoreId,
  cityLabel,
  canEditTotal,
}: {
  stores: Store[];
  products: Product[];
  defaultStoreId: string;
  cityLabel?: string;
  canEditTotal: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/director") ? "/director" : "/manager";
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [selectedId, setSelectedId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickMode, setPickMode] = useState<ProductPickMode>("select");
  const [scanHint, setScanHint] = useState("");

  const selectedStore = stores.find((s) => s.id === storeId);
  const selectedProduct = products.find((p) => p.id === selectedId);
  const currentStock = selectedProduct?.stock ?? 0;
  const { syncFromAdd, syncFromTotal } = useStockAdjustment(currentStock);

  function handleProductChange(id: string) {
    setSelectedId(id);
    setError("");
    setScanHint("");
    const product = products.find((p) => p.id === id);
    const stock = product?.stock ?? 0;
    setAddQty("");
    setNewTotal(String(stock));
  }

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const found = products.find((p) => p.barcode === code.trim());
      if (found) {
        handleProductChange(found.id);
        setScanHint("");
      } else {
        setScanHint(`Aucun produit pour le code ${code}`);
        setTimeout(() => setScanHint(""), 3000);
      }
    },
    [products]
  );

  const { inputRef, handleKeyDown, handleChange } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: pickMode === "scan",
  });

  function handleAddQtyChange(value: string) {
    setAddQty(value);
    setNewTotal(syncFromAdd(value));
  }

  function handleNewTotalChange(value: string) {
    setNewTotal(value);
    setAddQty(syncFromTotal(value));
  }

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !storeId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    let result;
    if (canEditTotal) {
      const total = parseInt(newTotal);
      if (isNaN(total) || total < 0) {
        setError("Stock invalide");
        setLoading(false);
        return;
      }
      result = await setProductStock(selectedId, total, storeId);
    } else {
      const add = parseInt(addQty);
      if (isNaN(add) || add <= 0) {
        setError("La quantité doit être un nombre positif (minimum 1)");
        setLoading(false);
        return;
      }
      result = await addStock(selectedId, add, storeId, notes || undefined);
    }

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(canEditTotal ? "Stock mis à jour" : "Stock ajouté avec succès");
      setAddQty("");
      setNotes("");
      if (!canEditTotal) {
        setSelectedId("");
      }
      router.refresh();
    }
    setLoading(false);
  }

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="mt-1 text-muted">
          {canEditTotal
            ? "Modifier ou ajouter du stock par magasin"
            : "Ajouter du stock par magasin"}
          {cityLabel && ` — ${cityLabel}`}
        </p>
      </div>

      <Card>
        <CardHeader title="Magasin" description="Sélectionnez le magasin à gérer" />
        <StoreSelect
          stores={stores}
          value={storeId}
          onChange={(id) => {
            setStoreId(id);
            router.push(`${basePath}/stock?store=${id}`);
          }}
        />
        {selectedStore && (
          <p className="mt-2 text-sm text-muted">
            {selectedStore.address}, {selectedStore.city}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title={canEditTotal ? "Ajouter ou modifier le stock" : "Ajouter du stock"}
          description={`${selectedStore?.name || "Magasin"} — ${
            canEditTotal
              ? "Ajustement direct réservé au directeur"
              : "Saisissez uniquement la quantité à ajouter"
          }`}
        />
        <form onSubmit={handleAddStock} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Produit</label>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPickMode("select")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  pickMode === "select"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/40"
                )}
              >
                <List className="h-4 w-4" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickMode("scan");
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 border px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  pickMode === "scan"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/40"
                )}
              >
                <ScanBarcode className="h-4 w-4" />
                Scanner
              </button>
            </div>

            {pickMode === "select" ? (
              <SelectMenu
                value={selectedId}
                onChange={handleProductChange}
                options={productPickOptions(products)}
                placeholder="Sélectionner un produit"
              />
            ) : (
              <div>
                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    ref={inputRef}
                    type="text"
                    onKeyDown={handleKeyDown}
                    onChange={handleChange}
                    placeholder="Scannez ou saisissez le code-barres..."
                    className="w-full border border-border bg-surface py-2 pl-10 pr-3 text-sm font-mono focus:border-primary focus:ring-2 focus:ring-primary/20"
                    autoComplete="off"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Passez le code-barres devant le lecteur — sélection automatique
                </p>
                {scanHint && (
                  <p className="mt-2 text-sm text-danger">{scanHint}</p>
                )}
              </div>
            )}
          </div>

          {selectedProduct && (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <ProductImage product={selectedProduct} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{selectedProduct.name}</p>
                  <p className="font-mono text-xs text-muted">{selectedProduct.barcode}</p>
                </div>
                <Badge variant={selectedProduct.stock < 10 ? "warning" : "success"}>
                  {selectedProduct.stock} en stock
                </Badge>
              </div>
              <StockAdjustmentFields
                currentStock={currentStock}
                addQty={addQty}
                newTotal={newTotal}
                onAddQtyChange={handleAddQtyChange}
                onNewTotalChange={handleNewTotalChange}
                storeName={selectedStore?.name}
                canEditTotal={canEditTotal}
              />
            </>
          )}

          {!canEditTotal && (
            <Input
              label="Notes (optionnel)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Livraison fournisseur"
            />
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
          {success && <p className="text-sm text-success">{success}</p>}

          <Button type="submit" loading={loading} disabled={!selectedProduct}>
            <Plus className="h-4 w-4" />
            {canEditTotal ? "Enregistrer le stock" : "Ajouter au stock"}
          </Button>
        </form>
      </Card>

      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader
            title="Alertes stock faible"
            description={`${lowStockProducts.length} produit(s) en dessous de 10 unités — ${selectedStore?.name}`}
          />
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between border border-warning/20 bg-warning/5 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted">{product.barcode}</p>
                </div>
                <Badge variant="warning">{product.stock} restant(s)</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding={false}>
        <div className="p-6">
          <CardHeader
            title="Inventaire"
            description={`État du stock — ${selectedStore?.name || ""}`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border bg-primary-light/50">
                <th className="px-6 py-3 text-left font-medium text-muted">Produit</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Code-barres</th>
                <th className="px-6 py-3 text-right font-medium text-muted">Stock</th>
                <th className="px-6 py-3 text-left font-medium text-muted">Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-border">
                  <td className="px-6 py-4 font-medium">{product.name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{product.barcode}</td>
                  <td className="px-6 py-4 text-right">{product.stock}</td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        product.stock === 0
                          ? "danger"
                          : product.stock < 10
                            ? "warning"
                            : "success"
                      }
                    >
                      {product.stock === 0
                        ? "Rupture"
                        : product.stock < 10
                          ? "Faible"
                          : "OK"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
