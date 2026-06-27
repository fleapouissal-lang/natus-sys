import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { isDirector } from "@/lib/permissions";
import {
  listPendingStoreDayClosures,
  listStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";
import { StoreDayClosureValidationPanel } from "@/components/sales/store-day-closure-validation-panel";
import { StoreDayClosureReportsList } from "@/components/sales/store-day-closure-reports-list";
import { PosClosureSettingsForm } from "@/components/sales/pos-closure-settings-form";

export default async function DirectorPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isDirector(profile)) redirect("/login");

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
          Supervision des clôtures magasin — validation directeur et historique des rapports.
        </p>
      </div>

      <PosClosureSettingsForm initialSettings={closureSettings} />

      {closureSettings.requireManagerCode ? (
        <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="directeur" />
      ) : (
        <p className="rounded-lg border border-primary/20 bg-primary-light/30 px-4 py-3 text-sm text-foreground">
          Clôture directe activée : les caissiers clôturent le jour métier sans code gérant. Cette
          section de validation par code est masquée.
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
