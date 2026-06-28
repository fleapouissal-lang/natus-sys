import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoRoutePendingShopifyOrders } from "@/lib/shopify/auto-route-order";
import { isDirector } from "@/lib/permissions";
import { getActiveStores, getProductCatalog, getHubStore } from "@/lib/inventory";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getSelectedStore } from "@/lib/management-store";
import { getOrderAssignmentLivreurs } from "@/lib/hub";
import { CityStoreFilterBar } from "@/components/stores/city-store-filter-bar";
import { ShopifyOrdersManager } from "@/components/orders/shopify-orders-manager";
import { ShopifySyncButton } from "@/components/orders/shopify-sync-button";

export default async function DirectorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; store?: string }>;
}) {
  const { city: cityParam, store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const admin = createAdminClient();
  const selectedCityForRoute =
    cityParam || null;
  await autoRoutePendingShopifyOrders(admin, {
    city: selectedCityForRoute,
    limit: selectedCityForRoute ? 25 : 40,
  });

  const stores = await getActiveStores(null);
  const hubStore = selectedCityForRoute
    ? await getHubStore(selectedCityForRoute)
    : null;
  const retailStores = stores.filter((s) => !s.is_hub);
  const transferTargets = hubStore
    ? [...retailStores.filter((s) => !s.is_hub), hubStore]
    : stores;
  const selectedCity =
    cityParam && retailStores.some((s) => s.city === cityParam) ? cityParam : "";
  const selectedStoreId =
    storeParam && retailStores.some((s) => s.id === storeParam) ? storeParam : "";
  const selectedStore = selectedStoreId
    ? getSelectedStore(retailStores, selectedStoreId)
    : undefined;

  const [orders, products, livreurs] = await Promise.all([
    getShopifyOrders(profile, {
      city: selectedCity || null,
      storeId: selectedStoreId || null,
      excludeStoreId: hubStore?.id ?? null,
    }),
    getProductCatalog(),
    getOrderAssignmentLivreurs(profile, {
      city: selectedCity || null,
      storeId: selectedStoreId || null,
    }),
  ]);

  const scopeLabel = getOrdersScopeLabel(profile, {
    city: selectedCity || selectedStore?.city,
    storeName: selectedStore?.name,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes en ligne</h1>
          <p className="mt-1 text-muted">
            Commandes magasins — le hub stock a sa propre page
          </p>
        </div>
        <ShopifySyncButton />
      </div>

      <Suspense fallback={null}>
        <CityStoreFilterBar
          stores={retailStores}
          selectedCity={selectedCity}
          selectedStoreId={selectedStoreId}
        />
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
