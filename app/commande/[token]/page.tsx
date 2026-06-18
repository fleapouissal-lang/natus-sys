import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopifyOrderTrackingView } from "@/components/orders/shopify-order-tracking-view";
import { getPublicShopifyOrder } from "@/lib/shopify/public-order";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const order = await getPublicShopifyOrder(token);
  if (!order) {
    return { title: "Commande — Natus" };
  }
  return {
    title: `Commande ${order.order_number} — Natus`,
    description: "Suivez l'état de votre commande Natus",
  };
}

export default async function ShopifyOrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const { token } = await params;
  const { confirmed } = await searchParams;
  const order = await getPublicShopifyOrder(token);
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <ShopifyOrderTrackingView order={order} justConfirmed={confirmed === "1"} />
    </div>
  );
}
