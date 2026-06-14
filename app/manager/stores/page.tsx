import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, isDirector } from "@/lib/permissions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import {
  getProductsWithStoreStock,
  getStoresWithStats,
} from "@/lib/inventory";
import { StoresManager } from "@/components/stores/stores-manager";

export default async function StoresPage() {
  const profile = await getCurrentProfile();
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getStoresWithStats(city);
  const inventoryByStore: Record<string, Awaited<ReturnType<typeof getProductsWithStoreStock>>> = {};

  await Promise.all(
    stores.map(async (store) => {
      inventoryByStore[store.id] = await getProductsWithStoreStock(store.id);
    })
  );

  const allowedCities = profile && isDirector(profile)
    ? [...NATUS_CITIES]
    : profile?.city
      ? [profile.city]
      : [...NATUS_CITIES];

  return (
    <StoresManager
      stores={stores}
      inventoryByStore={inventoryByStore}
      allowedCities={allowedCities}
      defaultCity={profile?.city || undefined}
      cityLabel={city || undefined}
    />
  );
}
