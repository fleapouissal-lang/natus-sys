import { createAdminClient } from "@/lib/supabase/admin";
import { getKapsoConfig } from "@/lib/kapso/config";
import {
  sendKapsoButtonMessage,
  sendKapsoCtaUrlMessage,
  sendKapsoTextMessage,
} from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import { clientFirstName } from "@/lib/kapso/whatsapp-bot/language";
import {
  shopifyOrderConfirmPublicUrl,
  shopifyOrderTrackingPublicUrl,
} from "@/lib/kapso/urls";
import { loyaltyCardPublicUrl } from "@/lib/loyalty/qr";
import { formatCurrency } from "@/lib/utils";
import type { ShopifyLineItemRow } from "@/lib/types";

export const SHOPIFY_CONFIRM_BUTTON_PREFIX = "natus_confirm:";

type ShopifyOrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  line_items: ShopifyLineItemRow[];
  tracking_token: string;
  whatsapp_confirmation_sent_at: string | null;
  customer_confirmed_at: string | null;
};

type ConfirmResult = {
  already_confirmed: boolean;
  order_id: string;
  order_number: string;
  tracking_token: string;
  customer_name: string;
  points_earned: number;
  loyalty_points: number;
  qr_token: string;
  created_new_card: boolean;
};

function resolveRecipient(customerPhone: string): string | null {
  return resolveKapsoRecipient(customerPhone);
}

function buildOrderLinesSummary(lineItems: ShopifyLineItemRow[]): string {
  const lines = lineItems.map(
    (item) => `• ${item.title} × ${item.quantity} — ${formatCurrency(Number(item.price) * item.quantity)}`
  );
  const text = lines.join("\n");
  return text.length > 800 ? `${text.slice(0, 797)}...` : text;
}

export async function fetchShopifyOrderForWhatsApp(
  orderId: string
): Promise<ShopifyOrderRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, total, line_items, tracking_token, whatsapp_confirmation_sent_at, customer_confirmed_at"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) {
    console.error("[Kapso] commande Shopify:", error?.message);
    return null;
  }
  return data as ShopifyOrderRow;
}

export async function sendShopifyOrderConfirmationRequest(
  orderId: string
): Promise<void> {
  const config = getKapsoConfig();
  if (!config) return;

  const order = await fetchShopifyOrderForWhatsApp(orderId);
  if (!order?.customer_phone) {
    console.warn("[Kapso] commande sans téléphone — WhatsApp ignoré:", orderId);
    return;
  }

  if (order.whatsapp_confirmation_sent_at) return;

  const recipient = resolveRecipient(order.customer_phone);
  if (!recipient) return;

  const customerName =
    clientFirstName(order.customer_name) ||
    order.customer_name?.trim() ||
    "Client";
  const confirmUrl = shopifyOrderConfirmPublicUrl(order.tracking_token);
  const detailsBody = [
    `Bonjour ${customerName} 👋`,
    "",
    `Nous avons bien reçu votre commande Shopify ${order.order_number}.`,
    "",
    buildOrderLinesSummary(order.line_items || []),
    "",
    `Total : ${formatCurrency(Number(order.total))}`,
  ].join("\n");

  const textResult = await sendKapsoTextMessage(config, recipient, detailsBody);
  if (!textResult.ok) return;

  const ctaResult = await sendKapsoCtaUrlMessage(
    config,
    recipient,
    "Appuyez sur le bouton pour confirmer votre commande.",
    "Confirmer",
    confirmUrl
  );

  if (!ctaResult.ok) {
    const buttonResult = await sendKapsoButtonMessage(
      config,
      recipient,
      "Confirmer votre commande ?",
      [
        {
          id: `${SHOPIFY_CONFIRM_BUTTON_PREFIX}${order.tracking_token}`,
          title: "Confirmer",
        },
      ]
    );
    if (!buttonResult.ok) {
      await sendKapsoTextMessage(
        config,
        recipient,
        `👉 Confirmer votre commande : ${confirmUrl}`
      );
    }
  }

  const admin = createAdminClient();
  await admin
    .from("shopify_orders")
    .update({ whatsapp_confirmation_sent_at: new Date().toISOString() })
    .eq("id", order.id);
}

export async function handleShopifyOrderConfirmButton(
  trackingToken: string
): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_shopify_order_customer", {
    p_token: trackingToken,
  });

  if (error) {
    console.error("[Kapso] confirm_shopify_order_customer:", error.message);
    throw new Error(error.message);
  }

  const result = data as ConfirmResult;
  if (result.already_confirmed) {
    return { confirmed: false, alreadyConfirmed: true };
  }

  const config = getKapsoConfig();
  if (config) {
    const order = await fetchShopifyOrderForWhatsApp(result.order_id);
    if (order?.customer_phone) {
      const recipient = resolveRecipient(order.customer_phone);
      if (recipient) {
        const trackingUrl = shopifyOrderTrackingPublicUrl(result.tracking_token);

        const lines = [
          `Merci ${result.customer_name} ✅`,
          "",
          `Votre commande ${result.order_number} est confirmée.`,
          "",
          `📦 Suivre ma commande :`,
          trackingUrl,
        ];

        if (result.points_earned > 0) {
          lines.push("", `⭐ Points gagnés : +${result.points_earned}`);
          lines.push(`🏆 Total points fidélité : ${result.loyalty_points}`);
        }

        if (result.created_new_card) {
          const cardUrl = loyaltyCardPublicUrl(result.qr_token);
          lines.push(
            "",
            "🎁 Nous avons créé votre carte fidélité Natus !",
            `Consultez votre carte :`,
            cardUrl
          );
        }

        await sendKapsoTextMessage(config, recipient, lines.join("\n"));
      }
    }
  }

  return { confirmed: true, alreadyConfirmed: false };
}

export function parseShopifyConfirmButtonId(
  buttonId: string
): string | null {
  if (!buttonId.startsWith(SHOPIFY_CONFIRM_BUTTON_PREFIX)) return null;
  const token = buttonId.slice(SHOPIFY_CONFIRM_BUTTON_PREFIX.length).trim();
  return token.length >= 36 ? token : null;
}
