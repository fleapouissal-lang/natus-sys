import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["manager"]);
  if (!profile) redirect("/cashier/pos");

  return (
    <DashboardShell
      role="manager"
      userName={profile.full_name || profile.email}
      avatarUrl={profile.avatar_url}
      cityLabel={profile.city || undefined}
      city={profile.city}
    >
      {children}
    </DashboardShell>
  );
}
