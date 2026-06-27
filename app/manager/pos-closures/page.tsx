import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isManager } from "@/lib/permissions";
import {
  listPendingStoreDayClosures,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";
import { StoreDayClosureValidationPanel } from "@/components/sales/store-day-closure-validation-panel";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";

export default async function ManagerPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isManager(profile)) redirect("/login");

  const [pendingResult, reportsResult, closureSettings] = await Promise.all([
    listPendingStoreDayClosures(),
    listStoreDayClosures(),
    getPosClosureSettings(),
  ]);

  const pending = "closures" in pendingResult ? pendingResult.closures : [];
  const reports = "closures" in reportsResult ? reportsResult.closures : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clôtures caisse</h1>
        <p className="mt-1 text-muted">
          {closureSettings.requireManagerCode
            ? "Recevez le code de clôture (valide 2 h), transmettez-le au caissier pour l'impression, puis validez pour fermer le jour métier."
            : "Clôture directe activée par le directeur — le caissier clôture sans code gérant."}
        </p>
      </div>

      {closureSettings.requireManagerCode ? (
        <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="gérant" />
      ) : (
        <p className="rounded-lg border border-primary/20 bg-primary-light/30 px-4 py-3 text-sm text-foreground">
          Aucune validation par code requise. Consultez l&apos;historique des rapports ci-dessous.
        </p>
      )}

      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-primary-dark">
          Historique des rapports
        </h2>
        <StoreDayClosureReportsList initialClosures={reports} showStoreColumn />
      </div>
    </div>
  );
}
