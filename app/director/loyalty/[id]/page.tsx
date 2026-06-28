import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomerForStaff } from "@/lib/loyalty/customers";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
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
  const [data, loyaltySettings] = await Promise.all([
    getLoyaltyCustomerForStaff(profile, id),
    getLoyaltySettings(),
  ]);
  if (!data) notFound();

  const basePath = getManagementBasePath(profile.role)!;
  const backHref = data.customer.is_pro_client
    ? `${basePath}/pro-clients`
    : `${basePath}/clients`;

  return (
    <LoyaltyCustomerDetailView
      customer={data.customer}
      transactions={data.transactions}
      sales={data.sales}
      backHref={backHref}
      loyaltySettings={loyaltySettings}
    />
  );
}
