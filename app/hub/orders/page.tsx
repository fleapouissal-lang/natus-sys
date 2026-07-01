import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import { getHubOutgoingTransfers } from "@/lib/hub-transfers";
import { getAllActiveTransferSites, getTransferLivreurs } from "@/lib/transfer-sites.server";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { PendingTransfersUnifiedView } from "@/components/stock/pending-transfers-unified-view";
import { getProductCatalog } from "@/lib/inventory";

export default async function HubOrdersPage({
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
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStores = await getHubStoresByCity(profile.city);
  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Mes commandes</h1>
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
  const allHubStores = sitesAll.filter((store) => store.is_active && store.is_hub);

  const filter = resolveSentTransfersListScope(profile, hubStores, params, {
    restrictSourceToScopedStores: true,
  });

  const [outgoingTransfers, livreurs, catalogProducts] = await Promise.all([
    getHubOutgoingTransfers(scopeHubIds),
    getTransferLivreurs([profile.city, ...allHubStores.map((store) => store.city)]),
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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Mes commandes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Transferts en cours de préparation depuis le dépôt — statut « En cours » — {scopeLabel}.
          Une fois prête, consultez Stocks envoyés.
        </p>
        {params.created === "1" && (
          <p className="mt-2 text-sm text-success">
            Commande créée — elle apparaît ici tant qu&apos;elle est en préparation.
          </p>
        )}
      </div>

      <Suspense fallback={null}>
        <PendingTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={{
            sourceSites,
            destinationSites,
            strictSourceOptions: true,
          }}
          productLookup={productLookup}
          managedStoreIds={scopeHubIds}
          livreurs={livreurs}
          mesCommandesActionMode="view-and-commander"
          commanderRole="hub"
          emptyMessage="Aucune commande en cours depuis le dépôt"
        />
      </Suspense>
    </div>
  );
}
