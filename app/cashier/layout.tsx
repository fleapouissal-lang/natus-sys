import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { isPersonalCashierPlanningMode } from "@/lib/cashier/access";
import { getActivePosOperator } from "@/lib/pos/operator-session";

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

  const activeOperator =
    profile.is_store_pos === true ? await getActivePosOperator(profile) : null;
  const posOperatorName =
    activeOperator?.operator?.full_name ||
    activeOperator?.operator?.email ||
    null;

  return (
    <DashboardShell
      role={profile.role}
      userName={profile.full_name || profile.email}
      cityLabel={profile.city || undefined}
      storeId={profile.store_id}
      isStorePos={profile.is_store_pos === true}
      isPersonalCashier={isPersonalCashier}
      hasPosOperator={Boolean(activeOperator?.operator_id)}
      posOperatorName={posOperatorName}
    >
      {children}
    </DashboardShell>
  );
}
