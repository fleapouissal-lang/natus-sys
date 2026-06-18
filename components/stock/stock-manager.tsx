"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StoreSelect } from "@/components/stores/store-select";
import { AddStockCard } from "@/components/stock/add-stock-card";
import { useStockAdjustment } from "@/components/stock/stock-adjustment-fields";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { addStock, setProductStock } from "@/lib/actions";
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
  const basePath = pathname.startsWith("/director")
    ? "/director"
    : pathname.startsWith("/hub")
      ? "/hub"
      : "/manager";
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [selectedId, setSelectedId] = useState("");
  const [addQty, setAddQty] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickMode, setPickMode] = useState<ProductPickMode>("scan");
  const [scanHint, setScanHint] = useState("");
  const [scanQuery, setScanQuery] = useState("");

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
      const trimmed = code.trim();
      if (!trimmed) return;
      setScanQuery(trimmed);
      const found = products.find((p) => p.barcode === trimmed);
      if (found) {
        handleProductChange(found.id);
        setScanHint("");
        setScanQuery("");
      } else {
        setScanHint(`Aucun produit pour le code ${trimmed}`);
        setTimeout(() => {
          setScanHint("");
          setScanQuery("");
        }, 3000);
      }
    },
    [products]
  );

  const { inputRef, handleKeyDown, handleChange, focusInput } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: pickMode === "scan",
    autoRefocus: pickMode === "scan",
  });

  const handleScanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange(e);
      setScanQuery(e.target.value);
    },
    [handleChange]
  );

  const scannerActive = pickMode === "scan";

  useEffect(() => {
    if (pickMode === "scan") {
      setScanQuery("");
      focusInput();
    }
  }, [pickMode, focusInput]);

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
      setScanQuery("");
      if (!canEditTotal) {
        setSelectedId("");
      }
      if (pickMode === "scan") {
        focusInput();
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

      <AddStockCard
        title={canEditTotal ? "Ajouter ou modifier le stock" : "Ajouter du stock"}
        description={
          canEditTotal
            ? "Ajustement direct réservé au directeur"
            : "Réapprovisionnez le magasin en quelques étapes"
        }
        storeName={selectedStore?.name}
        canEditTotal={canEditTotal}
        products={products}
        selectedId={selectedId}
        selectedProduct={selectedProduct}
        pickMode={pickMode}
        addQty={addQty}
        newTotal={newTotal}
        notes={notes}
        currentStock={currentStock}
        loading={loading}
        error={error}
        success={success}
        scanHint={scanHint}
        scanQuery={scanQuery}
        scannerActive={scannerActive}
        inputRef={inputRef}
        onPickModeChange={(mode) => {
          setPickMode(mode);
        }}
        onFocusScanner={() => focusInput()}
        onProductChange={handleProductChange}
        onAddQtyChange={handleAddQtyChange}
        onNewTotalChange={handleNewTotalChange}
        onNotesChange={setNotes}
        onScanKeyDown={handleKeyDown}
        onScanChange={handleScanChange}
        onSubmit={handleAddStock}
      />

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
