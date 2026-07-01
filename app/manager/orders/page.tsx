import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores, getProductCatalog } from "@/lib/inventory";
import { getAllActiveTransferSites, getTransferLivreurs } from "@/lib/transfer-sites.server";
import { filterRetailStoresByProfile, getCityFilter } from "@/lib/permissions";
import { getProfileLockedStoreId } from "@/lib/management-store";
import { getManagerOutgoingHubTransfers } from "@/lib/hub-transfers";
import { getOutgoingStoreStockTransfers } from "@/lib/store-transfers";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { PendingTransfersUnifiedView } from "@/components/stock/pending-transfers-unified-view";
import {
  filterOutgoingHubTransfersFromStores,
  filterOutgoingStoreTransfersFromStores,
} from "@/lib/stock-transfers/role-transfer-filters";

function collectTransferLivreurCities(
  sourceStores: { city: string }[],
  hubStores: { city: string }[]
) {
  return [
    ...new Set(
      [...sourceStores, ...hubStores].map((store) => store.city).filter(Boolean)
    ),
  ] as string[];
}

export default async function ManagerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    listDest?: string;
    sentFrom?: string;
    sentTo?: string;
    created?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const sourceStores = filterRetailStoresByProfile(await getActiveStores(city), profile);
  const sitesAll = await getAllActiveTransferSites();
  const destinationSites = sitesAll.filter((store) => store.is_active);
  const hubStores = sitesAll.filter((store) => store.is_active && store.is_hub);
  const managedStoreIds = sourceStores.map((store) => store.id);
  const filter = resolveSentTransfersListScope(profile, sourceStores, params, {
    restrictSourceToScopedStores: true,
  });

  const [storeTransfers, hubOutgoingTransfers, livreurs, catalogProducts] =
    await Promise.all([
      getOutgoingStoreStockTransfers(managedStoreIds),
      getManagerOutgoingHubTransfers(managedStoreIds),
      getTransferLivreurs(collectTransferLivreurCities(sourceStores, hubStores)),
      getProductCatalog(),
    ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const scopeLabel = city ? `Vos magasins — ${city}` : "Vos magasins";

  const groups = [
    {
      kind: "store" as const,
      typeLabel: "Vers magasin",
      storeTransfers: filterOutgoingStoreTransfersFromStores(
        storeTransfers,
        managedStoreIds
      ),
    },
    {
      kind: "depot" as const,
      typeLabel: "Vers dépôt",
      hubTransfers: filterOutgoingHubTransfersFromStores(
        hubOutgoingTransfers,
        managedStoreIds
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Mes commandes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commandes « En attente » — source : vos magasins associés — {scopeLabel}. Consultation
          uniquement (voir les détails).
        </p>
        {params.created === "1" && (
          <p className="mt-2 text-sm text-success">
            Commande créée — elle apparaît ici en statut « En attente ».
          </p>
        )}
      </div>

      <Suspense fallback={null}>
        <PendingTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={{
            sourceSites: sourceStores,
            destinationSites,
            strictSourceOptions: true,
            strictDestinationOptions: true,
          }}
          productLookup={productLookup}
          managedStoreIds={managedStoreIds}
          livreurs={livreurs}
          workflowSplit="pending-attente"
          mesCommandesActionMode="view-only"
          emptyMessage="Aucune commande en attente"
        />
      </Suspense>
    </div>
  );
}
