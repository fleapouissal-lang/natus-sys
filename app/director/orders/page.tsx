import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getShopifyOrders, getOrdersScopeLabel } from "@/lib/orders";
import { getSelectedStore } from "@/lib/management-store";
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
  if (!profile || profile.role !== "directeur") redirect("/login");

  const stores = await getActiveStores(null);
  const selectedCity = cityParam && stores.some((s) => s.city === cityParam) ? cityParam : "";
  const selectedStoreId =
    storeParam && stores.some((s) => s.id === storeParam) ? storeParam : "";
  const selectedStore = selectedStoreId
    ? getSelectedStore(stores, selectedStoreId)
    : undefined;

  const orders = await getShopifyOrders(profile, {
    city: selectedCity || null,
    storeId: selectedStoreId || null,
  });

  const scopeLabel = getOrdersScopeLabel(profile, {
    city: selectedCity || selectedStore?.city,
    storeName: selectedStore?.name,
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commandes Shopify</h1>
          <p className="mt-1 text-muted">
            Toutes les commandes en ligne — affectation auto par ville et proximité
          </p>
        </div>
        <ShopifySyncButton />
      </div>

      <Suspense fallback={null}>
        <CityStoreFilterBar
          stores={stores}
          selectedCity={selectedCity}
          selectedStoreId={selectedStoreId}
        />
      </Suspense>

      <ShopifyOrdersManager orders={orders} scopeLabel={scopeLabel} editable />
    </div>
  );
}
