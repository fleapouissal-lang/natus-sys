import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterRetailStoresByProfile } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getProfileLockedStoreId, resolveSelectedStoreId } from "@/lib/management-store";
import { getHubCityLivreurs } from "@/lib/hub";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import type { Store } from "@/lib/types";

function resolveTransferStoreIds(
  stores: Store[],
  fromParam?: string | null,
  toParam?: string | null,
  lockedFromId?: string | null
) {
  const fromStoreId = resolveSelectedStoreId(stores, fromParam || lockedFromId, lockedFromId);
  const destinationCandidates = stores.filter((s) => s.id !== fromStoreId);
  const toStoreId =
    toParam &&
    toParam !== fromStoreId &&
    stores.some((s) => s.id === toParam)
      ? toParam
      : destinationCandidates[0]?.id || "";

  return { fromStoreId, toStoreId };
}

export default async function ManagerStockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterRetailStoresByProfile(storesAll, profile);
  const storeIds = stores.map((s) => s.id);
  const lockedFromId = getProfileLockedStoreId(profile);
  const { fromStoreId, toStoreId } = resolveTransferStoreIds(
    stores,
    fromParam,
    toParam,
    lockedFromId
  );

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = fromStoreId ? await getProductsWithStoreStock(fromStoreId) : [];
  const [transfers, livreurs] = await Promise.all([
    getManagerStoreStockTransfers(storeIds),
    city ? getHubCityLivreurs(city) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Créer et suivre les transferts de stock depuis vos magasins
        </p>
      </div>

      <StoreStockTransferManager
        stores={stores}
        products={products}
        fromStoreId={fromStoreId}
        toStoreId={toStoreId}
        lockFromStore={Boolean(lockedFromId)}
        basePath="/manager"
      />

      <StoreTransfersList
        title="Commandes envoyées (magasin source)"
        perspective="outgoing"
        managedStoreIds={storeIds}
        transfers={transfers}
        livreurs={livreurs}
        emptyMessage="Aucune commande envoyée depuis vos magasins"
      />
    </div>
  );
}
