import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function LivreurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["livreur"]);
  if (!profile) redirect("/login");

  return (
    <DashboardShell
      role={profile.role}
      userName={profile.full_name || profile.email}
      avatarUrl={profile.avatar_url}
      cityLabel={profile.city || undefined}
    >
      {children}
    </DashboardShell>
  );
}
