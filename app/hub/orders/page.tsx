import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getHubStoreByCity, getHubCityLivreurs } from "@/lib/hub";
import { getHubStockTransfers } from "@/lib/hub-transfers";
import { HubOrdersView } from "@/components/hub/hub-orders-view";

export default async function HubOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const { created } = await searchParams;
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const hubStore = await getHubStoreByCity(profile.city);
  if (!hubStore) {
    return (
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Commandes dépôt</h1>
        <p className="text-muted">Aucun entrepôt configuré pour {profile.city}.</p>
      </div>
    );
  }

  const [outboundTransfers, inboundTransfers, livreurs] = await Promise.all([
    getHubStockTransfers({ fromStoreId: hubStore.id, limit: 100 }),
    getHubStockTransfers({ toStoreId: hubStore.id, limit: 100 }),
    getHubCityLivreurs(profile.city),
  ]);

  const transfers = [...outboundTransfers, ...inboundTransfers].sort(
    (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
  );

  return (
    <HubOrdersView
      transfers={transfers}
      title="Commandes dépôt"
      description={`Envois dépôt → magasins et retours magasin → ${hubStore.name}`}
      successMessage={
        created === "1"
          ? "Commande créée avec succès — statut En cours. Marquez-la prête dès que le colis est préparé."
          : undefined
      }
      showProductImages
      allowManage
      allowRepair
      livreurs={livreurs}
    />
  );
}
