import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomers } from "@/lib/loyalty/list-customers";
import { getAllProClients } from "@/lib/pro-client/invites";
import { getManagementBasePath } from "@/lib/permissions";
import { DirectorClientsManager } from "@/components/clients/director-clients-manager";

export default async function DirectorClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const { tab } = await searchParams;
  const [allCustomers, proClients] = await Promise.all([
    getLoyaltyCustomers(profile, { limit: 5000 }),
    getAllProClients(),
  ]);
  const normalClients = allCustomers.filter((c) => !c.is_pro_client);
  const basePath = getManagementBasePath(profile.role)!;
  const initialTab = tab === "pro" ? "pro" : "normal";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="mt-1 text-muted">
          Gestion des clients normaux et Client Pro · activation, désactivation et suppression
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorClientsManager
          normalClients={normalClients}
          proClients={proClients}
          detailBasePath={`${basePath}/loyalty`}
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
