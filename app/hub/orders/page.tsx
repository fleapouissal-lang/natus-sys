import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getHubStoresByCity,
  getHubCityLivreurs,
  getHubAssignedStores,
} from "@/lib/hub";
import { getHubDepotTransfersForOperator } from "@/lib/hub-transfers";
import { getOutgoingStoreStockTransfers } from "@/lib/store-transfers";
import { HubOrdersView } from "@/components/hub/hub-orders-view";

export default async function HubOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const [hubStores, assignedStores] = await Promise.all([
    getHubStoresByCity(profile.city),
    getHubAssignedStores(profile.id),
  ]);

  if (hubStores.length === 0) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Commandes dépôt</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const hubStoreIds = hubStores.map((store) => store.id);
  const assignedStoreIds = assignedStores.map((store) => store.id);
  const hubLabel =
    hubStores.length === 1 ? hubStores[0].name : `${hubStores.length} dépôts — ${profile.city}`;
  const assignedLabel =
    assignedStores.length > 0
      ? assignedStores.map((store) => store.name).join(", ")
      : "aucun magasin associé";

  const [hubTransfers, storeTransfers, livreurs] = await Promise.all([
    getHubDepotTransfersForOperator({ hubStoreIds, assignedStoreIds }),
    getOutgoingStoreStockTransfers(assignedStoreIds),
    getHubCityLivreurs(profile.city),
  ]);

  return (
    <HubOrdersView
      transfers={hubTransfers}
      storeTransfers={storeTransfers}
      assignedStoreIds={assignedStoreIds}
      title="Commandes dépôt"
      description={`Suivi des envois depuis vos magasins associés (${assignedLabel}) et des flux dépôt ${hubLabel}`}
      successMessage={
        created === "1"
          ? "Commande créée avec succès — statut En cours. Marquez-la prête dès que le colis est préparé."
          : undefined
      }
      showProductImages
      showOrigin
      allowManage
      allowRepair
      livreurs={livreurs}
    />
  );
}
