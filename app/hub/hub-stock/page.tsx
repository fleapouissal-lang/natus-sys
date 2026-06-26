import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoreByCity, getHubRetailStoresForTransfer } from "@/lib/hub";
import { getProductsWithStoreStock } from "@/lib/inventory";
import { getHubStockTransfers } from "@/lib/hub-transfers";
import { HubWarehouseManager } from "@/components/hub/hub-warehouse-manager";

export default async function HubWarehousePage() {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStore = await getHubStoreByCity(profile.city);

  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Entrepôt dépôt</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const [products, retailStores, transfers] = await Promise.all([
    getProductsWithStoreStock(hubStore.id),
    getHubRetailStoresForTransfer(profile.id),
    getHubStockTransfers({ fromStoreId: hubStore.id, limit: 20 }),
  ]);

  return (
    <div className="animate-fade-in">
      <HubWarehouseManager
        hubStore={hubStore}
        products={products}
        retailStores={retailStores}
        transfers={transfers}
      />
    </div>
  );
}
