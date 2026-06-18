import { createAdminClient } from "@/lib/supabase/admin";
import { createStoreComplaint } from "@/lib/feedback/complaints";
import {
  askReclamationMessage,
  reclamationReceivedMessage,
  sendFeedbackText,
} from "@/lib/kapso/feedback/messages";
import {
  parseFeedbackButtonId,
  type FeedbackTargetKind,
} from "@/lib/kapso/feedback/constants";
import type { StoreComplaintSource } from "@/lib/feedback/complaints";
import {
  detectConversationLanguage,
  type BotLanguage,
} from "@/lib/kapso/whatsapp-bot/language";
import { getBotSession, upsertBotSession } from "@/lib/kapso/whatsapp-bot/sessions";
import type { ChatTurn } from "@/lib/kapso/whatsapp-bot/gemini";
import { revalidatePath } from "next/cache";
import {
  isReclamationIntentOnly,
  isReclamationWithDetail,
} from "@/lib/kapso/feedback/intents";
import type { CustomerOrderRow } from "@/lib/kapso/whatsapp-bot/orders";
import {
  isWhatsAppReviewIntent,
  parseRatingFromText,
} from "@/lib/marketing/review-intents";
import { sendGoogleReviewAfterPositiveFeedback } from "@/lib/marketing/send-marketing";

type FeedbackContext = {
  storeId: string;
  source: StoreComplaintSource;
  shopifyOrderId: string | null;
  saleId: string | null;
  customerPhone: string;
  customerName: string | null;
  orderNumber: string | null;
};

async function loadOrderContext(orderId: string): Promise<FeedbackContext | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shopify_orders")
    .select("id, order_number, store_id, customer_phone, customer_name, workflow_status")
    .eq("id", orderId)
    .maybeSingle();

  if (!data?.store_id || !data.customer_phone) return null;
  return {
    storeId: data.store_id,
    source: "shopify_delivery",
    shopifyOrderId: data.id,
    saleId: null,
    customerPhone: data.customer_phone,
    customerName: data.customer_name,
    orderNumber: data.order_number,
  };
}

async function loadSaleContext(saleId: string): Promise<FeedbackContext | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sales")
    .select(
      `
      id,
      store_id,
      customers ( full_name, phone )
    `
    )
    .eq("id", saleId)
    .maybeSingle();

  const customer = data?.customers as { full_name: string; phone: string } | null;
  if (!data?.store_id || !customer?.phone) return null;

  return {
    storeId: data.store_id,
    source: "pos_sale",
    shopifyOrderId: null,
    saleId: data.id,
    customerPhone: customer.phone,
    customerName: customer.full_name,
    orderNumber: null,
  };
}

async function resolveFeedbackContext(
  kind: FeedbackTargetKind,
  resourceId: string
): Promise<FeedbackContext | null> {
  return kind === "order"
    ? loadOrderContext(resourceId)
    : loadSaleContext(resourceId);
}

function langFromSession(history: ChatTurn[]): BotLanguage {
  const lastUser = [...history].reverse().find((t) => t.role === "user");
  return detectConversationLanguage(lastUser?.text || "", history);
}

async function saveComplaintAndNotify(
  ctx: FeedbackContext,
  message: string
): Promise<boolean> {
  const complaint = await createStoreComplaint({
    storeId: ctx.storeId,
    source: ctx.source,
    shopifyOrderId: ctx.shopifyOrderId,
    saleId: ctx.saleId,
    customerPhone: ctx.customerPhone,
    customerName: ctx.customerName,
    message,
  });

  if (!complaint) return false;

  revalidatePath("/manager/reclamations");
  revalidatePath("/director/reclamations");
  return true;
}

export async function handleFeedbackButtonClick(
  buttonId: string,
  phone: string
): Promise<boolean> {
  const parsed = parseFeedbackButtonId(buttonId);
  if (!parsed) return false;

  const ctx = await resolveFeedbackContext(parsed.kind, parsed.resourceId);
  if (!ctx) return false;

  const session = await getBotSession(phone);

  if (parsed.action === "good") {
    await sendGoogleReviewAfterPositiveFeedback(
      phone,
      ctx.storeId,
      session?.history ?? [],
      {
        customerName: ctx.customerName,
        message: "Très bien",
        rating: 5,
        shopifyOrderId: ctx.shopifyOrderId,
        saleId: ctx.saleId,
      }
    );
    await upsertBotSession(phone, {
      state: "idle",
      pending_store_id: null,
      pending_sale_id: null,
      feedback_source: null,
      pending_problem: null,
    });
    return true;
  }

  await upsertBotSession(phone, {
    state: "awaiting_reclamation",
    last_order_id: ctx.shopifyOrderId,
    pending_store_id: ctx.storeId,
    pending_sale_id: ctx.saleId,
    feedback_source: ctx.source,
    pending_problem: null,
  });

  await sendFeedbackText(
    phone,
    askReclamationMessage(langFromSession(session?.history ?? []))
  );
  return true;
}

export async function handleReclamationText(
  phone: string,
  text: string
): Promise<boolean> {
  const session = await getBotSession(phone);
  if (session?.state !== "awaiting_reclamation" || !session.pending_store_id) {
    return false;
  }

  const trimmed = text.trim();
  if (trimmed.length < 3) return false;

  const ctx: FeedbackContext = {
    storeId: session.pending_store_id,
    source: (session.feedback_source as StoreComplaintSource) || "shopify_delivery",
    shopifyOrderId: session.last_order_id,
    saleId: session.pending_sale_id,
    customerPhone: phone,
    customerName: null,
    orderNumber: null,
  };

  const saved = await saveComplaintAndNotify(ctx, trimmed);
  const lang = langFromSession(session.history ?? []);

  if (saved) {
    await sendFeedbackText(phone, reclamationReceivedMessage(lang));
  }

  await upsertBotSession(phone, {
    state: "idle",
    pending_store_id: null,
    pending_sale_id: null,
    feedback_source: null,
    pending_problem: null,
  });

  return saved;
}

