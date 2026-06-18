import { getKapsoConfig } from "@/lib/kapso/config";
import {
  sendKapsoCtaUrlMessage,
  sendKapsoTextMessage,
} from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import {
  detectConversationLanguage,
  type BotLanguage,
} from "@/lib/kapso/whatsapp-bot/language";
import { getBotSession } from "@/lib/kapso/whatsapp-bot/sessions";
import type { ChatTurn } from "@/lib/kapso/whatsapp-bot/gemini";
import { crossSellMessage, winbackMessage } from "@/lib/marketing/messages";
import {
  createUniqueWinbackPromoCode,
} from "@/lib/marketing/promo-codes";
import { parseRatingFromText } from "@/lib/marketing/review-intents";
import {
  googleReviewCtaLabel,
  saveWhatsAppReview,
  whatsappReviewConfirmationMessage,
} from "@/lib/marketing/reviews";
import { toDirectGoogleReviewUrl } from "@/lib/marketing/google-review-url";
import {
  findCrossSellProduct,
  getOrderProductCategories,
  getSaleProductCategories,
} from "@/lib/marketing/cross-sell";
import { getStoreMarketing } from "@/lib/marketing/store-marketing";
import { productStoryShortUrl } from "@/lib/short-url";
import { createAdminClient } from "@/lib/supabase/admin";

const WINBACK_INACTIVE_DAYS = 60;
const WINBACK_RESEND_DAYS = 90;

async function sendMarketingText(phone: string, body: string): Promise<boolean> {
  const config = getKapsoConfig();
  if (!config) return false;
  const recipient = resolveKapsoRecipient(phone);
  if (!recipient) return false;
  const result = await sendKapsoTextMessage(config, recipient, body);
  return result.ok;
}

function langForPhone(history: ChatTurn[] = [], sample = ""): BotLanguage {
  return detectConversationLanguage(sample, history);
}

export async function sendGoogleReviewAfterPositiveFeedback(
  phone: string,
  storeId: string,
  history: ChatTurn[] = [],
  input?: {
    customerName?: string | null;
    message?: string | null;
    rating?: number;
    shopifyOrderId?: string | null;
    saleId?: string | null;
  }
): Promise<void> {
  const store = await getStoreMarketing(storeId);
  if (!store?.google_review_url) return;

  const rating =
    input?.rating ?? parseRatingFromText(input?.message || "");
  if (rating === null) return;

  const saved = await saveWhatsAppReview({
    storeId,
    customerPhone: phone,
    customerName: input?.customerName,
    message: input?.message,
    rating,
    shopifyOrderId: input?.shopifyOrderId,
    saleId: input?.saleId,
  });

  if (!saved) return;

  const lang = langForPhone(history, input?.message || "");
  const body = whatsappReviewConfirmationMessage(lang, saved.rating, store.name);
  const reviewUrl = toDirectGoogleReviewUrl(store.google_review_url);
  const ctaLabel = googleReviewCtaLabel(lang);

  const config = getKapsoConfig();
  if (!config) return;
  const recipient = resolveKapsoRecipient(phone);
  if (!recipient) return;

  const ctaResult = await sendKapsoCtaUrlMessage(
    config,
    recipient,
    body,
    ctaLabel,
    reviewUrl
  );

  if (!ctaResult.ok) {
    await sendKapsoTextMessage(
      config,
      recipient,
      `${body}\n\n👉 ${ctaLabel} : ${reviewUrl}`
    );
  }
}

export async function sendCrossSellForSale(saleId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sales")
    .select("id, whatsapp_cross_sell_sent_at, customers ( phone, full_name )")
    .eq("id", saleId)
    .maybeSingle();

  if (!sale || sale.whatsapp_cross_sell_sent_at) return false;

  const customer = sale.customers as { phone: string; full_name: string } | null;
  if (!customer?.phone) return false;

  const ctx = await getSaleProductCategories(saleId);
  if (!ctx) return false;

  const product = await findCrossSellProduct(
    ctx.storeId,
    ctx.categories,
    ctx.productIds
  );
  if (!product) return false;

  const store = await getStoreMarketing(ctx.storeId);
  if (!store) return false;

  const session = await getBotSession(customer.phone);
  const lang = langForPhone(session?.history ?? []);
  const url = await productStoryShortUrl(product.id);
  const body = crossSellMessage(lang, product.name, url, product.price, store);

  const ok = await sendMarketingText(customer.phone, body);
  if (!ok) return false;

  await admin
    .from("sales")
    .update({ whatsapp_cross_sell_sent_at: new Date().toISOString() })
    .eq("id", saleId);

  return true;
}

