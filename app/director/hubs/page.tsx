import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getActiveStores } from "@/lib/inventory";
import { getHubAccounts, getHubStoreAssignmentsMap } from "@/lib/hub";
import { HubAccountsManager } from "@/components/hub/hub-accounts-manager";

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
