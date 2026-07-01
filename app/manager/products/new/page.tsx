import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, isDirector } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock } from "@/lib/inventory";
import { resolveSelectedStoreId, getSelectedStore } from "@/lib/management-store";
import { listAssignableProductCategories } from "@/lib/pos/pos-category-cards/queries";
import { ProductCreateView } from "@/components/products/product-create-view";
import { StoreFilterBar } from "@/components/stores/store-filter-bar";
import { Suspense } from "react";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const storeId = resolveSelectedStoreId(stores, storeParam);
  const selectedStore = getSelectedStore(stores, storeId);
  const products = storeId
    ? await getProductsWithStoreStock(storeId, { includeParents: true })
    : [];
  const assignableCategories = await listAssignableProductCategories();

  return (
    <div className="animate-fade-in space-y-4">
      <Suspense fallback={null}>
        <StoreFilterBar stores={stores} selectedStoreId={storeId} />
      </Suspense>

      {selectedStore ? (
        <ProductCreateView
          stores={stores}
          existingProducts={products}
          storeId={storeId}
          canEditBarcode={profile ? isDirector(profile) : false}
          assignableCategories={assignableCategories}
        />
      ) : (
        <p className="text-center text-muted py-12">
          Sélectionnez un magasin pour ajouter un produit
        </p>
      )}
    </div>
  );
}
