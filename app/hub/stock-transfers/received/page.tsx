import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoresByCity } from "@/lib/hub";
import {
  getHubIncomingTransfers,
  getHubOutgoingTransfersToStores,
} from "@/lib/hub-transfers";
import { getAllActiveTransferSites, getTransferLivreurs } from "@/lib/transfer-sites.server";
import { HubReceivedOrdersTabs } from "@/components/stock/hub-received-orders-tabs";

export default async function HubStockTransfersReceivedPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; tab?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStores = await getHubStoresByCity(profile.city);
  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Commandes reçues</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const selectedHubStoreId =
    storeParam && hubStores.some((store) => store.id === storeParam) ? storeParam : "";
  const selectedHub = selectedHubStoreId
    ? hubStores.find((store) => store.id === selectedHubStoreId)
    : null;
  const scopeHubIds = selectedHubStoreId
    ? [selectedHubStoreId]
    : hubStores.map((store) => store.id);

  const scopeLabel = selectedHub
    ? selectedHub.name
    : hubStores.length === 1
      ? hubStores[0].name
      : `Tous les dépôts — ${profile.city}`;

  const allHubStores = (await getAllActiveTransferSites()).filter(
    (store) => store.is_active && store.is_hub
  );

  const [incomingToStores, incomingToDepot, livreurs] = await Promise.all([
    getHubOutgoingTransfersToStores(scopeHubIds),
    getHubIncomingTransfers(scopeHubIds),
    getTransferLivreurs([profile.city, ...allHubStores.map((store) => store.city)]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes reçues
        </h1>
        <p className="mt-1 text-sm text-muted">
          Livraisons dépôt → magasin et réceptions magasin → dépôt — {scopeLabel}
        </p>
      </div>

      <HubReceivedOrdersTabs
        hubStores={hubStores}
        selectedHubStoreId={selectedHubStoreId}
        scopeLabel={scopeLabel}
        incomingToStores={incomingToStores}
        incomingToDepot={incomingToDepot}
        livreurs={livreurs}
      />
    </div>
  );
}
