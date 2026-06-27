import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAllProClients } from "@/lib/pro-client/invites";
import { getManagementBasePath } from "@/lib/permissions";
import { ProClientsManager } from "@/components/pro-client/pro-clients-manager";

export default async function DirectorProClientsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const proClients = await getAllProClients();
  const basePath = getManagementBasePath(profile.role)!;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients Pro</h1>
        <p className="mt-1 text-muted">
          Comptes professionnels — remise Pro, sans accumulation de points
        </p>
      </div>

      <Suspense fallback={null}>
        <ProClientsManager
          customers={proClients}
          detailBasePath={`${basePath}/loyalty`}
        />
      </Suspense>
    </div>
  );
}
