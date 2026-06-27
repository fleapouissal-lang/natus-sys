import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listStoreDayClosures } from "@/lib/sales/store-day-closure-actions";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";

export default async function CashierPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");
  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Rapports de clôture</h1>
        <p className="text-muted">Aucun magasin assigné à ce compte.</p>
      </div>
    );
  }

  const result = await listStoreDayClosures(profile.store_id);
  const reports = "closures" in result ? result.closures : [];

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary-dark">
          Rapports de clôture
        </h1>
        <p className="mt-1 text-sm text-muted">
          Historique des clôtures de votre magasin. Consultez ou imprimez un rapport après
          validation du code gérant.
        </p>
      </div>

      <StoreDayClosureReportsList
        initialClosures={reports}
        storeId={profile.store_id}
        isCashier
        showStoreColumn={false}
      />
    </div>
  );
}
