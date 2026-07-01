import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getActiveStores, getProductsWithTotalStock } from "@/lib/inventory";
import { ProductsManager } from "@/components/products/products-manager";
import { listAssignableProductCategories } from "@/lib/pos/pos-category-cards/queries";

export default async function DirectorProductsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const stores = await getActiveStores(null);
  const products = await getProductsWithTotalStock(null);
  const assignableCategories = await listAssignableProductCategories();
  const defaultStoreId = stores.find((s) => !s.is_hub)?.id || stores[0]?.id || "";

  return (
    <div className="animate-fade-in space-y-4">
      <ProductsManager
        products={products}
        stores={stores}
        allStores={stores}
        defaultStoreId={defaultStoreId}
        canModifyStock
        canEditStockTotal
        canEditBarcode
        assignableCategories={assignableCategories}
      />
    </div>
  );
}
