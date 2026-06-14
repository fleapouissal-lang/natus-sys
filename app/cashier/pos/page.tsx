import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);

  const storeId =
    profile?.role === "cashier"
      ? profile.store_id || resolveSelectedStoreId(stores, storeParam)
      : resolveSelectedStoreId(stores, storeParam);

  const products = storeId ? await getProductsWithStoreStock(storeId) : [];
  const selectedStore = getSelectedStore(stores, storeId);
  const showStoreFilter =
    profile?.role === "manager" || profile?.role === "directeur";

  return (
    <div className="space-y-4">
      {showStoreFilter && stores.length > 0 && (
        <Suspense fallback={null}>
          <StoreFilterBar stores={stores} selectedStoreId={storeId} />
        </Suspense>
      )}

      <PosTerminal
        products={products}
        role={profile?.role || "cashier"}
        cashierName={profile?.full_name || profile?.email || "Caissier"}
        stores={stores}
        defaultStoreId={storeId}
        storeName={selectedStore?.name}
      />
    </div>
  );
}
