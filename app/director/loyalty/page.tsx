import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyStats } from "@/lib/loyalty/stats";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
import { getManagementBasePath } from "@/lib/permissions";
import { LoyaltyDashboard } from "@/components/loyalty/loyalty-dashboard";
import { LoyaltySettingsForm } from "@/components/loyalty/loyalty-settings-form";

export default async function DirectorLoyaltyPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [stats, settings] = await Promise.all([
    getLoyaltyStats(profile),
    getLoyaltySettings(),
  ]);
  const basePath = getManagementBasePath(profile.role)!;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programme fidélité</h1>
        <p className="mt-1 text-muted">
          Paramètres du programme, statistiques globales et meilleurs clients
        </p>
      </div>

      <LoyaltySettingsForm initialSettings={settings} />
      <LoyaltyDashboard
        stats={stats}
        customerBasePath={`${basePath}/loyalty`}
        loyaltySettings={settings}
      />
    </div>
  );
}
