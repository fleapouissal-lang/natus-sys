import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import {
  getHubOutgoingTransfersToHubs,
  getHubOutgoingTransfersToStores,
} from "@/lib/hub-transfers";
import { filterSentHubTransfers } from "@/lib/director-transfer-filters";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { HubSentOrdersTabs } from "@/components/stock/hub-sent-orders-tabs";

function resolveHubStoreId(hubStores: { id: string }[], hubParam?: string | null): string {
  if (hubParam && hubStores.some((hub) => hub.id === hubParam)) {
    return hubParam;
  }
  return hubStores[0]?.id || "";
}

function resolveTransferStoreIds(
  retailStores: { id: string }[],
  hubStores: { id: string }[],
  fromHubId: string,
  toParam?: string | null,
  hubParam?: string | null
) {
  const retailCandidates = retailStores.filter((store) => store.id !== fromHubId);
  const hubCandidates = hubStores.filter((store) => store.id !== fromHubId);
  const toStoreId =
    toParam && retailCandidates.some((store) => store.id === toParam) ? toParam : retailCandidates[0]?.id || "";
  const toHubStoreId = resolveHubStoreId(hubCandidates, hubParam);
  return { toStoreId, toHubStoreId };
}

export default async function HubStockTransfersSentPage({
  searchParams,
}: {
  searchParams: Promise<{
    store?: string;
    tab?: string;
    created?: string;
    to?: string;
    hub?: string;
    dest?: string;
  }>;
}) {
  const { store: storeParam, created, to: toParam, hub: hubParam, dest: destParam } =
    await searchParams;
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStores = await getHubStoresByCity(profile.city);
  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Commandes envoyées</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const selectedHubStoreId = resolveSelectedStoreId(hubStores, storeParam);
  const hubStore = hubStores.find((store) => store.id === selectedHubStoreId) || hubStores[0];
  const scopeHubIds = [selectedHubStoreId];

  const sitesAll = await getAllActiveTransferSites();
  const retailStores = sitesAll.filter((store) => store.is_active && !store.is_hub);
  const allHubStores = sitesAll.filter((store) => store.is_active && store.is_hub);
  const destinationHubStores = allHubStores.filter((store) => store.id !== selectedHubStoreId);
  const initialDestination = destParam === "hub" ? "hub" : "store";
  const { toStoreId, toHubStoreId } = resolveTransferStoreIds(
    retailStores,
    allHubStores,
    selectedHubStoreId,
    toParam,
    hubParam
  );

  const [products, outgoingToStores, outgoingToHubs, livreurs] = await Promise.all([
    getProductsWithStoreStockForTransfer(selectedHubStoreId),
    getHubOutgoingTransfersToStores(scopeHubIds),
    getHubOutgoingTransfersToHubs(scopeHubIds),
    getTransferLivreurs([profile.city, ...allHubStores.map((store) => store.city)]),
  ]);

  const createdTab = destParam === "hub" ? "depot" : "store";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Nouveau transfert et suivi des envois depuis {hubStore.name}
          {hubStores.length > 1 ? ` — ${profile.city}` : ""}
        </p>
      </div>

      <Suspense fallback={null}>
        <HubSentOrdersTabs
          hubStores={hubStores}
          selectedHubStoreId={selectedHubStoreId}
          hubStore={hubStore}
          products={products}
          retailStores={retailStores}
          destinationHubStores={destinationHubStores}
          outgoingToStores={filterSentHubTransfers(outgoingToStores)}
          outgoingToHubs={filterSentHubTransfers(outgoingToHubs)}
          livreurs={livreurs}
          initialDestination={initialDestination}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
          successMessage={
            created === "1"
              ? `Commande créée avec succès — consultez l'onglet ${
                  createdTab === "depot" ? "« Dépôt »" : "« Magasin »"
                }. Marquez-la prête dès que le colis est préparé.`
              : undefined
          }
        />
      </Suspense>
    </div>
  );
}
