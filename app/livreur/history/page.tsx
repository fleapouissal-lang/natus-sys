import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { getProductCatalog } from "@/lib/inventory";
import { livreurDeliveryHistoryStatuses } from "@/lib/shopify/order-status";
import { getLivreurHubTransferHistory } from "@/lib/hub-transfers";
import { getLivreurStoreTransferHistory } from "@/lib/store-transfers";
import { LivreurHubTransfers } from "@/components/livreur/livreur-hub-transfers";

export default async function LivreurHistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  const [orders, products, hubTransfers, storeTransfers] = await Promise.all([
    getShopifyOrders(profile, {
      workflowStatuses: livreurDeliveryHistoryStatuses(),
    }),
    getProductCatalog(),
    getLivreurHubTransferHistory(profile.id),
    getLivreurStoreTransferHistory(profile.id),
  ]);
  const scopeLabel = getOrdersScopeLabel(profile, {});
  const hasTransferHistory = hubTransfers.length > 0 || storeTransfers.length > 0;

  return (
    <div className="animate-fade-in space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-surface p-4 md:border-0 md:bg-transparent md:p-0">
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary md:text-2xl">
          Historique des livraisons
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commandes livrées ou clôturées qui vous ont été assignées.
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={`Historique — ${scopeLabel}`}
        showStore
        livreurMode
        livreurProfileId={profile.id}
        products={products}
        dateOnlyFilters
        defaultDateThisWeek
      />

      {hasTransferHistory && (
        <LivreurHubTransfers
          transfers={hubTransfers}
          storeTransfers={storeTransfers}
        />
      )}
    </div>
  );
}
