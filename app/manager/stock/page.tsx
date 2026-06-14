import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { StockManager } from "@/components/stock/stock-manager";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getActiveStores(city);
  const defaultStoreId =
    storeParam && stores.some((s) => s.id === storeParam)
      ? storeParam
      : stores[0]?.id || "";

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = defaultStoreId
    ? await getProductsWithStoreStock(defaultStoreId)
    : [];

  return (
    <StockManager
      stores={stores}
      products={products}
      defaultStoreId={defaultStoreId}
      cityLabel={city || undefined}
      canEditTotal={profile?.role === "directeur"}
    />
  );
}
