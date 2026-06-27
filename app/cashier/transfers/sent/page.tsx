import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { getHubCityLivreurs } from "@/lib/hub";
import { getCashierStoreStockTransfers } from "@/lib/store-transfers";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";

export default async function CashierTransfersSentPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const store = await getStoreById(profile.store_id);
  const city = store?.city || profile.city;
  const [transfers, livreurs] = await Promise.all([
    getCashierStoreStockTransfers(profile.store_id),
    city ? getHubCityLivreurs(city) : Promise.resolve([]),
  ]);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes envoyées
        </h1>
        <p className="mt-1 text-sm text-muted">
          Préparer, assigner un livreur et remettre le colis — {store?.name || "votre magasin"}
        </p>
      </div>

      <StoreTransfersList
        title="Commandes envoyées (magasin source)"
        perspective="outgoing"
        managedStoreIds={[profile.store_id]}
        transfers={transfers}
        livreurs={livreurs}
        actionMode="full"
        emptyMessage="Aucune commande envoyée depuis votre magasin"
      />
    </div>
  );
}
