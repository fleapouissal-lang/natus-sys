import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAllProClients } from "@/lib/pro-client/invites";
import { getActiveStores } from "@/lib/inventory";
import { filterRetailStoresByProfile, getManagementBasePath } from "@/lib/permissions";
import { ProClientsManager } from "@/components/pro-client/pro-clients-manager";

export default async function ManagerProClientsPage() {
  const profile = await requireRole(["manager"]);
  if (!profile) redirect("/login");

  const [proClients, stores] = await Promise.all([
    getAllProClients(),
    getActiveStores(null),
  ]);
  const basePath = getManagementBasePath(profile.role)!;
  const createStores = filterRetailStoresByProfile(stores, profile).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients Pro</h1>
        <p className="mt-1 text-muted">
          Tous les comptes professionnels — remise Pro, sans accumulation de points
        </p>
      </div>

      <Suspense fallback={null}>
        <ProClientsManager
          customers={proClients}
          detailBasePath={`${basePath}/loyalty`}
          stores={createStores}
          allowCreate={createStores.length > 0}
        />
      </Suspense>
    </div>
  );
}
