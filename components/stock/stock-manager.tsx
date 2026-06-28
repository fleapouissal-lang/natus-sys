"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterTogglePanel } from "@/components/ui/filter-toggle-panel";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { StoreSelect } from "@/components/stores/store-select";
import { AddStockCard } from "@/components/stock/add-stock-card";
import { useStockAdjustment } from "@/components/stock/stock-adjustment-fields";
import { useBarcodeScanner } from "@/lib/hooks/use-barcode-scanner";
import { addStock, registerStoreProductStock, setProductStock } from "@/lib/actions";
import { INVENTORY_PAGE_SIZE, usePagination } from "@/lib/use-pagination";
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

function buildAddsMap(ids: string[]) {
  const map: Record<string, string> = {};
  for (const id of ids) map[id] = "";
  return map;
}

export function StockManager({
  stores,
  products,
  defaultStoreId,
  cityLabel,
  canModifyStock,
  canEditTotal,
  embedded = false,
}: {
  stores: Store[];
  products: Product[];
  defaultStoreId: string;
  cityLabel?: string;
  canModifyStock: boolean;
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
  const [perProductAdds, setPerProductAdds] = useState<Record<string, string>>({});
  const [addQty, setAddQty] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pickMode, setPickMode] = useState<ProductPickMode>("scan");
  const [scanHint, setScanHint] = useState("");
  const [scanQuery, setScanQuery] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");

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
    setPerProductAdds(buildAddsMap(ids));

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
      setPerProductAdds(buildAddsMap(next));
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

    if (selectedIds.length > 1) {
      const add = Math.max(0, parseInt(value, 10) || 0);
      const adds = Object.fromEntries(selectedIds.map((id) => [id, value]));
      const totals = Object.fromEntries(
        selectedIds.map((id) => {
          const product = products.find((item) => item.id === id);
          const stock = product?.stock ?? 0;
          return [id, String(stock + (value === "" ? 0 : add))];
        })
      );
      setPerProductAdds(adds);
      setPerProductTotals(totals);
    }
  }

  function handlePerProductAddChange(productId: string, value: string) {
    setPerProductAdds((prev) => ({ ...prev, [productId]: value }));
    const product = products.find((item) => item.id === productId);
    const stock = product?.stock ?? 0;
    const add = value === "" ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setPerProductTotals((prev) => ({
      ...prev,
      [productId]: String(stock + add),
    }));
  }

  function handleNewTotalChange(value: string) {
    setNewTotal(value);
    setAddQty(syncFromTotal(value));
  }

  function handlePerProductTotalChange(productId: string, value: string) {
    setPerProductTotals((prev) => ({ ...prev, [productId]: value }));
    const product = products.find((item) => item.id === productId);
    const stock = product?.stock ?? 0;
    if (value === "") {
      setPerProductAdds((prev) => ({ ...prev, [productId]: "" }));
      return;
    }
    const total = parseInt(value, 10);
    if (!Number.isNaN(total)) {
      setPerProductAdds((prev) => ({
        ...prev,
        [productId]: String(Math.max(0, total - stock)),
      }));
    }
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
        const product = products.find((item) => item.id === productId);
        const total = parseInt(
          selectedIds.length === 1
            ? newTotal
            : (perProductTotals[productId] ?? String(product?.stock ?? "0")),
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
      for (const productId of selectedIds) {
        const rawAdd =
          selectedIds.length > 1
            ? (perProductAdds[productId] ?? addQty)
            : addQty;
        const add = rawAdd === "" ? NaN : parseInt(rawAdd, 10);
        if (Number.isNaN(add) || add < 0) {
          failures.push("Quantité à ajouter invalide pour un ou plusieurs produits");
          continue;
        }
        const result =
          add === 0
            ? await registerStoreProductStock(productId, storeId, 0, notes || undefined)
            : await addStock(productId, add, storeId, notes || undefined);
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
            : parseInt(addQty, 10) === 0
              ? "Produit référencé au magasin (stock 0)"
              : "Stock ajouté avec succès"
      );
      setAddQty("");
      setNotes("");
      setScanQuery("");
      setSelectedIds([]);
      setPerProductTotals({});
      setPerProductAdds({});
      setNewTotal("");
      if (pickMode === "scan") focusInput();
      router.refresh();
    }

    setLoading(false);
  }

  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10);

  const filteredInventory = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        (product.barcode?.toLowerCase().includes(q) ?? false) ||
        (product.product_code?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false)
    );
  }, [products, inventorySearch]);

  const inventoryFilterToken = `${storeId}|${inventorySearch}`;
  const {
    paginated: paginatedProducts,
    page,
    setPage,
    totalPages,
    rangeStart,
    rangeEnd,
    totalItems,
  } = usePagination(filteredInventory, INVENTORY_PAGE_SIZE, inventoryFilterToken);

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 animate-fade-in"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
          <p className="mt-1 text-muted">
            {canModifyStock
              ? canEditTotal
                ? "Modifier ou ajouter du stock par magasin"
                : "Ajouter du stock par magasin"
              : "Consultation du stock par magasin"}
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
              setPerProductAdds({});
              setInventorySearch("");
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

      {canModifyStock && (
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
          perProductAdds={perProductAdds}
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
          onPerProductAddChange={handlePerProductAddChange}
          onNotesChange={setNotes}
          onScanKeyDown={handleKeyDown}
          onScanChange={handleScanChange}
          onSubmit={handleAddStock}
        />
      )}

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
            description={
              inventorySearch.trim()
                ? `${filteredInventory.length} sur ${products.length} produit(s) — ${selectedStore?.name || ""}`
                : `${products.length} produit(s) — ${selectedStore?.name || ""}`
            }
          />
        </div>

        <FilterTogglePanel
          toggleLabel="Rechercher dans l'inventaire"
          summary={`${filteredInventory.length} produit${filteredInventory.length !== 1 ? "s" : ""}`}
        >
          <div className="natus-filter-bar border-b border-border p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[min(100%,20rem)] flex-1">
                <label className="mb-1.5 block text-sm font-medium">Rechercher</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Nom, code-barres, code produit, catégorie…"
                    className="natus-field w-full bg-surface py-0 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>
              {inventorySearch.trim() && (
                <button
                  type="button"
                  onClick={() => setInventorySearch("")}
                  className="cursor-pointer text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </FilterTogglePanel>

        {filteredInventory.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Aucun produit ne correspond à votre recherche
          </p>
        ) : (
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
              {paginatedProducts.map((product) => (
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
        )}
        {totalItems > 0 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
