import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";
import { toPublicLoyaltyCustomer } from "@/lib/loyalty/public";
import { getPublicLoyaltySettings } from "@/lib/loyalty/settings.server";
import { LoyaltyCardClientView } from "@/components/loyalty/loyalty-card-client-view";

export const viewport: Viewport = {
  themeColor: "#B38C4A",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicLoyaltyCustomer(token);

  if (!data) {
    return {
      title: "Carte fidélité — Natus",
    };
  }

  const firstName = data.customer.full_name.trim().split(/\s+/)[0] || "Client";

  return {
    title: `Espace client ${data.customer.full_name} — Natus`,
    description: `Carte fidélité Natus — ${data.customer.loyalty_points} points`,
    manifest: `/api/loyalty/manifest/${token}`,
    appleWebApp: {
      capable: true,
      title: `Natus ${firstName}`,
      statusBarStyle: "default",
    },
    icons: {
      apple: [
        {
          url: "/api/loyalty/icon/180",
          sizes: "180x180",
          type: "image/png",
        },
      ],
      icon: [
        {
          url: "/api/loyalty/icon/192",
          sizes: "192x192",
          type: "image/png",
        },
      ],
    },
  };
}

export default async function LoyaltyCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicLoyaltyCustomer(token);
  if (!data) notFound();

  const loyaltySettings = await getPublicLoyaltySettings();

  return (
    <div className="px-4 py-8 sm:px-6">
      <LoyaltyCardClientView
        initialCustomer={toPublicLoyaltyCustomer(data.customer)}
        initialTransactions={data.transactions}
        loyaltySettings={loyaltySettings}
      />
    </div>
  );
}
