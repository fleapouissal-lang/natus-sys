import { getKapsoConfig, isKapsoBotEnabled } from "@/lib/kapso/config";
import { sendKapsoTextMessage } from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import {
  fallbackReply,
  generateCustomerReply,
} from "@/lib/kapso/whatsapp-bot/gemini";
import {
  findLatestOrderByPhone,
  type CustomerOrderRow,
} from "@/lib/kapso/whatsapp-bot/orders";
import { appendBotHistory, getBotSession } from "@/lib/kapso/whatsapp-bot/sessions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SHOPIFY_CONFIRM_BUTTON_PREFIX,
  handleShopifyOrderConfirmButton,
} from "@/lib/kapso/shopify-order-whatsapp";

export type InboundKapsoMessage = {
  from: string;
  text?: string;
  buttonId?: string;
};

async function sendText(to: string, body: string) {
  const config = getKapsoConfig();
  if (!config) return;
  await sendKapsoTextMessage(config, to, body);
}

function buttonToText(buttonId: string): string | null {
  if (buttonId.includes("menu_problem") || buttonId.includes("problem")) {
    return "Je veux signaler un problème avec ma commande.";
  }
  if (buttonId.endsWith(":no") || buttonId.includes("no")) {
    return "Non merci.";
  }
  if (buttonId.includes("yes")) {
    return "Oui.";
  }
  return null;
}

async function logProblemOnOrder(order: CustomerOrderRow, problemText: string) {
  const admin = createAdminClient();
  const note = `[WhatsApp ${new Date().toISOString().slice(0, 16)}] ${problemText}`;
  await admin
    .from("shopify_orders")
    .update({
      cashier_confirmation_note: order.cashier_confirmation_note
        ? `${order.cashier_confirmation_note}\n\n${note}`
        : note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

async function loadOrderById(orderId: string): Promise<CustomerOrderRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, tracking_token, workflow_status, total, updated_at, cashier_confirmation_note"
    )
    .eq("id", orderId)
    .maybeSingle();
  return (data as CustomerOrderRow | null) ?? null;
}

export async function handleInboundWhatsAppMessage(
  msg: InboundKapsoMessage
): Promise<void> {
  if (!isKapsoBotEnabled()) return;

  const phone = resolveKapsoRecipient(msg.from) || msg.from.replace(/\D/g, "");
  if (!phone) return;

  if (msg.buttonId?.startsWith(SHOPIFY_CONFIRM_BUTTON_PREFIX)) {
    const token = msg.buttonId.slice(SHOPIFY_CONFIRM_BUTTON_PREFIX.length).trim();
    if (token.length >= 36) {
      await handleShopifyOrderConfirmButton(token);
    }
    return;
  }

  const userMessage =
    msg.text?.trim() ||
    (msg.buttonId?.startsWith("natus_bot:") ? buttonToText(msg.buttonId) : null);

  if (!userMessage) return;

  const session = await getBotSession(phone);
  const orderByPhone = await findLatestOrderByPhone(phone);
  const orderForContext =
    orderByPhone ??
    (session?.last_order_id ? await loadOrderById(session.last_order_id) : null);

  const ai =
    (await generateCustomerReply(
      userMessage,
      orderForContext,
      session?.history ?? []
    )) ?? fallbackReply(userMessage, orderForContext, session?.history ?? []);

  if (ai.logProblem && orderForContext) {
    await logProblemOnOrder(orderForContext, userMessage);
  }

  await sendText(phone, ai.reply);
  await appendBotHistory(phone, userMessage, ai.reply, orderForContext?.id ?? null);
}
