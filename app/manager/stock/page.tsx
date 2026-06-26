import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterStoresByProfile, canEditStockTotal } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getProfileLockedStoreId, resolveSelectedStoreId } from "@/lib/management-store";
import { StockManager } from "@/components/stock/stock-manager";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const storesAll = await getActiveStores(city);
  const stores = profile ? filterStoresByProfile(storesAll, profile) : storesAll;
  const defaultStoreId = resolveSelectedStoreId(
    stores,
    storeParam,
    getProfileLockedStoreId(profile)
  );

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
      canEditTotal={profile ? canEditStockTotal(profile) : false}
    />
  );
}
