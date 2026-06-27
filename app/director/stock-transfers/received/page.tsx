import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getManagerHubStockTransfers } from "@/lib/hub-transfers";
import { getManagerStoreStockTransfers } from "@/lib/store-transfers";
import { HubOrdersView } from "@/components/hub/hub-orders-view";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";

export default async function DirectorStockTransfersReceivedPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const storesAll = await getActiveStores(null);
  const stores = storesAll.filter((s) => s.is_active && !s.is_hub);
  const storeIds = stores.map((s) => s.id);

  const [hubTransfers, storeTransfers] = await Promise.all([
    getManagerHubStockTransfers(storeIds),
    getManagerStoreStockTransfers(storeIds),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes reçues
        </h1>
        <p className="mt-1 text-sm text-muted">
          Réceptions dépôt hub et transferts inter-magasins — tous les magasins
        </p>
      </div>

      <HubOrdersView
        transfers={hubTransfers}
        title="Commandes dépôt (hub)"
        description="Envois entrepôt vers les magasins"
        readOnly
        showOrigin
        showProductImages
      />

      <StoreTransfersList
        title="Commandes magasin (transfert inter-magasins)"
        perspective="incoming"
        managedStoreIds={storeIds}
        transfers={storeTransfers}
        emptyMessage="Aucune commande reçue par vos magasins"
      />
    </div>
  );
}
