import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { NATUS_CITIES } from "@/lib/constants/cities";
import { getHubAccounts, getManagersForCity, getHubAssignedManagers } from "@/lib/hub";
import { HubAccountsManager } from "@/components/hub/hub-accounts-manager";

export default async function DirectorHubsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const hubAccounts = await getHubAccounts();

  const managersByCity: Record<string, Awaited<ReturnType<typeof getManagersForCity>>> = {};
  for (const city of NATUS_CITIES) {
    managersByCity[city] = await getManagersForCity(city);
  }

  const assignmentsByHub: Record<string, string[]> = {};
  for (const hub of hubAccounts) {
    const managers = await getHubAssignedManagers(hub.id);
    assignmentsByHub[hub.id] = managers.map((m) => m.id);
  }

  return (
    <HubAccountsManager
      hubAccounts={hubAccounts}
      managersByCity={managersByCity}
      assignmentsByHub={assignmentsByHub}
    />
  );
}
