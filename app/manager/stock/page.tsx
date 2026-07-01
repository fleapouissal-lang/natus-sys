import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, filterStoresByProfile } from "@/lib/permissions";
import {
  getActiveStores,
  getProductsWithStoreStock,
  getProductsWithTotalStock,
  getStockMatrixByStore,
} from "@/lib/inventory";
import { getProfileLockedStoreId } from "@/lib/management-store";
import { resolveStockPermissions } from "@/lib/stock-modify-access/permissions";
import { listStockModifyAccessRequests } from "@/lib/stock-modify-access/queries";
import { ManagementStockView } from "@/components/stock/management-stock-view";
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
  const stores = filterStoresByProfile(storesAll, profile);
  const lockedStoreId = getProfileLockedStoreId(profile);

  const selectedStoreId = lockedStoreId
    ? lockedStoreId
    : storeParam && stores.some((store) => store.id === storeParam)
      ? storeParam
      : null;

  const [products, stockByProductAndStore] = await Promise.all([
    selectedStoreId
      ? getProductsWithStoreStock(selectedStoreId)
      : getProductsWithTotalStock(city),
    getStockMatrixByStore(stores.map((store) => store.id)),
  ]);

  const selectedStore = selectedStoreId
    ? stores.find((store) => store.id === selectedStoreId)
    : null;
  const permissions = await resolveStockPermissions(profile, selectedStore ?? null);
  const myRequests = await listStockModifyAccessRequests({ requesterId: profile.id });

  return (
    <div className="space-y-4">
      <StockModifyAccessRequestButton
        role="manager"
        stores={stores.map((s) => ({ id: s.id, name: s.name, city: s.city }))}
        myRequests={myRequests}
        selectedStoreId={selectedStoreId || undefined}
      />
      <ManagementStockView
        basePath="/manager"
        stores={stores}
        products={products}
        stockByProductAndStore={stockByProductAndStore}
        selectedStoreId={selectedStoreId}
        cityLabel={city || undefined}
        canModifyStock={permissions.canModifyStock}
        canEditTotal={permissions.canEditTotal}
      />
    </div>
  );
}
