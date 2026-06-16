import { notFound } from "next/navigation";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";
import { LoyaltyCardClientView } from "@/components/loyalty/loyalty-card-client-view";

export default async function LoyaltyCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicLoyaltyCustomer(token);
  if (!data) notFound();

  return (
    <div className="px-4 py-8 sm:px-6">
      <LoyaltyCardClientView
        initialCustomer={data.customer}
        initialTransactions={data.transactions}
      />
    </div>
  );
}
