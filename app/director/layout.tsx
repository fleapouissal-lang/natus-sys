import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["directeur"]);
  if (!profile) redirect("/login");

  return (
    <DashboardShell
      role="directeur"
      userName={profile.full_name || profile.email}
      cityLabel="Toutes les villes"
    >
      {children}
    </DashboardShell>
  );
}
