import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import { getHubOutgoingTransfers } from "@/lib/hub-transfers";
import { getAllActiveTransferSites } from "@/lib/transfer-sites.server";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { SentTransfersUnifiedView } from "@/components/stock/sent-transfers-unified-view";
import { getProductCatalog } from "@/lib/inventory";

export default async function HubActivityPage() {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStores = await getHubStoresByCity(profile.city);
  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
          <p className="mt-1 text-muted">Journal des commandes envoyées depuis le dépôt</p>
        </div>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const scopeHubIds = hubStores.map((store) => store.id);
  const scopeLabel =
    hubStores.length === 1 ? hubStores[0].name : `Tous les dépôts — ${profile.city}`;

  const sitesAll = await getAllActiveTransferSites();
  const destinationSites = sitesAll.filter((store) => store.is_active);
  const sourceSites = hubStores.map((store) => ({
    id: store.id,
    name: store.name,
    city: store.city,
    is_hub: true,
  }));

  const filter = resolveSentTransfersListScope(profile, hubStores, {}, {
    restrictSourceToScopedStores: true,
  });

  const [outgoingTransfers, catalogProducts] = await Promise.all([
    getHubOutgoingTransfers(scopeHubIds),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const groups = [
    {
      kind: "hub" as const,
      typeLabel: "Depuis dépôt",
      hubTransfers: outgoingTransfers,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-sm text-muted">
          Commandes envoyées depuis le dépôt — produits, quantités, destination, dates et statut
          — {scopeLabel}. Les commandes en cours de préparation sont dans Mes commandes.
        </p>
      </div>

      <SentTransfersUnifiedView
        filter={filter}
        groups={groups}
        locationConfig={{
          sourceSites,
          destinationSites,
          strictSourceOptions: true,
        }}
        productLookup={productLookup}
        managedStoreIds={scopeHubIds}
        workflowSplit="history"
        listTitle="Commandes envoyées"
        detailVariant="order"
        storeActionMode="none"
        hubReadOnly
        emptyMessage="Aucune commande envoyée enregistrée pour ce dépôt"
      />
    </div>
  );
}
