import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog } from "@/lib/inventory";
import { getHubCityLivreurs } from "@/lib/hub";
import {
  filterCashierOutgoingInterStore,
  filterCashierOutgoingStoreToHub,
} from "@/lib/cashier-transfer-filters";
import { getAllActiveTransferSites } from "@/lib/transfer-sites.server";
import { getCashierOutgoingStoreToHubTransfers } from "@/lib/hub-transfers";
import { getCashierOutgoingStoreTransfers } from "@/lib/store-transfers";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { PendingTransfersUnifiedView } from "@/components/stock/pending-transfers-unified-view";

export default async function CashierOrdersPage({
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
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;
  const store = await getStoreById(storeId);
  const city = store?.city || profile.city;
  const storeName = store?.name || "votre magasin";

  const sitesAll = await getAllActiveTransferSites();
  const destinationSites = sitesAll.filter((site) => site.is_active);

  const filter = resolveSentTransfersListScope(
    profile,
    store ? [store] : [],
    params,
    { lockSourceToScopedStore: true }
  );

  const [storeTransfers, hubTransfers, livreurs, catalogProducts] = await Promise.all([
    getCashierOutgoingStoreTransfers(storeId),
    getCashierOutgoingStoreToHubTransfers(storeId),
    city ? getHubCityLivreurs(city) : Promise.resolve([]),
    getProductCatalog(),
  ]);

  const interStoreTransfers = filterCashierOutgoingInterStore(storeTransfers, storeId);
  const storeToHubTransfers = filterCashierOutgoingStoreToHub(hubTransfers, storeId);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const storeSite = store
    ? {
        id: store.id,
        name: store.name,
        city: store.city,
        is_hub: store.is_hub,
      }
    : {
        id: storeId,
        name: storeName,
        city: city || "",
        is_hub: false,
      };

  const groups = [
    {
      kind: "store" as const,
      typeLabel: "Vers magasin",
      storeTransfers: interStoreTransfers,
    },
    {
      kind: "depot" as const,
      typeLabel: "Vers dépôt",
      hubTransfers: storeToHubTransfers,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Mes commandes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commandes « En attente » depuis {storeName}. Préparez via l&apos;icône dédiée : transfert
          prérempli (produits, quantités, remarques), puis « En cours » à la confirmation.
        </p>
        {params.created === "1" && (
          <p className="mt-2 text-sm text-success">
            Commande créée — elle apparaît ici en statut « En attente ». Préparez-la pour passer en « En cours ».
          </p>
        )}
      </div>

      <Suspense fallback={null}>
        <PendingTransfersUnifiedView
          filter={filter}
          groups={groups}
          locationConfig={{
            sourceSites: [storeSite],
            destinationSites,
            lockSource: true,
          }}
          productLookup={productLookup}
          managedStoreIds={[storeId]}
          livreurs={livreurs}
          workflowSplit="pending-attente"
          mesCommandesActionMode="view-and-prepare"
          commanderRole="cashier"
          emptyMessage={`Aucune commande en attente depuis ${storeName}`}
        />
      </Suspense>
    </div>
  );
}
