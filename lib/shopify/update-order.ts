import type { ShopifyWorkflowStatus } from "@/lib/shopify/order-status";

function getShopifyConfig() {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!domain || !token) {
    return null;
  }

  return {
    domain: domain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    token,
  };
}

function isShopifyConfigured(): boolean {
  return Boolean(getShopifyConfig());
}

async function shopifyFetch(path: string, options: RequestInit = {}) {
  const config = getShopifyConfig();
  if (!config) {
    throw new Error("Shopify non configuré");
  }

  const res = await fetch(`https://${config.domain}/admin/api/2024-10${path}`, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": config.token,
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

function logShopifySyncFailure(action: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[Shopify] ${action} ignorée — ${message}`);
}

export async function markShopifyOrderPaid(
  shopifyOrderId: number,
  amount: number,
  currency: string
): Promise<boolean> {
  if (!isShopifyConfigured()) return false;

  try {
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
    return true;
  } catch (err) {
    logShopifySyncFailure("marquage payé", err);
    return false;
  }
}

export async function updateShopifyOrderTags(
  shopifyOrderId: number,
  existingTags: string | null | undefined,
  workflowStatus: ShopifyWorkflowStatus
): Promise<boolean> {
  if (!isShopifyConfigured()) return false;

  const tagPrefix = "natus:";
  const baseTags = (existingTags || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith(tagPrefix));

  baseTags.push(`${tagPrefix}${workflowStatus}`);

  try {
    await shopifyFetch(`/orders/${shopifyOrderId}.json`, {
      method: "PUT",
      body: JSON.stringify({
        order: {
          id: shopifyOrderId,
          tags: baseTags.join(", "),
        },
      }),
    });
    return true;
  } catch (err) {
    logShopifySyncFailure("mise à jour tags", err);
    return false;
  }
}

export async function syncShopifyWorkflowStatus(
  shopifyOrderId: number,
  workflowStatus: ShopifyWorkflowStatus,
  existingTags?: string | null
): Promise<boolean> {
  return updateShopifyOrderTags(shopifyOrderId, existingTags, workflowStatus);
}
