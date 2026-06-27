import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterRetailStoresByProfile } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { getProfileLockedStoreId, resolveSelectedStoreId } from "@/lib/management-store";
import { resolveStockPermissions } from "@/lib/stock-modify-access/permissions";
import { listStockModifyAccessRequests } from "@/lib/stock-modify-access/queries";
import { StockManager } from "@/components/stock/stock-manager";
import { StockModifyAccessRequestButton } from "@/components/stock-modify-access/stock-modify-access-request-button";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) {
    return null;
  }

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterRetailStoresByProfile(storesAll, profile);
  const defaultStoreId = resolveSelectedStoreId(
    stores,
    storeParam,
    getProfileLockedStoreId(profile)
  );

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = defaultStoreId
    ? await getProductsWithStoreStock(defaultStoreId)
    : [];

  const selectedStore = stores.find((s) => s.id === defaultStoreId);
  const permissions = await resolveStockPermissions(profile, selectedStore ?? null);
  const myRequests = await listStockModifyAccessRequests({ requesterId: profile.id });

  return (
    <div className="space-y-4">
      <StockModifyAccessRequestButton
        role="manager"
        stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
        myRequests={myRequests}
      />
      <StockManager
        stores={stores}
        products={products}
        defaultStoreId={defaultStoreId}
        cityLabel={city || undefined}
        canModifyStock={permissions.canModifyStock}
        canEditTotal={permissions.canEditTotal}
      />
    </div>
  );
}
