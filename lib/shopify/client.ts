import type { ShopifyOrderPayload } from "@/lib/shopify/types";

function getShopifyConfig() {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error("SHOPIFY_SHOP_DOMAIN et SHOPIFY_ACCESS_TOKEN requis");
  }

  return { domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""), token };
}

export async function fetchShopifyOrders(
  limit = 50
): Promise<ShopifyOrderPayload[]> {
  const { domain, token } = getShopifyConfig();

  const url = new URL(`https://${domain}/admin/api/2024-10/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("order", "created_at desc");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { orders: ShopifyOrderPayload[] };
  return json.orders || [];
}

export function isShopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN);
}