export async function sendCrossSellForOrder(orderId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("shopify_orders")
    .select("id, customer_phone, whatsapp_cross_sell_sent_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.customer_phone || order.whatsapp_cross_sell_sent_at) return false;

  const ctx = await getOrderProductCategories(orderId);
  if (!ctx) return false;

  const product = await findCrossSellProduct(ctx.storeId, ctx.categories);
  if (!product) return false;

  const store = await getStoreMarketing(ctx.storeId);
  if (!store) return false;

  const session = await getBotSession(order.customer_phone);
  const lang = langForPhone(session?.history ?? []);
  const url = await productStoryShortUrl(product.id);
  const body = crossSellMessage(lang, product.name, url, product.price, store);

  const ok = await sendMarketingText(order.customer_phone, body);
  if (!ok) return false;

  await admin
    .from("shopify_orders")
    .update({ whatsapp_cross_sell_sent_at: new Date().toISOString() })
    .eq("id", orderId);

  return true;
}

function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function processWinbackReminders(): Promise<{
  sent: number;
  skipped: number;
}> {
  const admin = createAdminClient();
  const inactiveCutoff = new Date(
    Date.now() - WINBACK_INACTIVE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const resendCutoff = new Date(
    Date.now() - WINBACK_RESEND_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: customers } = await admin
    .from("customers")
    .select("id, full_name, phone, store_id, whatsapp_winback_sent_at")
    .not("phone", "is", null)
    .limit(500);

  let sent = 0;
  let skipped = 0;

  for (const customer of customers || []) {
    if (
      customer.whatsapp_winback_sent_at &&
      customer.whatsapp_winback_sent_at > resendCutoff
    ) {
      skipped++;
      continue;
    }

    const digits = phoneDigits(customer.phone);
    const { data: lastSale } = await admin
      .from("sales")
      .select("created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: orders } = await admin
      .from("shopify_orders")
      .select("shopify_created_at, customer_phone")
      .not("customer_phone", "is", null)
      .order("shopify_created_at", { ascending: false })
      .limit(200);

    const lastOrder = (orders || []).find((o) => {
      const p = phoneDigits(o.customer_phone || "");
      return p === digits || p.endsWith(digits.slice(-9));
    });

    const lastSaleAt = lastSale?.created_at || null;
    const lastOrderAt = lastOrder?.shopify_created_at || null;
    const lastActivity = [lastSaleAt, lastOrderAt]
      .filter(Boolean)
      .sort()
      .reverse()[0];

    if (!lastActivity || lastActivity > inactiveCutoff) {
      skipped++;
      continue;
    }

    const storeId = customer.store_id;
    if (!storeId) {
      skipped++;
      continue;
    }

    const store = await getStoreMarketing(storeId);
    if (!store) {
      skipped++;
      continue;
    }

    const promo = await createUniqueWinbackPromoCode(customer.id, storeId);
    if (!promo) {
      skipped++;
      continue;
    }

    const session = await getBotSession(customer.phone);
    const lang = langForPhone(session?.history ?? []);
    const firstName = customer.full_name?.trim().split(/\s+/)[0] || "";
    const body = winbackMessage(
      lang,
      firstName,
      store,
      promo.code,
      promo.expiresAt
    );

    const ok = await sendMarketingText(customer.phone, body);
    if (!ok) {
      skipped++;
      continue;
    }

    await admin
      .from("customers")
      .update({ whatsapp_winback_sent_at: new Date().toISOString() })
      .eq("id", customer.id);

    sent++;
  }

  return { sent, skipped };
}
