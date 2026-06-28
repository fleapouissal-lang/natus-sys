import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { getProductCatalog } from "@/lib/inventory";
import { livreurPendingDeliveryStatuses } from "@/lib/shopify/order-status";

export default async function LivreurOrdersPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  const orders = await getShopifyOrders(profile, {
    workflowStatuses: livreurPendingDeliveryStatuses(),
  });
  const products = await getProductCatalog();
  const scopeLabel = getOrdersScopeLabel(profile, {});

  return (
    <div className="animate-fade-in space-y-4 md:space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-surface p-4 md:border-0 md:bg-transparent md:p-0">
        <h1 className="font-heading text-xl font-bold tracking-tight text-primary md:text-2xl">
          Mes livraisons
        </h1>
        <p className="mt-1 text-sm text-muted">
          Commandes qui vous sont assignées. Marquez « Livré » ou « Retour » (note
          obligatoire) — une fois livrée, la commande passe dans l&apos;historique.
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={scopeLabel}
        showStore
        editable
        products={products}
        livreurMode
        livreurProfileId={profile.id}
        dateOnlyFilters
      />
    </div>
  );
}
