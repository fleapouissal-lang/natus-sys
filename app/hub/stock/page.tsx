import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  canEditStockTotal,
  canModifyStock,
  getCityFilter,
  isHub,
} from "@/lib/permissions";
import { getHubAssignedStores, getHubStoresByCity } from "@/lib/hub";
import { resolveSelectedStoreId } from "@/lib/management-store";
import { resolveStockPermissions } from "@/lib/stock-modify-access/permissions";
import { listStockModifyAccessRequests } from "@/lib/stock-modify-access/queries";
import { StockManager } from "@/components/stock/stock-manager";
import { StockModifyAccessRequestButton } from "@/components/stock-modify-access/stock-modify-access-request-button";

export default async function HubStockPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeParam } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !isHub(profile) || !profile.city) redirect("/login");

  const city = getCityFilter(profile);

  // Périmètre strict du dépôt : le(s) dépôt(s) du hub + les magasins assignés.
  // Aucun autre magasin non rattaché ne doit apparaître.
  const [hubStores, assignedStores] = await Promise.all([
    getHubStoresByCity(profile.city),
    getHubAssignedStores(profile.id),
  ]);
  const stores = [...hubStores, ...assignedStores];

  // Par défaut on affiche le stock du dépôt, mais le hub peut sélectionner
  // un magasin assigné pour consulter son stock (lecture seule).
  const defaultStoreId = resolveSelectedStoreId(
    stores,
    storeParam ?? hubStores[0]?.id ?? null
  );

  const { getProductsWithStoreStock } = await import("@/lib/inventory");
  const products = defaultStoreId
    ? await getProductsWithStoreStock(defaultStoreId)
    : [];

  const selectedStore = stores.find((store) => store.id === defaultStoreId);
  const permissions = await resolveStockPermissions(profile, selectedStore ?? null);
  const myRequests = await listStockModifyAccessRequests({ requesterId: profile.id });

  return (
    <div className="space-y-4">
      <StockModifyAccessRequestButton
        role="hub"
        hubStoreLabel={
          selectedStore ? `${selectedStore.name} — ${selectedStore.city}` : undefined
        }
        myRequests={myRequests}
        selectedStoreId={defaultStoreId || undefined}
      />
      <StockManager
        stores={stores}
        products={products}
        defaultStoreId={defaultStoreId}
        cityLabel={city || undefined}
        canModifyStock={
          selectedStore ? permissions.canModifyStock : canModifyStock(profile, selectedStore)
        }
        canEditTotal={
          selectedStore ? permissions.canEditTotal : canEditStockTotal(profile, selectedStore)
        }
      />
    </div>
  );
}
