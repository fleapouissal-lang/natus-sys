import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoRoutePendingShopifyOrders, autoRouteOrdersAtStore } from "@/lib/shopify/auto-route-order";
import { getActiveStores, getProductCatalog, getHubStore } from "@/lib/inventory";
import { getCityFilter } from "@/lib/permissions";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getSelectedStore } from "@/lib/management-store";
import { getOrderAssignmentLivreurs } from "@/lib/hub";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";

export default async function ManagerShopifyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const admin = createAdminClient();
  await autoRoutePendingShopifyOrders(admin, { city, limit: 25 });

  const stores = await getActiveStores(city);
  const hubStore = city ? await getHubStore(city) : await getHubStore();
  const transferTargets = [
    ...stores.filter((s) => !s.is_hub),
    ...(hubStore ? [hubStore] : []),
  ];
  const storeId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : "";
  const selectedStore = storeId ? getSelectedStore(stores, storeId) : undefined;

  if (storeId) {
    await autoRouteOrdersAtStore(admin, storeId);
  }

  const [orders, products, livreurs] = await Promise.all([
    getShopifyOrders(profile, {
      storeId: storeId || null,
    }),
    getProductCatalog(),
    getOrderAssignmentLivreurs(profile, { city, storeId: storeId || null }),
  ]);

  const scopeLabel = getOrdersScopeLabel(profile, {
    city: profile.city || selectedStore?.city || undefined,
    storeName: selectedStore?.name,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Commandes en ligne</h1>
        <p className="mt-1 text-muted">Commandes Shopify de votre ville et magasins</p>
      </div>

      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} allowAll />
      </Suspense>

      <ShopifyOrdersManager
        orders={orders}
        scopeLabel={scopeLabel}
        editable
        products={products}
        enableLivreurHandoff
        livreurs={livreurs}
        enableOrderTransfer
        transferTargets={transferTargets}
        transferProfile={profile}
      />
    </div>
  );
}
