import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector, isManager } from "@/lib/permissions";
import {
  listPendingStoreDayClosures,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import { StoreDayClosureValidationPanel } from "@/components/sales/store-day-closure-validation-panel";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";

export default async function ManagerPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isManager(profile)) redirect("/login");

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
          Recevez le code de clôture, transmettez-le au caissier pour l&apos;impression, puis validez
          pour fermer le jour métier.
        </p>
      </div>

      <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="gérant" />

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">
          Historique des rapports
        </h2>
        <StoreDayClosureReportsList initialClosures={reports} showStoreColumn />
      </div>
    </div>
  );
}
