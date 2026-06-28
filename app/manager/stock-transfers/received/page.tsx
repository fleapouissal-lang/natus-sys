import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { getManagerIncomingHubToStoreTransfers } from "@/lib/hub-transfers";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { ManagerReceivedOrdersTabs } from "@/components/stock/manager-received-orders-tabs";

export default async function ManagerStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; tab?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterRetailStoresByProfile(storesAll, profile);
  const storeId = resolveSelectedStoreId(stores, storeParam);
  const selectedStore = stores.find((store) => store.id === storeId);
  const storeIds = storeId ? [storeId] : stores.map((store) => store.id);

  const [hubTransfers, storeTransfers] = await Promise.all([
    getManagerIncomingHubToStoreTransfers(storeIds),
    getManagerStoreStockTransfers(storeIds),
  ]);

  const scopeLabel = selectedStore
    ? selectedStore.name
    : city
      ? `Tous vos magasins — ${city}`
      : "Vos magasins";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes reçues
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts entrants dès la création — réceptions dépôt hub et transferts inter-magasins — {scopeLabel}
        </p>
      </div>

      <ManagerReceivedOrdersTabs
        stores={stores}
        selectedStoreId={storeId}
        scopeLabel={scopeLabel}
        hubTransfers={hubTransfers}
        storeTransfers={storeTransfers}
        storeIds={storeIds}
      />
    </div>
  );
}
