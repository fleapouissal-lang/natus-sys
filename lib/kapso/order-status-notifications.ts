import { createAdminClient } from "@/lib/supabase/admin";
import { getKapsoConfig, getKapsoStatusTemplateConfig } from "@/lib/kapso/config";
import { sendKapsoTemplateMessage, sendKapsoTextMessage } from "@/lib/kapso/client";
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

function isOutsideMessagingWindow(error: string | undefined, status?: number): boolean {
  if (status !== 422) return false;
  const msg = error?.toLowerCase() ?? "";
  return msg.includes("24-hour") || msg.includes("24 hour") || msg.includes("template");
}

async function dispatchStatusMessage(
  recipient: string,
  order: OrderNotifyRow,
  status: ShopifyWorkflowStatus,
  trackingUrl: string | null
): Promise<{ ok: boolean; skipped?: boolean }> {
  const config = getKapsoConfig();
  if (!config) return { ok: false };

  const statusTemplate = getKapsoStatusTemplateConfig();
  const customerName =
    clientFirstName(order.customer_name) || order.customer_name?.trim() || "Client";
  const statusLabel = workflowStatusLabel(status);
  const tracking = trackingUrl && status !== "delivered" ? trackingUrl : "—";

  if (statusTemplate) {
    const templateResult = await sendKapsoTemplateMessage(
      config,
      recipient,
      statusTemplate.name,
      statusTemplate.language,
      [customerName, order.order_number, statusLabel, tracking]
    );
    if (templateResult.ok) return { ok: true };
    if (isOutsideMessagingWindow(templateResult.error, templateResult.status)) {
      return { ok: false, skipped: true };
    }
  }

  const body = buildStatusMessage(order, status, trackingUrl);
  const textResult = await sendKapsoTextMessage(config, recipient, body);
  if (textResult.ok) return { ok: true };

  if (isOutsideMessagingWindow(textResult.error, textResult.status)) {
    return { ok: false, skipped: true };
  }

  console.error("[Kapso] notify status:", status, textResult.error);
  return { ok: false };
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

  const customerPhone = data.customer_phone;
  const order = data as OrderNotifyRow;
  const sent = order.whatsapp_status_notifications || {};
  if (sent[newStatus]) return;

  const recipient = resolveKapsoRecipient(customerPhone);
  if (!recipient) return;

  const trackingUrl = order.tracking_token
    ? await orderTrackingShortUrl(order.tracking_token)
    : null;

  const result = await dispatchStatusMessage(recipient, order, newStatus, trackingUrl);
  if (result.skipped) {
    console.warn(
      "[Kapso] notification statut ignorée (hors fenêtre 24 h — configurez KAPSO_STATUS_TEMPLATE_NAME):",
      newStatus,
      order.order_number
    );
    return;
  }
  if (!result.ok) return;

  await admin
    .from("shopify_orders")
    .update({
      whatsapp_status_notifications: { ...sent, [newStatus]: new Date().toISOString() },
    })
    .eq("id", orderId);

  console.info("[Kapso] notification statut", newStatus, order.order_number);
}
