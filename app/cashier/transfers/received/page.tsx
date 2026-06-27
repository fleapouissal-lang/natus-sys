import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getStoreById, getProductCatalog, getStoreStockMap } from "@/lib/inventory";
import { getCashierPendingTransfers } from "@/lib/hub-transfers";
import { getCashierStoreStockTransfers } from "@/lib/store-transfers";
import { CashierStockTransfers } from "@/components/cashier/cashier-stock-transfers";
import { StoreTransfersList } from "@/components/stock/store-transfers-list";

export default async function CashierTransfersReceivedPage() {
  const profile = await requireRole(["cashier"]);
  if (!profile?.store_id) redirect("/login");

  const storeId = profile.store_id;

  const [store, hubTransfers, storeTransfers, products, storeStockByProductId] =
    await Promise.all([
      getStoreById(storeId),
      getCashierPendingTransfers(storeId),
      getCashierStoreStockTransfers(storeId),
      getProductCatalog(),
      getStoreStockMap(storeId),
    ]);

  const productsById = Object.fromEntries(products.map((p) => [p.id, p]));
  const storeName = store?.name || "votre magasin";

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Commandes reçues
        </h1>
        <p className="mt-1 text-sm text-muted">
          Réceptions dépôt hub et transferts depuis un autre magasin — {storeName}
        </p>
      </div>

      <CashierStockTransfers
        variant="section"
        transfers={hubTransfers}
        storeName={storeName}
        productsById={productsById}
        storeStockByProductId={storeStockByProductId}
      />

      <StoreTransfersList
        title="Commandes magasin (transfert inter-magasins)"
        perspective="incoming"
        managedStoreIds={[storeId]}
        transfers={storeTransfers}
        actionMode="receive-only"
        emptyMessage="Aucune commande reçue d'un autre magasin"
      />
    </div>
  );
}
