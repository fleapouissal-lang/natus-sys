import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getStoreById } from "@/lib/inventory";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["manager"]);
  if (!profile) redirect("/cashier/pos");

  const [store, closureSettings] = await Promise.all([
    profile.store_id ? getStoreById(profile.store_id) : Promise.resolve(null),
    getPosClosureSettings(),
  ]);

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
      requireManagerCode={closureSettings.requireManagerCode}
    >
      {children}
    </DashboardShell>
  );
}
