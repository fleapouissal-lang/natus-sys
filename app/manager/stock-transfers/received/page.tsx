import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores, getProductCatalog } from "@/lib/inventory";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { getManagerIncomingHubToStoreTransfers } from "@/lib/hub-transfers";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { resolveReceivedTransfersScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { ManagerReceivedOrdersTabs } from "@/components/stock/manager-received-orders-tabs";

export default async function ManagerStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{
    store?: string;
    city?: string;
    from?: string;
    to?: string;
    type?: string;
    tab?: string;
    q?: string;
    status?: string;
    source?: string;
    dest?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterRetailStoresByProfile(storesAll, profile);
  const filter = resolveReceivedTransfersScope(profile, stores, params, {
    restrictDestToScopedStores: true,
  });
  const storeIds = stores.map((store) => store.id);
  const sourceSites = storesAll.filter((store) => store.is_active);
  const destinationStores = stores;

  const [hubTransfers, storeTransfers, products] = await Promise.all([
    getManagerIncomingHubToStoreTransfers(storeIds),
    getManagerStoreStockTransfers(storeIds),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(products);

  const scopeLabel =
    city && stores.length > 1
      ? `Magasins associés — ${city}`
      : stores.length === 1
        ? stores[0].name
        : "Vos magasins";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tous les transferts entrants dès la création — réceptions dépôt hub et transferts
          inter-magasins — {scopeLabel}
        </p>
      </div>

      <ManagerReceivedOrdersTabs
        filter={filter}
        stores={stores}
        selectedStoreId=""
        scopeLabel={scopeLabel}
        hubTransfers={hubTransfers}
        storeTransfers={storeTransfers}
        storeIds={storeIds}
        sourceSites={sourceSites}
        destinationStores={destinationStores}
        productLookup={productLookup}
      />
    </div>
  );
}
