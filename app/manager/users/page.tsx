import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { getCityFilter } from "@/lib/permissions";
import { getActiveStores } from "@/lib/inventory";
import { UsersManager } from "@/components/users/users-manager";

export default async function UsersPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const city = getCityFilter(profile);
  const stores = await getActiveStores(city);

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <UsersManager
      users={users || []}
      stores={stores}
      viewer={profile}
    />
  );
}
