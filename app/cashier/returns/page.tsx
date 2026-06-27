import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById, getProductCatalog, getProductsWithStoreStock } from "@/lib/inventory";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getStoreProductWriteoffs } from "@/lib/store-writeoffs/list";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { CashierReturnsTabs } from "@/components/store-writeoffs/cashier-returns-tabs";
import { CashierWriteoffPanel } from "@/components/store-writeoffs/cashier-writeoff-panel";

export default async function CashierReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { tab } = await searchParams;
  const activeTab = tab === "shopify" ? "shopify" : "writeoffs";

  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Retours magasin</h1>
        <p className="text-muted">Aucun magasin assigné à votre compte.</p>
      </div>
    );
  }

  const store = await getStoreById(profile.store_id);
  const [orders, products, writeoffs, catalog] = await Promise.all([
    getShopifyOrders(profile, { returnPendingReceipt: true }),
    getProductsWithStoreStock(profile.store_id),
    getStoreProductWriteoffs(profile, { limit: 30 }),
    getProductCatalog(),
  ]);
  const scopeLabel = getOrdersScopeLabel(profile, { storeName: store?.name });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Retours magasin</h1>
        <p className="mt-1 text-muted">
          Produits périmés ou cassés, et retours commandes Shopify
          {store ? ` — ${store.name}, ${store.city}` : ""}
        </p>
      </div>

      <CashierReturnsTabs
        activeTab={activeTab}
        writeoffsContent={<CashierWriteoffPanel products={products} writeoffs={writeoffs} />}
        shopifyContent={
          <ShopifyOrdersManager
            orders={orders}
            scopeLabel={`Retours en attente — ${scopeLabel}`}
            showStore={false}
            cashierReturnsMode
            products={catalog}
          />
        }
      />
    </div>
  );
}
