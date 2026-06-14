import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) redirect("/login");

  return (
    <DashboardShell
      role={profile.role}
      userName={profile.full_name || profile.email}
      cityLabel={profile.city || undefined}
    >
      {children}
    </DashboardShell>
  );
}
