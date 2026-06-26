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

function buildTotalsMap(products: Product[], ids: string[]) {
  const map: Record<string, string> = {};
  for (const id of ids) {
    const product = products.find((item) => item.id === id);
    if (product) map[id] = String(product.stock);
  }
  return map;
}

export function StockManager({
  stores,
  products,
  defaultStoreId,
  cityLabel,
  canEditTotal,
  embedded = false,
}: {
  stores: Store[];
  products: Product[];
  defaultStoreId: string;
  cityLabel?: string;
  canEditTotal: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith("/director")
    ? "/director"
    : pathname.startsWith("/hub")
      ? "/hub"
      : "/manager";
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [perProductTotals, setPerProductTotals] = useState<Record<string, string>>({});
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
  const singleProduct =
    selectedIds.length === 1
      ? products.find((product) => product.id === selectedIds[0])
      : undefined;
  const currentStock = singleProduct?.stock ?? 0;
  const { syncFromAdd, syncFromTotal } = useStockAdjustment(currentStock);

  function handleSelectionChange(ids: string[]) {
    setSelectedIds(ids);
    setError("");
    setScanHint("");
    setPerProductTotals(buildTotalsMap(products, ids));

    if (ids.length === 1) {
      const product = products.find((item) => item.id === ids[0]);
      setNewTotal(String(product?.stock ?? 0));
    } else {
      setNewTotal("");
    }
    setAddQty("");
  }

  function handleRemoveProduct(productId: string) {
    handleSelectionChange(selectedIds.filter((id) => id !== productId));
  }

  function addProductToSelection(productId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(productId)) {
        setScanHint("Produit déjà dans la sélection");
        setTimeout(() => setScanHint(""), 2000);
        return prev;
      }
      const next = [...prev, productId];
      setPerProductTotals(buildTotalsMap(products, next));
      setAddQty("");
      if (next.length === 1) {
        const product = products.find((item) => item.id === productId);
        setNewTotal(String(product?.stock ?? 0));
      } else {
        setNewTotal("");
      }
      return next;
    });
    setError("");
  }

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      setScanQuery(trimmed);
      const found = products.find((product) => product.barcode === trimmed);
      if (found) {
        addProductToSelection(found.id);
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

    if (selectedIds.length === 1 && singleProduct) {
      setNewTotal(syncFromAdd(value));
      return;
    }

    if (selectedIds.length > 1 && canEditTotal) {
      const add = Math.max(0, parseInt(value, 10) || 0);
      setPerProductTotals(
        Object.fromEntries(
          selectedIds.map((id) => {
            const product = products.find((item) => item.id === id);
            return [id, String(Math.max(0, (product?.stock ?? 0) + add))];
          })
        )
      );
    }
  }

  function handleNewTotalChange(value: string) {
    setNewTotal(value);
    setAddQty(syncFromTotal(value));
  }

  function handlePerProductTotalChange(productId: string, value: string) {
    setPerProductTotals((prev) => ({ ...prev, [productId]: value }));
  }

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0 || !storeId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const failures: string[] = [];
    let successCount = 0;

    if (canEditTotal) {
      for (const productId of selectedIds) {
        const total = parseInt(
          selectedIds.length === 1
            ? newTotal
            : (perProductTotals[productId] ?? ""),
          10
        );
        if (isNaN(total) || total < 0) {
          failures.push("Stock invalide pour un ou plusieurs produits");
          continue;
        }
        const result = await setProductStock(productId, total, storeId);
        if (result.error) failures.push(result.error);
        else successCount += 1;
      }
    } else {
      const add = parseInt(addQty, 10);
      if (isNaN(add) || add <= 0) {
        setError("La quantité doit être un nombre positif (minimum 1)");
        setLoading(false);
        return;
      }

      for (const productId of selectedIds) {
        const result = await addStock(productId, add, storeId, notes || undefined);
        if (result.error) failures.push(result.error);
        else successCount += 1;
      }
    }

    if (failures.length > 0) {
      setError(
        successCount > 0
          ? `${successCount} produit(s) mis à jour · ${failures[0]}`
          : failures[0]
      );
    } else {
      setSuccess(
        selectedIds.length > 1
          ? `Stock mis à jour pour ${successCount} produit(s)`
          : canEditTotal
            ? "Stock mis à jour"
            : "Stock ajouté avec succès"
      );
      setAddQty("");
      setNotes("");
      setScanQuery("");
      setSelectedIds([]);
      setPerProductTotals({});
      setNewTotal("");
      if (pickMode === "scan") focusInput();
      router.refresh();
    }

    setLoading(false);
  }

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10);

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 animate-fade-in"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
          <p className="mt-1 text-muted">
            {canEditTotal
              ? "Modifier ou ajouter du stock par magasin"
              : "Ajouter du stock par magasin"}
            {cityLabel && ` — ${cityLabel}`}
          </p>
        </div>
      )}

      {!embedded && (
        <Card>
          <CardHeader title="Magasin" description="Sélectionnez le magasin à gérer" />
          <StoreSelect
            stores={stores}
            value={storeId}
            onChange={(id) => {
              setStoreId(id);
              setSelectedIds([]);
              setPerProductTotals({});
              router.push(`${basePath}/stock?store=${id}`);
            }}
          />
          {selectedStore && (
            <p className="mt-2 text-sm text-muted">
              {selectedStore.address}, {selectedStore.city}
            </p>
          )}
        </Card>
      )}

      <AddStockCard
        title={canEditTotal ? "Ajouter ou modifier le stock" : "Ajouter du stock"}
        description={
          canEditTotal
            ? "Sélection multiple ou scan — ajustez puis enregistrez en une fois"
            : "Sélection multiple ou scan — même quantité ajoutée à tous les produits"
        }
        storeName={selectedStore?.name}
        canEditTotal={canEditTotal}
        products={products}
        selectedIds={selectedIds}
        pickMode={pickMode}
        addQty={addQty}
        newTotal={newTotal}
        perProductTotals={perProductTotals}
        notes={notes}
        loading={loading}
        error={error}
        success={success}
        scanHint={scanHint}
        scanQuery={scanQuery}
        scannerActive={scannerActive}
        inputRef={inputRef}
        onPickModeChange={setPickMode}
        onFocusScanner={() => focusInput()}
        onSelectionChange={handleSelectionChange}
        onRemoveProduct={handleRemoveProduct}
        onClearSelection={() => handleSelectionChange([])}
        onAddQtyChange={handleAddQtyChange}
        onNewTotalChange={handleNewTotalChange}
        onPerProductTotalChange={handlePerProductTotalChange}
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
