import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomers } from "@/lib/loyalty/list-customers";
import { getLoyaltyStats } from "@/lib/loyalty/stats";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
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
  const [allCustomers, proClients, stats, settings] = await Promise.all([
    getLoyaltyCustomers(profile, { limit: 5000 }),
    getAllProClients(),
    getLoyaltyStats(profile),
    getLoyaltySettings(),
  ]);
  const normalClients = allCustomers.filter((c) => !c.is_pro_client);
  const basePath = getManagementBasePath(profile.role)!;
  const initialTab =
    tab === "programme" || tab === "loyalty"
      ? ("programme" as const)
      : tab === "pro"
        ? ("pro" as const)
        : ("normal" as const);

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients & Fidélité</h1>
        <p className="mt-1 text-muted">
          Cartes fidélité standard, clients Pro et paramètres du programme
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorClientsManager
          normalClients={normalClients}
          proClients={proClients}
          detailBasePath={`${basePath}/loyalty`}
          loyaltyStats={stats}
          loyaltySettings={settings}
          initialTab={initialTab}
        />
      </Suspense>
    </div>
  );
}
