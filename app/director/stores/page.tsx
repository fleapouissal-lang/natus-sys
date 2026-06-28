import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { canCreateStore, getCityFilter } from "@/lib/permissions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getProductsWithStoreStock, getStoresWithStats, getActiveStores } from "@/lib/inventory";
import { getHubAccounts, getHubStoreAssignmentsMap } from "@/lib/hub";
import { DirectorStructuresTabs } from "@/components/structures/director-structures-tabs";
import type { Product } from "@/lib/types";

export default async function DirectorStructuresPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const city = getCityFilter(profile);

  const [stores, hubAccounts, allStores, assignmentsByHub] = await Promise.all([
    getStoresWithStats(city),
    getHubAccounts(),
    getActiveStores(null),
    getHubStoreAssignmentsMap(),
  ]);

  const inventoryByStore: Record<string, Product[]> = {};
  await Promise.all(
    stores.map(async (store) => {
      inventoryByStore[store.id] = await getProductsWithStoreStock(store.id);
    })
  );

  const allowedCities = canCreateStore(profile)
    ? [...NATUS_CITIES]
    : profile.city
      ? [profile.city]
      : [...NATUS_CITIES];

  return (
    <DirectorStructuresTabs
      stores={stores}
      inventoryByStore={inventoryByStore}
      allowedCities={allowedCities}
      defaultCity={profile.city || undefined}
      cityLabel={city || undefined}
      canCreateStore={canCreateStore(profile)}
      hubAccounts={hubAccounts}
      retailStores={allStores.filter((store) => !store.is_hub)}
      assignmentsByHub={assignmentsByHub}
    />
  );
}
