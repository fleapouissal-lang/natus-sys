import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getHubStoreByCity,
  getHubAssignedManagers,
  getHubRetailStoresForTransfer,
} from "@/lib/hub";
import { getProductsWithStoreStock } from "@/lib/inventory";
import { getHubStockTransfers } from "@/lib/hub-transfers";
import { HubWarehouseManager } from "@/components/hub/hub-warehouse-manager";

export default async function HubWarehousePage() {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const [hubStore, assignedManagers] = await Promise.all([
    getHubStoreByCity(profile.city),
    getHubAssignedManagers(profile.id),
  ]);

  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Entrepôt hub</h1>
        <p className="text-muted">Aucun entrepôt hub configuré pour {profile.city}.</p>
      </div>
    );
  }

  const products = await getProductsWithStoreStock(hubStore.id);
  const [retailStores, transfers] = await Promise.all([
    assignedManagers.length > 0
      ? getHubRetailStoresForTransfer(profile.city)
      : Promise.resolve([]),
    getHubStockTransfers({ fromStoreId: hubStore.id, limit: 20 }),
  ]);

  return (
    <div className="animate-fade-in">
      <HubWarehouseManager
        hubStore={hubStore}
        products={products}
        retailStores={retailStores}
        assignedManagers={assignedManagers}
        transfers={transfers}
      />
    </div>
  );
}
