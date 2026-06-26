import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { isPersonalCashierPlanningMode } from "@/lib/cashier/access";
import { getStoreById } from "@/lib/inventory";

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["directeur", "manager", "cashier"]);
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const isPersonalCashier =
    profile.role === "cashier"
      ? await isPersonalCashierPlanningMode(supabase, profile)
      : false;

  const store = profile.store_id ? await getStoreById(profile.store_id) : null;

  return (
    <DashboardShell
      role={profile.role}
      userName={profile.full_name || profile.email}
      avatarUrl={profile.avatar_url}
      cityLabel={profile.city || undefined}
      storeName={store?.name}
      storeId={profile.store_id}
      isStorePos={profile.is_store_pos === true}
      isPersonalCashier={isPersonalCashier}
    >
      {children}
    </DashboardShell>
  );
}
