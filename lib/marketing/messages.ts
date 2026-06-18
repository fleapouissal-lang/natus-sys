import type { BotLanguage } from "@/lib/kapso/whatsapp-bot/language";
import { formatPromoExpiryFr } from "@/lib/marketing/promo-codes";
import type { StoreMarketing } from "@/lib/marketing/store-marketing";

export function winbackMessage(
  lang: BotLanguage,
  customerName: string,
  store: StoreMarketing,
  promoCode: string,
  promoExpiresAt: string
): string {
  const name = customerName.trim() || (lang === "darija" ? "" : "Client");
  const label = store.promo_label || "-10%";
  const geo = store.geo_offer_text || "";
  const expiry = formatPromoExpiryFr(promoExpiresAt);

  if (lang === "darija") {
    const head = name ? `${name}, bse7tek 3lina !` : "Bse7tek 3lina !";
    return [
      head,
      "",
      "Ma khdmnach m3ak mn 60 yom — nchoufou bghiti chi haja mn Natus.",
      "",
      `Promo dyalek : ${label} b code ${promoCode}`,
      `⏱ Code khass ytsala f 24h — valid hta ${expiry}`,
      geo ? geo : null,
      "",
      "Natus Cosmétiques",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const head = name ? `${name}, vous nous avez manqué !` : "Vous nous avez manqué !";
  return [
    head,
    "",
    "Cela fait un moment — redécouvrez Natus avec une offre spéciale :",
    "",
    `${label} avec le code ${promoCode}`,
    `⏱ Code valable 24h — expire le ${expiry}`,
    geo ? `📍 ${store.name} (${store.city}) — ${geo}` : null,
    "",
    "À bientôt chez Natus ✨",
  ]
    .filter(Boolean)
    .join("\n");
}

export function crossSellMessage(
  lang: BotLanguage,
  productName: string,
  productUrl: string,
  price: number,
  store: StoreMarketing
): string {
  const priceStr = `${Number(price).toFixed(2).replace(".", ",")} DH`;

  if (lang === "darija") {
    return [
      "3andna haja li ghadi t3jbek m3a achat dyalek :",
      "",
      `✨ ${productName} — ${priceStr}`,
      productUrl,
      "",
      store.geo_offer_text ? `📍 ${store.geo_offer_text}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Complétez votre routine Natus avec :",
    "",
    `✨ ${productName} — ${priceStr}`,
    productUrl,
    "",
    store.geo_offer_text ? `📍 Offre ${store.name} : ${store.geo_offer_text}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
