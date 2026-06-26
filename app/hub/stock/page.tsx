import { getCurrentProfile } from "@/lib/auth";
import {
  canEditStockTotal,
  canModifyStock,
  filterStoresByProfile,
  getCityFilter,
  isHub,
} from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { StockManager } from "@/components/stock/stock-manager";
import { redirect } from "next/navigation";

export default async function HubStockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isHub(profile)) redirect("/login");

  const city = getCityFilter(profile);
  const storesAll = await getActiveStores(city);
  const stores = filterStoresByProfile(storesAll, profile).filter((store) => store.is_hub);
  const defaultStoreId = resolveSelectedStoreId(stores, storeParam);

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = defaultStoreId
    ? await getProductsWithStoreStock(defaultStoreId)
    : [];

  const selectedStore = stores.find((store) => store.id === defaultStoreId);

  return (
    <StockManager
      stores={stores}
      products={products}
      defaultStoreId={defaultStoreId}
      cityLabel={city || undefined}
      canModifyStock={selectedStore ? canModifyStock(profile, selectedStore) : false}
      canEditTotal={selectedStore ? canEditStockTotal(profile, selectedStore) : false}
    />
  );
}
