import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStoreById } from "@/lib/inventory";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["manager"]);
  if (!profile) redirect("/cashier/pos");

  const store = profile.store_id ? await getStoreById(profile.store_id) : null;

  return (
    <DashboardShell
      role="manager"
      userName={profile.full_name || profile.email}
      avatarUrl={profile.avatar_url}
      cityLabel={profile.city || undefined}
      city={profile.city}
      storeId={profile.store_id}
      storeName={store?.name}
      accessPreset={profile.access_preset}
      allowedPages={profile.allowed_pages}
    >
      {children}
    </DashboardShell>
  );
}
