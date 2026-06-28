import { appPublicOrigin } from "@/lib/kapso/urls";
import {
  shopifyOrderConfirmPublicUrl,
  shopifyOrderTrackingPublicUrl,
} from "@/lib/kapso/urls";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { publicSubdomainOrigin } from "@/lib/public-subdomain";
import { createAdminClient } from "@/lib/supabase/admin";

export type ShortLinkKind = "order" | "loyalty_card" | "product";

export type ResolvedShortLink = {
  kind: ShortLinkKind;
  token: string;
};

function publicOrigin(baseUrl?: string): string {
  return (baseUrl || appPublicOrigin()).replace(/\/$/, "");
}

export async function getOrCreateShortCode(
  kind: ShortLinkKind,
  token: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_or_create_short_link", {
    p_kind: kind,
    p_token: token,
  });

  if (error) {
    console.warn("[short-url] get_or_create_short_link:", error.message);
    return null;
  }

  const code = typeof data === "string" ? data.trim() : "";
  return code.length >= 6 ? code : null;
}

export async function resolveShortLink(
  code: string
): Promise<ResolvedShortLink | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("resolve_short_link", {
    p_code: trimmed,
  });

  if (error) {
    console.warn("[short-url] resolve_short_link:", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.kind || !row?.token) return null;

  return {
    kind: row.kind as ShortLinkKind,
    token: String(row.token),
  };
}

export async function orderTrackingShortUrl(
  trackingToken: string,
  baseUrl?: string
): Promise<string> {
  const code = await getOrCreateShortCode("order", trackingToken);
  if (code) return `${publicOrigin(baseUrl)}/c/${code}`;
  return shopifyOrderTrackingPublicUrl(trackingToken, baseUrl);
}

export async function orderConfirmShortUrl(
  trackingToken: string,
  baseUrl?: string
): Promise<string> {
  const code = await getOrCreateShortCode("order", trackingToken);
  if (code) return `${publicOrigin(baseUrl)}/c/${code}/ok`;
  return shopifyOrderConfirmPublicUrl(trackingToken, baseUrl);
}

export async function loyaltyCardShortUrl(
  qrToken: string,
  baseUrl?: string
): Promise<string> {
  const code = await getOrCreateShortCode("loyalty_card", qrToken);
  if (code) {
    return `${publicSubdomainOrigin("loyalty", baseUrl).replace(/\/$/, "")}/f/${code}`;
  }
  return loyaltyCardPublicUrl(qrToken, baseUrl);
}

export async function productStoryShortUrl(
  productId: string,
  baseUrl?: string
): Promise<string> {
  const code = await getOrCreateShortCode("product", productId);
  if (code) return `${publicOrigin(baseUrl)}/p/${code}`;
  return `${publicOrigin(baseUrl)}/produit/${productId}`;
}
