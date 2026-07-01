import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores, getProductCatalog } from "@/lib/inventory";
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
import { getOutgoingStoreStockTransfers } from "@/lib/store-transfers";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { ManagerSentOrdersTabs } from "@/components/stock/manager-sent-orders-tabs";
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

function resolveHubStoreId(hubStores: Store[], hubParam?: string | null): string {
  if (hubParam && hubStores.some((hub) => hub.id === hubParam)) {
    return hubParam;
  }
  return hubStores[0]?.id || "";
}

function collectTransferLivreurCities(sourceStores: Store[], hubStores: Store[]) {
  return [
    ...new Set(
      [...sourceStores, ...hubStores].map((store) => store.city).filter(Boolean)
    ),
  ] as string[];
}

export default async function ManagerStockTransfersPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    dest?: string;
    hub?: string;
    tab?: string;
    q?: string;
    status?: string;
    source?: string;
    listDest?: string;
    sentFrom?: string;
    sentTo?: string;
  }>;
}) {
  const params = await searchParams;
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
  const destinationSites = sitesAll.filter((store) => store.is_active);
  const hubStores = sitesAll.filter((store) => store.is_active && store.is_hub);
  const managedStoreIds = sourceStores.map((store) => store.id);
  const filter = resolveSentTransfersListScope(profile, sourceStores, params, {
    restrictSourceToScopedStores: true,
  });
  const { fromStoreId, toStoreId } = resolveTransferStoreIds(
    sourceStores,
    destinationStores,
    params.from,
    params.to,
    lockedStoreId
  );
  const toHubStoreId = resolveHubStoreId(hubStores, params.hub);
  const initialDestination = params.dest === "hub" ? "hub" : "store";

  const [products, storeTransfers, hubOutgoingTransfers, livreurs, catalogProducts] =
    await Promise.all([
      fromStoreId ? getProductsWithStoreStockForTransfer(fromStoreId) : Promise.resolve([]),
      getOutgoingStoreStockTransfers(managedStoreIds),
      getManagerOutgoingHubTransfers(managedStoreIds),
      getTransferLivreurs(collectTransferLivreurCities(sourceStores, hubStores)),
      getProductCatalog(),
    ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const scopeLabel = city ? `Vos magasins — ${city}` : "Vos magasins";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts envoyés depuis vos magasins associés — préparation, livraison et suivi —{" "}
          {scopeLabel}
        </p>
      </div>

      <Suspense fallback={null}>
        <ManagerSentOrdersTabs
          sourceStores={sourceStores}
          destinationStores={destinationStores}
          products={products}
          fromStoreId={fromStoreId}
          toStoreId={toStoreId}
          lockFromStore={Boolean(lockedStoreId)}
          hubStores={hubStores}
          toHubStoreId={toHubStoreId}
          initialDestination={initialDestination}
          storeTransfers={storeTransfers}
          hubOutgoingTransfers={hubOutgoingTransfers}
          managedStoreIds={managedStoreIds}
          sourceSites={sourceStores}
          destinationSites={destinationSites}
          livreurs={livreurs}
          filter={filter}
          productLookup={productLookup}
        />
      </Suspense>
    </div>
  );
}
