import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import {
  getHubIncomingTransfers,
  getHubOutgoingTransfersToStores,
} from "@/lib/hub-transfers";
import { getAllActiveTransferSites, getTransferLivreurs } from "@/lib/transfer-sites.server";
import { resolveReceivedTransfersScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { HubReceivedOrdersTabs } from "@/components/stock/hub-received-orders-tabs";
import { getActiveStores, getProductCatalog } from "@/lib/inventory";

export default async function HubStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string; type?: string; tab?: string; q?: string; status?: string; source?: string; dest?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStores = await getHubStoresByCity(profile.city);
  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Stocks reçus</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const filter = resolveReceivedTransfersScope(profile, hubStores, params);
  const scopeHubIds = hubStores.map((store) => store.id);

  const scopeLabel =
    hubStores.length === 1 ? hubStores[0].name : `Tous les dépôts — ${profile.city}`;

  const allHubStores = (await getAllActiveTransferSites()).filter(
    (store) => store.is_active && store.is_hub
  );
  const citySites = (await getActiveStores(profile.city)).filter((store) => store.is_active);
  const locationSites = citySites;

  const [incomingToStores, incomingToDepot, livreurs, products] = await Promise.all([
    getHubOutgoingTransfersToStores(scopeHubIds),
    getHubIncomingTransfers(scopeHubIds),
    getTransferLivreurs([profile.city, ...allHubStores.map((store) => store.city)]),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(products);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Stocks reçus
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tous les transferts entrants dès la création — livraisons dépôt → magasin et réceptions
          magasin → dépôt — {scopeLabel}
        </p>
      </div>

      <HubReceivedOrdersTabs
        filter={filter}
        hubStores={hubStores}
        selectedHubStoreId=""
        scopeLabel={scopeLabel}
        locationSites={locationSites}
        incomingToStores={incomingToStores}
        incomingToDepot={incomingToDepot}
        livreurs={livreurs}
        productLookup={productLookup}
      />
    </div>
  );
}
