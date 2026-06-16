import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getLoyaltyStats } from "@/lib/loyalty/stats";
import { LoyaltyDashboard } from "@/components/loyalty/loyalty-dashboard";

export default async function ManagerLoyaltyPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const stats = await getLoyaltyStats(profile);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programme fidélité</h1>
        <p className="mt-1 text-muted">
          Membres, points distribués et meilleurs clients
        </p>
      </div>

      <LoyaltyDashboard stats={stats} />
    </div>
  );
}
