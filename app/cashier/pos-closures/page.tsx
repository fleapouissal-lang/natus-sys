import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { listStoreDayClosures } from "@/lib/sales/store-day-closure-actions";
import Link from "next/link";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";

export default async function CashierPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "cashier") redirect("/login");
  if (!profile.store_id) {
    return (
      <div className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Historique clôtures</h1>
        <p className="text-muted">Aucun magasin assigné à ce compte.</p>
      </div>
    );
  }

  const result = await listStoreDayClosures(profile.store_id);
  const reports = "closures" in result ? result.closures : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique clôtures</h1>
          <p className="mt-1 text-muted">
            Rapports validés par le gérant. Pour clôturer le jour en cours, utilisez le bouton
            &laquo;&nbsp;Clôture du jour&nbsp;&raquo; en caisse.
          </p>
        </div>
        <Link
          href="/cashier/pos?closure=1"
          className="inline-flex items-center justify-center rounded-md bg-champagne px-4 py-2 text-sm font-medium text-black hover:opacity-90"
        >
          Clôture du jour
        </Link>
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
