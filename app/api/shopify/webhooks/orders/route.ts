import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyWebhook } from "@/lib/shopify/verify";
import { processShopifyOrder } from "@/lib/shopify/process-order";
import type { ShopifyOrderPayload } from "@/lib/shopify/types";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmac)) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let order: ShopifyOrderPayload;
  try {
    order = JSON.parse(rawBody) as ShopifyOrderPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!order.id) {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }

  const result = await processShopifyOrder(order);

  if (!result.ok) {
    console.error("Shopify webhook:", result.error, order.id);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
