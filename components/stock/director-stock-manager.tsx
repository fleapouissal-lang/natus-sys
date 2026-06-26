"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import { GlobalStockOverview } from "@/components/hub/global-stock-overview";
import { StockManager } from "@/components/stock/stock-manager";
import { storeOptions } from "@/lib/select-options";
import type { Product, Store } from "@/lib/types";

export function DirectorStockManager({
  stores,
  products,
  selectedStoreId,
  canEditTotal,
}: {
  stores: Store[];
  products: Product[];
  selectedStoreId: string | null;
  canEditTotal: boolean;
}) {
  const router = useRouter();
  const selectedStore = selectedStoreId
    ? stores.find((store) => store.id === selectedStoreId)
    : null;
  const retailStoreCount = stores.filter((store) => !store.is_hub).length;
  const hubStoreCount = stores.filter((store) => store.is_hub).length;

  function handleStoreChange(storeId: string) {
    if (storeId) {
      router.push(`/director/stock?store=${storeId}`);
      return;
    }
    router.push("/director/stock");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock</h1>
        <p className="mt-1 text-muted">
          {selectedStore
            ? `Inventaire — ${selectedStore.name}${selectedStore.is_hub ? " (dépôt)" : ""}`
            : "Stock total par produit — tous les magasins et dépôts"}
        </p>
      </div>

      <Card>
        <CardHeader
          title="Périmètre"
          description={
            selectedStore
              ? "Affichage du stock pour un point de vente ou un dépôt"
              : "Vue globale agrégée sur l'ensemble du réseau"
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
          canEditTotal={canEditTotal}
        />
      ) : (
        <GlobalStockOverview
          products={products}
          storeCount={stores.length}
          retailStoreCount={retailStoreCount}
          hubStoreCount={hubStoreCount}
        />
      )}
    </div>
  );
}
