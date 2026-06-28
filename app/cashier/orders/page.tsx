import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getStoreById, getProductCatalog, getOrderTransferTargets } from "@/lib/inventory";
import { getOrderAssignmentLivreurs } from "@/lib/hub";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";

export default async function CashierOrdersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Commandes Shopify</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte.</p>
      </div>
    );
  }

  const store = await getStoreById(profile.store_id);
  const [orders, products, transferTargets, livreurs] = await Promise.all([
    getShopifyOrders(profile),
    getProductCatalog(),
    getOrderTransferTargets(profile.store_id),
    getOrderAssignmentLivreurs(profile),
  ]);
  const scopeLabel = getOrdersScopeLabel(profile, { storeName: store?.name });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes Shopify</h1>
        <p className="mt-1 text-muted">
          Commandes en ligne affectées à votre magasin
          {store ? ` — ${store.name}, ${store.city}` : ""}
          {transferTargets.length > 0
            ? ` — transfert possible vers ${transferTargets.map((s) => s.name).join(", ")}`
            : " — aucun magasin de transfert configuré"}
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={scopeLabel}
        showStore={false}
        editable
        enablePosCheckout
        products={products}
        defaultDateThisWeek
        enableLivreurHandoff
        livreurs={livreurs}
        enableOrderTransfer
        transferTargets={transferTargets}
        transferProfile={profile}
        enableConfirmationFollowUp
      />
    </div>
  );
}
