import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById, getProductCatalog } from "@/lib/inventory";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";

export default async function LivreurReturnsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "livreur") redirect("/login");

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Mes retours</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte livreur.</p>
      </div>
    );
  }

  const store = await getStoreById(profile.store_id);
  const orders = await getShopifyOrders(profile, { workflowStatus: "returned" });
  const products = await getProductCatalog();
  const scopeLabel = getOrdersScopeLabel(profile, { storeName: store?.name });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes retours</h1>
        <p className="mt-1 text-muted">
          Commandes marquées en retour — note obligatoire, modifiable 2 h
          {store ? ` — ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={`Retours — ${scopeLabel}`}
        showStore={false}
        livreurMode
        returnsPageMode
        livreurProfileId={profile.id}
        products={products}
      />
    </div>
  );
}
