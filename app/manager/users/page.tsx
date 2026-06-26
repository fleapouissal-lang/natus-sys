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

  const scopedUsers =
    profile.role === "manager"
      ? (users || []).filter((user) => {
          if (user.role === "hub" || user.role === "directeur" || user.role === "admin") {
            return false;
          }
          if (city && user.city && user.city !== city) return false;
          return true;
        })
      : users || [];

  const { data: nfcCards } = await supabase
    .from("cashier_nfc_cards")
    .select("cashier_id, nfc_uid");

  const nfcByCashier = Object.fromEntries(
    (nfcCards || []).map((card) => [card.cashier_id, card.nfc_uid])
  );

  return (
    <UsersManager
      users={scopedUsers}
      stores={stores}
      viewer={profile}
      nfcByCashier={nfcByCashier}
    />
  );
}
