import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getActivityLog } from "@/lib/activity";
import { getHubAssignedStores, getHubStoresByCity } from "@/lib/hub";
import { getHubDepotTransfersForOperator } from "@/lib/hub-transfers";
import { HubActivityPanel } from "@/components/hub/hub-activity-panel";
import { HubTransfersList } from "@/components/hub/hub-transfers-list";
import { Card } from "@/components/ui/card";

export default async function HubActivityPage() {
  const profile = await requireRole(["hub"]);
  if (!profile?.city) redirect("/login");

  const [hubStores, assignedStores] = await Promise.all([
    getHubStoresByCity(profile.city),
    getHubAssignedStores(profile.id),
  ]);

  const hubStoreIds = hubStores.map((store) => store.id);
  const assignedStoreIds = assignedStores.map((store) => store.id);
  const primaryHub = hubStores[0];

  const scopeLabel = primaryHub
    ? `${primaryHub.name} — ${primaryHub.city}`
    : `Dépôt — ${profile.city}`;

  const [allActivities, transfers] = await Promise.all([
    hubStoreIds.length > 0
      ? getActivityLog(hubStoreIds, 200)
      : Promise.resolve([]),
    hubStoreIds.length > 0
      ? getHubDepotTransfersForOperator({ hubStoreIds, assignedStoreIds })
      : Promise.resolve([]),
  ]);

  const activities = allActivities.filter((entry) => entry.actor_role === "hub");
  const recentTransfers = transfers.slice(0, 20);

  if (!primaryHub) {
    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
          <p className="mt-1 text-muted">Journal d&apos;activité du dépôt Hub</p>
        </div>
        <Card className="py-12 text-center text-muted">
          Aucun entrepôt configuré pour {profile.city}.
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
        <p className="mt-1 text-muted">
          Activités du dépôt {primaryHub.name} — modifications de stock et transferts
          effectués par votre compte Hub
        </p>
      </div>

      <HubActivityPanel activities={activities} scopeLabel={scopeLabel} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Transferts du dépôt</h2>
          <p className="mt-1 text-sm text-muted">
            Envois et réceptions liés à l&apos;entrepôt
          </p>
        </div>
        <HubTransfersList
          transfers={recentTransfers}
          title="Commandes hub (envois / réceptions)"
          readOnly
          showOrigin
          emptyMessage="Aucun transfert enregistré pour ce dépôt"
        />
      </section>
    </div>
  );
}
