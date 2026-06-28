import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { isManager } from "@/lib/permissions";
import {
  listPendingStoreDayClosures,
} from "@/lib/sales/store-day-closure-actions";
import { getPosClosureSettings } from "@/lib/sales/pos-closure-settings.server";
import { StoreDayClosureValidationPanel } from "@/components/sales/store-day-closure-validation-panel";

export default async function ManagerPosClosuresPage() {
  const profile = await getCurrentProfile();
  if (!profile || !isManager(profile)) redirect("/login");

  const [pendingResult, closureSettings] = await Promise.all([
    listPendingStoreDayClosures(),
    getPosClosureSettings(),
  ]);

  const pending = "closures" in pendingResult ? pendingResult.closures : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clôtures caisse</h1>
          <p className="mt-1 text-muted">
            {closureSettings.requireManagerCode
              ? "Recevez le code de clôture (valide 2 h), transmettez-le au caissier pour l'impression, puis validez pour fermer le jour métier."
              : "Clôture directe activée par le directeur — le caissier clôture sans code gérant."}
          </p>
        </div>
        <Link
          href="/manager/history?tab=closures"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-primary/25 bg-surface px-4 py-2 text-sm font-medium hover:bg-primary-light/30"
        >
          Historique des clôtures
        </Link>
      </div>

      {closureSettings.requireManagerCode ? (
        <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="gérant" />
      ) : (
        <p className="rounded-lg border border-primary/20 bg-primary-light/30 px-4 py-3 text-sm text-foreground">
          Aucune validation par code requise. Consultez l&apos;historique des rapports dans{" "}
          <Link href="/manager/history?tab=closures" className="font-medium text-primary underline-offset-2 hover:underline">
            Historique
          </Link>
          .
        </p>
      )}
    </div>
  );
}
