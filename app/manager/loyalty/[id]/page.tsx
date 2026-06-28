import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getLoyaltyCustomerForStaff } from "@/lib/loyalty/customers";
import { getLoyaltySettings } from "@/lib/loyalty/settings.server";
import { getManagementBasePath } from "@/lib/permissions";
import { LoyaltyCustomerDetailView } from "@/components/loyalty/loyalty-customer-detail";

export default async function ManagerLoyaltyCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireRole(["manager"]);
  if (!profile) redirect("/cashier/pos");

  const { id } = await params;
  const [data, loyaltySettings] = await Promise.all([
    getLoyaltyCustomerForStaff(profile, id),
    getLoyaltySettings(),
  ]);
  if (!data) notFound();

  const basePath = getManagementBasePath(profile.role)!;

  return (
    <LoyaltyCustomerDetailView
      customer={data.customer}
      transactions={data.transactions}
      notes={data.notes}
      sales={data.sales}
      backHref={`${basePath}/loyalty`}
      loyaltySettings={loyaltySettings}
    />
  );
}
