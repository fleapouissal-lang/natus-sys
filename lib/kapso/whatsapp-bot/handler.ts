import { getKapsoConfig, isKapsoBotEnabled } from "@/lib/kapso/config";
import { sendKapsoTextMessage } from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import {
  handleFeedbackButtonClick,
  handleReclamationText,
  handleReclamationIntentFromText,
  handleWhatsAppReviewFromText,
  registerProblemComplaint,
} from "@/lib/kapso/feedback/handler";
import { FEEDBACK_BUTTON_PREFIX } from "@/lib/kapso/feedback/constants";
import { isReclamationIntent } from "@/lib/kapso/feedback/intents";
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

async function logProblemOnOrder(
  order: CustomerOrderRow,
  problemText: string,
  phone: string
) {
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

  if (order.workflow_status === "delivered") {
    await registerProblemComplaint({
      orderId: order.id,
      customerPhone: phone,
      message: problemText,
    });
  }
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

  if (msg.buttonId?.startsWith(FEEDBACK_BUTTON_PREFIX)) {
    await handleFeedbackButtonClick(msg.buttonId, phone);
    return;
  }

  const session = await getBotSession(phone);
  const text = msg.text?.trim();

  if (text && session?.state === "awaiting_reclamation") {
    await handleReclamationText(phone, text);
    return;
  }

  const orderByPhone = text ? await findLatestOrderByPhone(phone) : null;
  const orderForContext =
    orderByPhone ??
    (session?.last_order_id ? await loadOrderById(session.last_order_id) : null);

  if (text && isReclamationIntent(text)) {
    const handled = await handleReclamationIntentFromText(
      phone,
      text,
      orderForContext,
      session?.history ?? []
    );
    if (handled) return;
  }

  if (text) {
    const reviewHandled = await handleWhatsAppReviewFromText(
      phone,
      text,
      orderForContext,
      session?.history ?? []
    );
    if (reviewHandled) return;
  }

  const userMessage =
    text || (msg.buttonId?.startsWith("natus_bot:") ? buttonToText(msg.buttonId) : null);

  if (!userMessage) return;

  const orderForAi =
    orderForContext ??
    (await findLatestOrderByPhone(phone)) ??
    (session?.last_order_id ? await loadOrderById(session.last_order_id) : null);

  const ai =
    (await generateCustomerReply(
      userMessage,
      orderForAi,
      session?.history ?? []
    )) ?? (await fallbackReply(userMessage, orderForAi, session?.history ?? []));

  if (ai.logProblem && orderForAi) {
    await logProblemOnOrder(orderForAi, userMessage, phone);
  }

  await sendText(phone, ai.reply);
  await appendBotHistory(phone, userMessage, ai.reply, orderForAi?.id ?? null);
}
