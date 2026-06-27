import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomers } from "@/lib/loyalty/list-customers";
import { getManagementBasePath } from "@/lib/permissions";
import { DirectorLoyaltyClientsManager } from "@/components/clients/director-loyalty-clients-manager";

export default async function DirectorClientsPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const allCustomers = await getLoyaltyCustomers(profile, { limit: 5000 });
  const basePath = getManagementBasePath(profile.role)!;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Link
          href={`${basePath}/loyalty`}
          className="text-sm font-medium text-muted hover:text-primary"
        >
          ← Programme fidélité
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Clients fidélité</h1>
        <p className="mt-1 text-muted">
          Cartes fidélité standard — points uniquement, sans remise Pro
        </p>
      </div>

      <Suspense fallback={null}>
        <DirectorLoyaltyClientsManager
          clients={allCustomers}
          detailBasePath={`${basePath}/loyalty`}
        />
      </Suspense>
    </div>
  );
}
