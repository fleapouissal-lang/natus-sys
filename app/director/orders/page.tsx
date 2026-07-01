import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  getAllActiveTransferSites,
  getTransferLivreurs,
} from "@/lib/transfer-sites.server";
import {
  getDirectorHubStockTransfers,
} from "@/lib/hub-transfers";
import {
  getDirectorStoreStockTransfers,
} from "@/lib/store-transfers";
import { resolveSentTransfersListScope } from "@/lib/stock-transfers/received-filters";
import { buildReceivedTransferProductLookup } from "@/lib/stock-transfers/received-transfer-rows";
import { PendingTransfersUnifiedView } from "@/components/stock/pending-transfers-unified-view";
import { getProductCatalog } from "@/lib/inventory";

export default async function DirectorOrdersPage({
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
  if (!profile || !isDirector(profile)) redirect("/login");

  const sitesAll = await getAllActiveTransferSites();
  const transferSites = sitesAll.filter((store) => store.is_active);
  const filter = resolveSentTransfersListScope(profile, transferSites, params);

  const [storeTransfers, hubTransfers, livreurs, catalogProducts] = await Promise.all([
    getDirectorStoreStockTransfers(),
    getDirectorHubStockTransfers(),
    getTransferLivreurs([
      ...new Set(sitesAll.map((store) => store.city).filter(Boolean)),
    ] as string[]),
    getProductCatalog(),
  ]);
  const productLookup = buildReceivedTransferProductLookup(catalogProducts);

  const hubHubTransfers = hubTransfers.filter(
    (transfer) => transfer.from_store_is_hub && transfer.to_store_is_hub
  );
  const hubStoreMixedTransfers = hubTransfers.filter(
    (transfer) =>
      (transfer.from_store_is_hub && !transfer.to_store_is_hub) ||
      (!transfer.from_store_is_hub && transfer.to_store_is_hub)
  );

  const groups = [
    {
      kind: "store" as const,
      typeLabel: "Vers magasin",
      storeTransfers,
    },
    {
      kind: "depot" as const,
      typeLabel: "Vers dépôt",
      hubTransfers: hubStoreMixedTransfers.filter(
        (transfer) => !transfer.from_store_is_hub && transfer.to_store_is_hub
      ),
    },
    {
      kind: "hub" as const,
      typeLabel: "Depuis dépôt",
      hubTransfers: [
        ...hubHubTransfers,
        ...hubStoreMixedTransfers.filter((transfer) => transfer.from_store_is_hub),
      ],
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Mes commandes
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commandes « En attente » — réseau complet. Consultation uniquement (voir les détails). Le
          stock source n&apos;est pas déduit tant qu&apos;un hub ou une caisse n&apos;a pas préparé
          la commande.
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
            sourceSites: transferSites,
            destinationSites: transferSites,
          }}
          productLookup={productLookup}
          managedStoreIds={transferSites.map((store) => store.id)}
          livreurs={livreurs}
          mesCommandesActionMode="view-only"
          emptyMessage="Aucune commande en attente"
        />
      </Suspense>
    </div>
  );
}
