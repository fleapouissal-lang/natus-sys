import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterRetailStoresByProfile } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getManagerHubStockTransfers } from "@/lib/hub-transfers";
import { getProfileLockedStoreId, resolveSelectedStoreId } from "@/lib/management-store";
import { HubOrdersView } from "@/components/hub/hub-orders-view";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";

export default async function ManagerHubOrdersPage({
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
  const transfers = await getManagerHubStockTransfers(storeIds);

  const scopeLabel = selectedStore
    ? selectedStore.name
    : city
      ? `Tous les magasins — ${city}`
      : "Vos magasins";

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} allowAll={stores.length > 1} />
      </Suspense>

      <HubOrdersView
        transfers={transfers}
        title="Commandes dépôt"
        description={`Consultation des envois entrepôt vers ${scopeLabel} — lecture seule`}
        readOnly
        showOrigin
        showProductImages
      />
    </div>
  );
}
