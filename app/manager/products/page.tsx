import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { ProductsManager } from "@/components/products/products-manager";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const allStores = await getActiveStores(city);
  const storeId = resolveSelectedStoreId(stores, storeParam);
  const selectedStore = getSelectedStore(stores, storeId);
  const products = storeId
    ? await getProductsWithStoreStock(storeId, { includeParents: true })
    : [];

  return (
    <div className="animate-fade-in space-y-4">
      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {selectedStore ? (
        <ProductsManager
          products={products}
          stores={stores}
          allStores={allStores}
          defaultStoreId={storeId}
          selectedStoreName={selectedStore.name}
          canEditStockTotal={profile?.role === "directeur"}
          canEditBarcode={profile?.role === "directeur"}
        />
      ) : (
        <p className="text-center text-muted py-12">
          Sélectionnez un magasin pour voir les produits et le stock
        </p>
      )}
    </div>
  );
}
