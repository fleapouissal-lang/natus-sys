import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, isDirector } from "@/lib/permissions";
import { getActiveStores, getProductsWithTotalStock } from "@/lib/inventory";
import { listAssignableProductCategories } from "@/lib/pos/pos-category-cards/queries";
import { ProductCreateView } from "@/components/products/product-create-view";

export default async function NewProductPage() {
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const products = await getProductsWithTotalStock(city);
  const assignableCategories = await listAssignableProductCategories();

  return (
    <div className="animate-fade-in space-y-4">
      <ProductCreateView
        stores={stores}
        existingProducts={products}
        canEditBarcode={profile ? isDirector(profile) : false}
        assignableCategories={assignableCategories}
      />
    </div>
  );
}
