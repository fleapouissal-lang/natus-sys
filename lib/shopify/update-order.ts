import type { ShopifyWorkflowStatus } from "@/lib/shopify/order-status";

function getShopifyConfig() {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error("SHOPIFY_SHOP_DOMAIN et SHOPIFY_ACCESS_TOKEN requis");
  }

  return {
    domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    token,
  };
}

async function shopifyFetch(path: string, options: RequestInit = {}) {
  const { domain, token } = getShopifyConfig();
  const res = await fetch(`https://${domain}/admin/api/2024-10${path}`, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text.slice(0, 300)}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function markShopifyOrderPaid(
  shopifyOrderId: number,
  amount: number,
  currency: string
): Promise<void> {
  await shopifyFetch(`/orders/${shopifyOrderId}/transactions.json`, {
    method: "POST",
    body: JSON.stringify({
      transaction: {
        kind: "sale",
        status: "success",
        amount: amount.toFixed(2),
        currency,
        gateway: "manual",
        source: "external",
      },
    }),
  });
}

export async function updateShopifyOrderTags(
  shopifyOrderId: number,
  existingTags: string | null | undefined,
  workflowStatus: ShopifyWorkflowStatus
): Promise<void> {
  const tagPrefix = "natus:";
  const baseTags = (existingTags || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith(tagPrefix));

  baseTags.push(`${tagPrefix}${workflowStatus}`);

  await shopifyFetch(`/orders/${shopifyOrderId}.json`, {
    method: "PUT",
    body: JSON.stringify({
      order: {
        id: shopifyOrderId,
        tags: baseTags.join(", "),
      },
    }),
  });
}

export async function syncShopifyWorkflowStatus(
  shopifyOrderId: number,
  workflowStatus: ShopifyWorkflowStatus,
  existingTags?: string | null
): Promise<void> {
  if (!process.env.SHOPIFY_SHOP_DOMAIN || !process.env.SHOPIFY_ACCESS_TOKEN) {
    return;
  }
  await updateShopifyOrderTags(shopifyOrderId, existingTags, workflowStatus);
}
