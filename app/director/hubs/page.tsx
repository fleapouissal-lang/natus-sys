import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { requireRole } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getHubAccounts, getHubStoreAssignmentsMap } from "@/lib/hub";

const HubAccountsManager = dynamic(
  () =>
    import("@/components/hub/hub-accounts-manager").then((mod) => mod.HubAccountsManager),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" aria-busy="true" aria-label="Chargement des comptes dépôt">
        <div className="h-9 w-56 animate-pulse rounded bg-primary-light/30" />
        <div className="h-72 animate-pulse rounded-xl bg-primary-light/20" />
      </div>
    ),
  }
);

export default async function DirectorHubsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const [hubAccounts, retailStores, assignmentsByHub] = await Promise.all([
    getHubAccounts(),
    getActiveStores(null),
    getHubStoreAssignmentsMap(),
  ]);

  return (
    <HubAccountsManager
      hubAccounts={hubAccounts}
      retailStores={retailStores.filter((store) => !store.is_hub)}
      assignmentsByHub={assignmentsByHub}
    />
  );
}
