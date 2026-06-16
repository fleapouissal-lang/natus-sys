import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomerForStaff } from "@/lib/loyalty/customers";
import { getManagementBasePath } from "@/lib/permissions";
import { LoyaltyCustomerDetailView } from "@/components/loyalty/loyalty-customer-detail";

export default async function DirectorLoyaltyCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["directeur", "admin"]);
  if (!profile) redirect("/login");

  const { id } = await params;
  const data = await getLoyaltyCustomerForStaff(profile, id);
  if (!data) notFound();

  const basePath = getManagementBasePath(profile.role)!;

  return (
    <LoyaltyCustomerDetailView
      customer={data.customer}
      transactions={data.transactions}
      backHref={`${basePath}/loyalty`}
    />
  );
}
