import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["hub"]);
  if (!profile) redirect("/login");

  return (
    <DashboardShell
      role="hub"
      userName={profile.full_name || profile.email}
      cityLabel={profile.city || undefined}
    >
      {children}
    </DashboardShell>
  );
}
