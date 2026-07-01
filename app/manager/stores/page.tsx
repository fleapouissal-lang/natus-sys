import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter, canCreateStore, isManager } from "@/lib/permissions";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getStoresWithStats } from "@/lib/inventory";
import { StoresManager } from "@/components/stores/stores-manager";

export default async function StoresPage() {
  const profile = await getCurrentProfile();
  if (profile && isManager(profile)) {
    redirect("/manager");
  }
  const city = profile ? getCityFilter(profile) : null;
  const stores = await getStoresWithStats(city);

  const allowedCities = profile && canCreateStore(profile)
    ? [...NATUS_CITIES]
    : profile?.city
      ? [profile.city]
      : [...NATUS_CITIES];

  return (
    <StoresManager
      stores={stores}
      allowedCities={allowedCities}
      defaultCity={profile?.city || undefined}
      cityLabel={city || undefined}
      canCreateStore={profile ? canCreateStore(profile) : false}
      canDeleteStore={profile ? canCreateStore(profile) : false}
    />
  );
}
