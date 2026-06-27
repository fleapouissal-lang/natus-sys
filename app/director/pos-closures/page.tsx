import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  listPendingStoreDayClosures,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import { StoreDayClosureValidationPanel } from "@/components/sales/store-day-closure-validation-panel";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";

export default async function DirectorPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

  const [pendingResult, reportsResult] = await Promise.all([
    listPendingStoreDayClosures(),
    listStoreDayClosures(),
  ]);

  const pending = "closures" in pendingResult ? pendingResult.closures : [];
  const reports = "closures" in reportsResult ? reportsResult.closures : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clôtures caisse</h1>
        <p className="mt-1 text-muted">
          Supervision des clôtures magasin — validation directeur et historique des rapports.
        </p>
      </div>

      <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="directeur" />

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">
          Historique des rapports
        </h2>
        <StoreDayClosureReportsList initialClosures={reports} showStoreColumn />
      </div>
    </div>
  );
}
