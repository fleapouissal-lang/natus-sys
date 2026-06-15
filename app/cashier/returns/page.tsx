import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById, getProductCatalog } from "@/lib/inventory";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";

export default async function CashierReturnsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Retours magasin</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte.</p>
      </div>
    );
  }

  const store = await getStoreById(profile.store_id);
  const orders = await getShopifyOrders(profile, { returnPendingReceipt: true });
  const products = await getProductCatalog();
  const scopeLabel = getOrdersScopeLabel(profile, { storeName: store?.name });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retours magasin</h1>
        <p className="mt-1 text-muted">
          Retours livrés en magasin — confirmez la réception pour remettre les produits en stock
          {store ? ` — ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={`Retours en attente — ${scopeLabel}`}
        showStore={false}
        cashierReturnsMode
        products={products}
      />
    </div>
  );
}
