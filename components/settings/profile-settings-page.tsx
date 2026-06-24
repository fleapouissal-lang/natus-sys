import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getStoreById } from "@/lib/inventory";
import { ProfileSettingsPanel } from "@/components/settings/profile-settings-panel";

export async function ProfileSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const store = profile.store_id ? await getStoreById(profile.store_id) : null;

  return <ProfileSettingsPanel profile={profile} storeName={store?.name} />;
}
