import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPublicLoyaltyCustomer } from "@/lib/loyalty/customers";
import { toPublicLoyaltyCustomer } from "@/lib/loyalty/public";
import { getPublicLoyaltySettings } from "@/lib/loyalty/settings.server";
import { PRO_CLIENT_DISCOUNT_PERCENT } from "@/lib/pro-client/discount";
import { LoyaltyCardClientView } from "@/components/loyalty/loyalty-card-client-view";

export const viewport: Viewport = {
  themeColor: "#B38C4A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      title: "Espace client — Natus",
    };
  }

  const firstName = data.customer.full_name.trim().split(/\s+/)[0] || "Client";
  const isPro = Boolean(data.customer.is_pro_client);

  return {
    title: `${isPro ? "Client Pro" : "Espace client"} · ${data.customer.full_name} — Natus`,
    description: isPro
      ? `Carte Client Pro Natus — remise ${PRO_CLIENT_DISCOUNT_PERCENT}%`
      : `Carte fidélité Natus — ${data.customer.loyalty_points} points`,
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
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { token } = await params;
  const { tab: tabParam } = await searchParams;
  const data = await getPublicLoyaltyCustomer(token);
  if (!data) notFound();

  // Les clients Pro sont servis sur pro.*, les clients fidélité sur loyalty.*.
  // On corrige le sous-domaine si l'entrée se fait sur le mauvais host.
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  const isPro = Boolean(data.customer.is_pro_client);
  const onLoyaltyHost = host.startsWith("loyalty.");
  const onProHost = host.startsWith("pro.");
  if ((isPro && onLoyaltyHost) || (!isPro && onProHost)) {
    const labels = host.split(".");
    const base = labels.length > 2 ? labels.slice(1).join(".") : host;
    const query = tabParam ? `?tab=${encodeURIComponent(tabParam)}` : "";
    redirect(`https://${isPro ? "pro" : "loyalty"}.${base}/carte/${token}${query}`);
  }

  const loyaltySettings = await getPublicLoyaltySettings();
  const initialTab =
    tabParam === "commandes" ||
    tabParam === "factures" ||
    tabParam === "points" ||
    tabParam === "historique" ||
    tabParam === "carte"
      ? tabParam
      : undefined;

  return (
    <LoyaltyCardClientView
      initialCustomer={toPublicLoyaltyCustomer(data.customer)}
      initialTransactions={data.transactions}
      loyaltySettings={loyaltySettings}
      initialTab={initialTab}
    />
  );
}
