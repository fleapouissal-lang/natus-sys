import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomers } from "@/lib/loyalty/list-customers";
import { getManagementBasePath } from "@/lib/permissions";
import { LoyaltyCustomersList } from "@/components/loyalty/loyalty-customers-list";

export default async function DirectorLoyaltyCustomersPage() {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const customers = await getLoyaltyCustomers(profile);
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
          Cliquez sur un client pour voir sa carte et son historique
        </p>
      </div>

      <LoyaltyCustomersList
        customers={customers}
        detailBasePath={`${basePath}/loyalty`}
      />
    </div>
  );
}
