import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { canEditStockTotal, isDirector } from "@/lib/permissions";
import { getActiveStores, getProductsWithStoreStock, getProductsWithTotalStock } from "@/lib/inventory";
import { DirectorStockManager } from "@/components/stock/director-stock-manager";

export default async function DirectorStockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const stores = await getActiveStores(null);
  const selectedStoreId =
    storeParam && stores.some((store) => store.id === storeParam) ? storeParam : null;

  const products = selectedStoreId
    ? await getProductsWithStoreStock(selectedStoreId)
    : await getProductsWithTotalStock(null);

  return (
    <DirectorStockManager
      stores={stores}
      products={products}
      selectedStoreId={selectedStoreId}
      canEditTotal={canEditStockTotal(profile)}
    />
  );
}
