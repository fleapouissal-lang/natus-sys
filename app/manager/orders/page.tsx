import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getCityFilter } from "@/lib/permissions";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getSelectedStore } from "@/lib/management-store";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ShopifyOrdersList } from "@/components/orders/shopify-orders-list";

export default async function ManagerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const stores = await getActiveStores(city);
  const storeId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : "";
  const selectedStore = storeId ? getSelectedStore(stores, storeId) : undefined;

  const orders = await getShopifyOrders(profile, {
    storeId: storeId || null,
  });

  const scopeLabel = getOrdersScopeLabel(profile, {
    city: profile.city || selectedStore?.city || undefined,
    storeName: selectedStore?.name,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes Shopify</h1>
        <p className="mt-1 text-muted">
          Commandes en ligne affectées à votre ville et magasins
        </p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} allowAll />
      </Suspense>

      <ShopifyOrdersList orders={orders} scopeLabel={scopeLabel} />
    </div>
  );
}
