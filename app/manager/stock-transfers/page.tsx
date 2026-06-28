import { Suspense } from "react";
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
import { filterSentHubTransfers } from "@/lib/director-transfer-filters";
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
  searchParams: Promise<{ from?: string; to?: string; dest?: string; hub?: string; tab?: string }>;
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

  const scopeLabel = city ? `Vos magasins — ${city}` : "Vos magasins";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Nouveau transfert et suivi des envois vers magasins et dépôts — {scopeLabel}
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
          hubOutgoingTransfers={filterSentHubTransfers(hubOutgoingTransfers)}
          managedStoreIds={managedStoreIds}
          livreurs={livreurs}
        />
      </Suspense>
    </div>
  );
}