async function findLatestSaleByPhone(phoneKey: string): Promise<{
  saleId: string;
  storeId: string;
  customerName: string | null;
} | null> {
  const admin = createAdminClient();
  const target = phoneKey.replace(/\D/g, "");

  const { data: customers } = await admin
    .from("customers")
    .select("id, full_name, phone")
    .not("phone", "is", null)
    .limit(500);

  const customer = (customers || []).find((c) => {
    const digits = String(c.phone || "").replace(/\D/g, "");
    return digits === target || digits.endsWith(target.slice(-9));
  });

  if (!customer) return null;

  const { data: sale } = await admin
    .from("sales")
    .select("id, store_id")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sale?.store_id) return null;

  return {
    saleId: sale.id,
    storeId: sale.store_id,
    customerName: customer.full_name,
  };
}

async function resolveReclamationContextFromPhone(
  phone: string,
  order: CustomerOrderRow | null
): Promise<FeedbackContext | null> {
  if (order) {
    const ctx = await loadOrderContext(order.id);
    if (ctx) return ctx;
  }

  const sale = await findLatestSaleByPhone(phone);
  if (!sale) return null;

  return {
    storeId: sale.storeId,
    source: "pos_sale",
    shopifyOrderId: null,
    saleId: sale.saleId,
    customerPhone: phone,
    customerName: sale.customerName,
    orderNumber: null,
  };
}

async function beginAwaitingReclamation(
  phone: string,
  ctx: FeedbackContext,
  history: ChatTurn[],
  triggerText?: string
): Promise<void> {
  await upsertBotSession(phone, {
    state: "awaiting_reclamation",
    last_order_id: ctx.shopifyOrderId,
    pending_store_id: ctx.storeId,
    pending_sale_id: ctx.saleId,
    feedback_source: ctx.source,
    pending_problem: null,
  });

  const lang = detectConversationLanguage(triggerText || "", history);
  await sendFeedbackText(phone, askReclamationMessage(lang));
}

export async function handleReclamationIntentFromText(
  phone: string,
  text: string,
  order: CustomerOrderRow | null,
  history: ChatTurn[] = []
): Promise<boolean> {
  const ctx = await resolveReclamationContextFromPhone(phone, order);
  if (!ctx) {
    const lang = detectConversationLanguage(text, history);
    await sendFeedbackText(
      phone,
      lang === "darija"
        ? "Ma lqina hta commande wla achat b had numéro. Jarb mn ba3d wla 3iyet lina f magasin."
        : "Aucune commande ou achat récent avec ce numéro. Réessayez plus tard ou contactez le magasin."
    );
    return true;
  }

  if (isReclamationWithDetail(text)) {
    const saved = await saveComplaintAndNotify(ctx, text);
    const lang = langFromSession(history);
    if (saved) {
      await sendFeedbackText(phone, reclamationReceivedMessage(lang));
    }
    return true;
  }

  if (isReclamationIntentOnly(text)) {
    await beginAwaitingReclamation(phone, ctx, history, text);
    return true;
  }

  return false;
}

async function resolveReviewContextFromPhone(
  phone: string,
  order: CustomerOrderRow | null
): Promise<FeedbackContext | null> {
  const ctx = await resolveReclamationContextFromPhone(phone, order);
  if (ctx) return ctx;

  const admin = createAdminClient();
  const target = phone.replace(/\D/g, "");
  const { data: customers } = await admin
    .from("customers")
    .select("id, full_name, phone, store_id")
    .not("phone", "is", null)
    .limit(500);

  const customer = (customers || []).find((c) => {
    const digits = String(c.phone || "").replace(/\D/g, "");
    return digits === target || digits.endsWith(target.slice(-9));
  });

  if (!customer?.store_id) return null;

  return {
    storeId: customer.store_id,
    source: "pos_sale",
    shopifyOrderId: null,
    saleId: null,
    customerPhone: phone,
    customerName: customer.full_name,
    orderNumber: null,
  };
}

export async function handleWhatsAppReviewFromText(
  phone: string,
  text: string,
  order: CustomerOrderRow | null,
  history: ChatTurn[] = []
): Promise<boolean> {
  if (!isWhatsAppReviewIntent(text)) return false;

  const rating = parseRatingFromText(text);
  if (rating === null) return false;

  const ctx = await resolveReviewContextFromPhone(phone, order);
  if (!ctx) return false;

  await sendGoogleReviewAfterPositiveFeedback(
    phone,
    ctx.storeId,
    history,
    {
      customerName: ctx.customerName,
      message: text,
      rating,
      shopifyOrderId: ctx.shopifyOrderId,
      saleId: ctx.saleId,
    }
  );

  return true;
}

export async function registerProblemComplaint(input: {
  orderId: string;
  customerPhone: string;
  message: string;
}): Promise<boolean> {
  const ctx = await loadOrderContext(input.orderId);
  if (!ctx) return false;

  return saveComplaintAndNotify(
    { ...ctx, customerPhone: input.customerPhone },
    input.message
  );
}
