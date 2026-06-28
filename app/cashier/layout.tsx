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
  const [isPersonalCashier, store] = await Promise.all([
    profile.role === "cashier"
      ? isPersonalCashierPlanningMode(supabase, profile)
      : Promise.resolve(false),
    profile.store_id ? getStoreById(profile.store_id) : Promise.resolve(null),
  ]);

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
      accessPreset={profile.access_preset}
      allowedPages={profile.allowed_pages}
    >
      {children}
    </DashboardShell>
  );
}
