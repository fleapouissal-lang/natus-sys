import { createAdminClient } from "@/lib/supabase/admin";
import { getKapsoConfig } from "@/lib/kapso/config";
import { sendKapsoTextMessage } from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import { orderTrackingShortUrl } from "@/lib/short-url";
import { clientFirstName } from "@/lib/kapso/whatsapp-bot/language";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import type { ShopifyWorkflowStatus } from "@/lib/types";

const NOTIFY_STATUSES: ShopifyWorkflowStatus[] = [
  "preparing",
  "ready",
  "shipping",
  "delivered",
];

const STATUS_INTRO: Partial<Record<ShopifyWorkflowStatus, string>> = {
  preparing: "est en préparation",
  ready: "est prête 🎉",
  shipping: "est en cours de livraison 🚚",
  delivered: "a été livrée ✅",
};

type OrderNotifyRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  tracking_token: string | null;
  whatsapp_status_notifications: Record<string, string> | null;
};

function buildStatusMessage(
  order: OrderNotifyRow,
  status: ShopifyWorkflowStatus,
  trackingUrl: string | null
): string {
  const name = clientFirstName(order.customer_name) || order.customer_name?.trim() || "";
  const intro = STATUS_INTRO[status] || workflowStatusLabel(status).toLowerCase();
  const greeting = name ? `${name},` : "";
  const lines = [
    greeting ? `${greeting} votre commande ${order.order_number} ${intro}.` : `Votre commande ${order.order_number} ${intro}.`,
    "",
    `Statut : ${workflowStatusLabel(status)}`,
  ];

  if (trackingUrl && status !== "delivered") {
    lines.push("", "📦 Suivre ma commande :", trackingUrl);
  }

  if (status === "delivered") {
    lines.push("", "Merci pour votre confiance — Natus");
  }

  return lines.join("\n");
}

export async function notifyShopifyOrderWorkflowStatus(
  orderId: string,
  newStatus: ShopifyWorkflowStatus,
  previousStatus?: ShopifyWorkflowStatus
): Promise<void> {
  if (!NOTIFY_STATUSES.includes(newStatus)) return;
  if (previousStatus === newStatus) return;

  const config = getKapsoConfig();
  if (!config) return;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, tracking_token, whatsapp_status_notifications"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data?.customer_phone) return;

  const order = data as OrderNotifyRow;
  const sent = order.whatsapp_status_notifications || {};
  if (sent[newStatus]) return;

  const recipient = resolveKapsoRecipient(order.customer_phone);
  if (!recipient) return;

  const trackingUrl = order.tracking_token
    ? await orderTrackingShortUrl(order.tracking_token)
    : null;

  const body = buildStatusMessage(order, newStatus, trackingUrl);
  const result = await sendKapsoTextMessage(config, recipient, body);
  if (!result.ok) {
    console.error("[Kapso] notify status:", newStatus, result.error);
    return;
  }

  await admin
    .from("shopify_orders")
    .update({
      whatsapp_status_notifications: { ...sent, [newStatus]: new Date().toISOString() },
    })
    .eq("id", orderId);

  console.info("[Kapso] notification statut", newStatus, order.order_number);
}
