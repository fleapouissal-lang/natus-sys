import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import {
  filterRetailStoresByProfile,
  getCityFilter,
} from "@/lib/permissions";
import { resolveSelectedStoreId, getProfileLockedStoreId } from "@/lib/management-store";
import { getManagerOutgoingHubTransfers } from "@/lib/hub-transfers";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { StoreStockTransferManager } from "@/components/stock/store-stock-transfer-manager";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import type { Store } from "@/lib/types";

function resolveTransferStoreIds(
  sourceStores: Store[],
  destinationStores: Store[],
  fromParam?: string | null,
  toParam?: string | null,
  lockedStoreId?: string | null
) {
  const fromStoreId = resolveSelectedStoreId(sourceStores, fromParam, lockedStoreId);
  const destinationCandidates = destinationStores.filter((s) => s.id !== fromStoreId);
  const toStoreId =
    toParam &&
    toParam !== fromStoreId &&
    destinationStores.some((s) => s.id === toParam)
      ? toParam
      : destinationCandidates[0]?.id || "";

  return { fromStoreId, toStoreId };
}

function resolveHubStoreId(
  hubStores: Store[],
  hubParam?: string | null
): string {
  if (hubParam && hubStores.some((hub) => hub.id === hubParam)) {
    return hubParam;
  }
  return hubStores[0]?.id || "";
}

function collectTransferLivreurCities(sourceStores: Store[], hubStores: Store[]) {
  return [
    ...new Set(
      [...sourceStores, ...hubStores]
        .map((store) => store.city)
        .filter(Boolean)
    ),
  ] as string[];
}

export default async function ManagerStockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; dest?: string; hub?: string }>;
}) {
  const { from: fromParam, to: toParam, dest: destParam, hub: hubParam } =
    await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const lockedStoreId = getProfileLockedStoreId(profile);
  const sourceStores = filterRetailStoresByProfile(
    await getActiveStores(city),
    profile
  );
  const sitesAll = await getAllActiveTransferSites();
  const destinationStores = sitesAll.filter((store) => store.is_active && !store.is_hub);
  const hubStores = sitesAll.filter((store) => store.is_active && store.is_hub);
  const managedStoreIds = sourceStores.map((store) => store.id);
  const { fromStoreId, toStoreId } = resolveTransferStoreIds(
    sourceStores,
    destinationStores,
    fromParam,
    toParam,
    lockedStoreId
  );
  const toHubStoreId = resolveHubStoreId(hubStores, hubParam);
  const initialDestination = destParam === "hub" ? "hub" : "store";

  const products = fromStoreId
    ? await getProductsWithStoreStockForTransfer(fromStoreId)
    : [];

  const [storeTransfers, hubOutgoingTransfers, livreurs] = await Promise.all([
    getManagerStoreStockTransfers(managedStoreIds),
    getManagerOutgoingHubTransfers(managedStoreIds),
    getTransferLivreurs(collectTransferLivreurCities(sourceStores, hubStores)),
  ]);

  return (
    <div className="space-y-10">
      <StoreStockTransferManager
        sourceStores={sourceStores}
        stores={destinationStores}
        products={products}
        fromStoreId={fromStoreId}
        toStoreId={toStoreId}
        lockFromStore={Boolean(lockedStoreId)}
        basePath="/manager"
        hubStores={hubStores}
        toHubStoreId={toHubStoreId}
        enableHubDestination
        initialDestination={initialDestination}
        showAllDestinations
      />

      <HubTransfersList
        title="Commandes vers le dépôt (hub)"
        transfers={hubOutgoingTransfers}
        allowManage
        manageAsStoreSource
        showOrigin
        showProductImages
        livreurs={livreurs}
        emptyMessage="Aucun envoi vers le dépôt"
      />

      <StoreTransfersList
        title="Commandes inter-magasins (magasin source)"
        perspective="outgoing"
        managedStoreIds={managedStoreIds}
        transfers={storeTransfers}
        livreurs={livreurs}
        emptyMessage="Aucune commande envoyée vers un autre magasin"
      />
    </div>
  );
}
