import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import { getHubOutgoingTransfers } from "@/lib/hub-transfers";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { HubSentOrdersTabs } from "@/components/stock/hub-sent-orders-tabs";
import { getProductCatalog } from "@/lib/inventory";

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
    q?: string;
    status?: string;
    source?: string;
    listDest?: string;
    sentFrom?: string;
    sentTo?: string;
  }>;
}) {
  const params = await searchParams;
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

  const selectedHubStoreId = resolveSelectedStoreId(hubStores, params.store);
  const hubStore = hubStores.find((store) => store.id === selectedHubStoreId) || hubStores[0];
  const scopeHubIds = hubStores.map((store) => store.id);

  const sitesAll = await getAllActiveTransferSites();
  const destinationSites = sitesAll.filter((store) => store.is_active);
  const sourceSites = hubStores.map((store) => ({
    id: store.id,
    name: store.name,
    city: store.city,
    is_hub: true,
  }));
  const retailStores = sitesAll.filter((store) => store.is_active && !store.is_hub);
  const allHubStores = sitesAll.filter((store) => store.is_active && store.is_hub);
  const destinationHubStores = allHubStores.filter((store) => store.id !== selectedHubStoreId);
  const initialDestination = params.dest === "hub" ? "hub" : "store";
  const filter = resolveSentTransfersListScope(profile, hubStores, params, {
    restrictSourceToScopedStores: true,
  });
  const { toStoreId, toHubStoreId } = resolveTransferStoreIds(
    retailStores,
    allHubStores,
    selectedHubStoreId,
    params.to,
    params.hub
  );

  const [products, outgoingTransfers, livreurs, catalogProducts] = await Promise.all([
    getProductsWithStoreStockForTransfer(selectedHubStoreId),
    getHubOutgoingTransfers(scopeHubIds),
    getTransferLivreurs([profile.city, ...allHubStores.map((store) => store.city)]),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Préparation et expédition depuis le dépôt — marquez prête ici, puis suivez livraison
          {hubStores.length > 1 ? ` — ${profile.city}` : ` — ${hubStore.name}`}
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
          outgoingTransfers={outgoingTransfers}
          sourceSites={sourceSites}
          destinationSites={destinationSites}
          scopeHubIds={scopeHubIds}
          livreurs={livreurs}
          initialDestination={initialDestination}
          toStoreId={toStoreId}
          toHubStoreId={toHubStoreId}
          filter={filter}
          productLookup={productLookup}
          successMessage={
            params.created === "1"
              ? "Transfert créé — consultez Mes commandes tant qu'il est en préparation."
              : undefined
          }
        />
      </Suspense>
    </div>
  );
}
