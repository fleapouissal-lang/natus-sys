import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatStarRating,
  parseRatingFromText,
} from "@/lib/marketing/review-intents";
import type { BotLanguage } from "@/lib/kapso/whatsapp-bot/language";

export type SaveWhatsAppReviewInput = {
  storeId: string;
  customerPhone: string;
  customerName?: string | null;
  message?: string | null;
  rating?: number;
  shopifyOrderId?: string | null;
  saleId?: string | null;
};

export async function saveWhatsAppReview(
  input: SaveWhatsAppReviewInput
): Promise<{ rating: number } | null> {
  const parsed =
    input.rating ?? parseRatingFromText(input.message || "");
  if (parsed === null || parsed < 1 || parsed > 5) return null;

  const rating = Math.min(5, Math.max(1, Math.round(parsed)));

  const admin = createAdminClient();
  const { error } = await admin.from("customer_whatsapp_reviews").insert({
    store_id: input.storeId,
    customer_phone: input.customerPhone,
    customer_name: input.customerName?.trim() || null,
    rating,
    message: input.message?.trim() || null,
    shopify_order_id: input.shopifyOrderId ?? null,
    sale_id: input.saleId ?? null,
  });

  if (error) {
    console.error("[reviews] save:", error.message);
    return null;
  }

  return { rating };
}

export function whatsappReviewConfirmationMessage(
  lang: BotLanguage,
  rating: number,
  storeName: string
): string {
  const stars = formatStarRating(rating);

  if (lang === "darija") {
    return [
      "Shukran bzaf 3la avis dyalek !",
      "",
      `Note dyalek : ${stars}`,
      "",
      "Dghya cliqui 3la bouton bach tkteb avis dyalek direct f Google :",
      "",
      `Magasin : ${storeName}`,
    ].join("\n");
  }

  return [
    "Merci pour votre avis !",
    "",
    `Votre note : ${stars}`,
    "",
    "Cliquez sur le bouton ci-dessous pour publier votre avis directement sur Google :",
    "",
    `Magasin : ${storeName}`,
  ].join("\n");
}

export function googleReviewCtaLabel(lang: BotLanguage): string {
  return lang === "darija" ? "Avis Google" : "Laisser mon avis";
}
