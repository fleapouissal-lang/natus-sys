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

  const closureSettings = await getPosClosureSettings();

  // Clôture directe activée par le directeur : la page gérant n'a rien à valider.
  if (!closureSettings.requireManagerCode) {
    redirect("/manager/history?tab=closures");
  }

  const pendingResult = await listPendingStoreDayClosures();
  const pending = "closures" in pendingResult ? pendingResult.closures : [];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clôtures caisse</h1>
          <p className="mt-1 text-muted">
            Recevez le code de clôture (valide 2 h), transmettez-le au caissier pour
            l&apos;impression, puis validez pour fermer le jour métier.
          </p>
        </div>
        <Link
          href="/manager/history?tab=closures"
          className="inline-flex shrink-0 items-center justify-center rounded-md border border-primary/25 bg-surface px-4 py-2 text-sm font-medium hover:bg-primary-light/30"
        >
          Historique des clôtures
        </Link>
      </div>

      <StoreDayClosureValidationPanel initialClosures={pending} roleLabel="gérant" />
    </div>
  );
}
