import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterRetailStoresByProfile } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getManagerHubStockTransfers } from "@/lib/hub-transfers";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { getProfileLockedStoreId, resolveSelectedStoreId } from "@/lib/management-store";
import { HubOrdersView } from "@/components/hub/hub-orders-view";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";

export default async function ManagerStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterRetailStoresByProfile(storesAll, profile);
  const storeId = resolveSelectedStoreId(
    stores,
    storeParam,
    getProfileLockedStoreId(profile)
  );
  const selectedStore = stores.find((store) => store.id === storeId);
  const storeIds = storeId ? [storeId] : stores.map((store) => store.id);

  const [hubTransfers, storeTransfers] = await Promise.all([
    getManagerHubStockTransfers(storeIds),
    getManagerStoreStockTransfers(storeIds),
  ]);

  const scopeLabel = selectedStore
    ? selectedStore.name
    : city
      ? `Tous les magasins — ${city}`
      : "Vos magasins";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes reçues
        </h1>
        <p className="mt-1 text-sm text-muted">
          Réceptions dépôt hub et transferts inter-magasins — {scopeLabel}
        </p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} allowAll={stores.length > 1} />
      </Suspense>

      <HubOrdersView
        transfers={hubTransfers}
        title="Commandes dépôt (hub)"
        description={`Envois entrepôt vers ${scopeLabel}`}
        readOnly
        showOrigin
        showProductImages
      />

      <StoreTransfersList
        title="Commandes magasin (transfert inter-magasins)"
        perspective="incoming"
        managedStoreIds={storeIds}
        transfers={storeTransfers}
        emptyMessage="Aucune commande reçue d'un autre magasin"
      />
    </div>
  );
}
