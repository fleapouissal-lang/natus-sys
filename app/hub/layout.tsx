import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getHubStoreByCity } from "@/lib/hub";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["hub"]);
  if (!profile) redirect("/login");

  const hubStore = profile.city ? await getHubStoreByCity(profile.city) : null;

  return (
    <DashboardShell
      role="hub"
      userName={profile.full_name || profile.email}
      avatarUrl={profile.avatar_url}
      cityLabel={profile.city || undefined}
      city={profile.city}
      hubStoreId={hubStore?.id ?? null}
    >
      {children}
    </DashboardShell>
  );
}
