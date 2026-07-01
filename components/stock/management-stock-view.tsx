"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { GlobalStockOverview } from "@/components/hub/global-stock-overview";
import { StockManager } from "@/components/stock/stock-manager";
import { storeOptions } from "@/lib/select-options";
import type { Product, Store } from "@/lib/types";

export function ManagementStockView({
  basePath,
  stores,
  products,
  stockByProductAndStore,
  selectedStoreId,
  canModifyStock,
  canEditTotal,
  cityLabel,
}: {
  basePath: "/director" | "/manager";
  stores: Store[];
  products: Product[];
  stockByProductAndStore?: Record<string, Record<string, number>>;
  selectedStoreId: string | null;
  canModifyStock: boolean;
  canEditTotal: boolean;
  cityLabel?: string;
}) {
  const router = useRouter();
  const selectedStore = selectedStoreId
    ? stores.find((store) => store.id === selectedStoreId)
    : null;
  const retailStoreCount = stores.filter((store) => !store.is_hub).length;
  const hubStoreCount = stores.filter((store) => store.is_hub).length;

  function handleStoreChange(storeId: string) {
    if (storeId) {
      router.push(`${basePath}/stock?store=${storeId}`);
      return;
    }
    router.push(`${basePath}/stock`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="mt-1 text-muted">
          {selectedStore
            ? `Inventaire — ${selectedStore.name}${selectedStore.is_hub ? " (dépôt)" : ""}`
            : `Stock total — tous les magasins et dépôts${cityLabel ? ` (${cityLabel})` : ""}`}
        </p>
      </div>

      <Card>
        <CardHeader
          title="Périmètre"
          description={
            selectedStore
              ? "Stock d'un magasin ou d'un dépôt"
              : "Vue agrégée ou répartition par produit sur tous les sites"
          }
        />
        <SelectMenu
          label="Magasin / dépôt"
          value={selectedStoreId ?? ""}
          onChange={handleStoreChange}
          options={storeOptions(stores, {
            includeAll: true,
            allLabel: "Tous — magasins + dépôts",
            showCity: true,
          })}
        />
        {selectedStore && (
          <p className="mt-2 text-sm text-muted">
            {selectedStore.address}, {selectedStore.city}
          </p>
        )}
      </Card>

      {selectedStoreId && selectedStore ? (
        <StockManager
          embedded
          stores={stores}
          products={products}
          defaultStoreId={selectedStoreId}
          canModifyStock={canModifyStock}
          canEditTotal={canEditTotal}
          stockByProductAndStore={stockByProductAndStore}
        />
      ) : (
        <GlobalStockOverview
          products={products}
          stores={stores}
          stockByProductAndStore={stockByProductAndStore}
          storeCount={stores.length}
          retailStoreCount={retailStoreCount}
          hubStoreCount={hubStoreCount}
        />
      )}
    </div>
  );
}
