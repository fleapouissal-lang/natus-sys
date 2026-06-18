/**
 * Seed complète marketing WhatsApp — win-back, cross-sell, avis étoiles, Google CTA.
 *
 * Usage :
 *   npm run seed:marketing-test
 *   npm run seed:marketing-test -- --whatsapp   (envoie les 4 msgs réels sur sandbox)
 *
 * Prérequis : npm run seed:users
 * Sandbox     : KAPSO_SANDBOX_OVERRIDE_TO dans .env.local (ex. 0719750914)
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const KAPSO_API = "https://api.kapso.ai/meta/whatsapp/v24.0";
const GOOGLE_GUELIZ =
  "https://www.google.com/maps/place/Natus+Marrakech+Gueliz/@31.6343832,-8.3152771,11z/data=!4m12!1m2!2m1!1snatus+marrakech+avis!3m8!1s0xdafee8e56ef5e69:0x22e615f0786def6a!8m2!3d31.6344872!4d-8.0103539!9m1!1b1!15sChRuYXR1cyBtYXJyYWtlY2ggYXZpcyICOAFaFiIUbmF0dXMgbWFycmFrZWNoIGF2aXOSAQ9jb3NsZXRpY3Nfc3RvcmXgAQA!16s%2Fg%2F11df0fndtm?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function formatCurrency(amount) {
  return `${Number(amount).toFixed(2).replace(".", ",")} DH`;
}

function formatPromoExpiryFr(isoDate) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function toWhatsAppRecipient(phone) {
  const clean = phone.trim().replace(/[^\d+]/g, "");
  if (!clean) return null;
  let normalized = clean;
  if (clean.startsWith("0") && clean.length === 10) {
    normalized = `+212${clean.slice(1)}`;
  } else if (clean.startsWith("212") && !clean.startsWith("+")) {
    normalized = `+${clean}`;
  } else if (!clean.startsWith("+") && clean.length === 9) {
    normalized = `+212${clean}`;
  }
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 9 ? digits : null;
}

function toLocalPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("212") && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 9) return `0${digits}`;
  return phone;
}

function randomPromoCode() {
  let seg = "";
  for (let i = 0; i < 6; i++) {
    seg += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return `NATUS-${seg}`;
}

function toDirectGoogleReviewUrl(mapsOrReviewUrl) {
  const url = mapsOrReviewUrl.trim();
  if (/search\.google\.com\/local\/writereview/i.test(url)) return url;
  const hexPlace = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i)?.[1];
  if (hexPlace) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(hexPlace)}`;
  }
  return url;
}

function winbackBody(store, firstName, promoCode, promoExpiresAt) {
  const expiry = formatPromoExpiryFr(promoExpiresAt);
  const name = firstName || "Client";
  return [
    `${name}, vous nous avez manqué !`,
    "",
    "Cela fait un moment — redécouvrez Natus avec une offre spéciale :",
    "",
    `${store.promo_label || "-10%"} avec le code ${promoCode}`,
    `⏱ Code valable 24h — expire le ${expiry}`,
    store.geo_offer_text ? `📍 ${store.name} (${store.city}) — ${store.geo_offer_text}` : "",
    "",
    "À bientôt chez Natus ✨",
  ]
    .filter(Boolean)
    .join("\n");
}

function crossSellBody(product, shortUrl, store) {
  return [
    "Complétez votre routine Natus avec :",
    "",
    `✨ ${product.name} — ${formatCurrency(Number(product.price))}`,
    shortUrl,
    "",
    store.geo_offer_text ? `📍 Offre ${store.name} : ${store.geo_offer_text}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function googleReviewCtaBody(rating, storeName) {
  const stars = "⭐".repeat(rating);
  return [
    "Merci pour votre avis !",
    "",
    `Votre note : ${stars} (${rating}/5)`,
    "",
    "Cliquez sur le bouton ci-dessous pour publier votre avis directement sur Google :",
    "",
    `Magasin : ${storeName}`,
  ].join("\n");
}

async function kapsoPost({ apiKey, phoneNumberId, to, payload }) {
  const res = await fetch(`${KAPSO_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      ...payload,
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function sendFeedbackButtons({ apiKey, phoneNumberId, to, body, orderId }) {
  return kapsoPost({
    apiKey,
    phoneNumberId,
    to,
    payload: {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body.slice(0, 1024) },
        action: {
          buttons: [
            {
              type: "reply",
              reply: { id: `natus_fb:good:order:${orderId}`, title: "Très bien" },
            },
            {
              type: "reply",
              reply: { id: `natus_fb:reclam:order:${orderId}`, title: "Réclamation" },
            },
          ],
        },
      },
    },
  });
}

async function sendCtaUrl({ apiKey, phoneNumberId, to, body, displayText, url }) {
  return kapsoPost({
    apiKey,
    phoneNumberId,
    to,
    payload: {
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: body.slice(0, 1024) },
        action: {
          name: "cta_url",
          parameters: {
            display_text: displayText.slice(0, 20),
            url,
          },
        },
      },
    },
  });
}

async function sendText({ apiKey, phoneNumberId, to, body }) {
  return kapsoPost({
    apiKey,
    phoneNumberId,
    to,
    payload: { type: "text", text: { body } },
  });
}

async function upsertTestCustomer(supabase, { phone, storeId, fullName }) {
  const { data: existing } = await supabase
    .from("customers")
    .select("id, full_name, card_number")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("customers")
      .update({
        full_name: fullName,
        store_id: storeId,
        whatsapp_winback_sent_at: null,
      })
      .eq("id", existing.id)
      .select("id, full_name, phone, card_number")
      .single();
    if (error) throw error;
    return data;
  }

  const suffix = Date.now().toString().slice(-6);
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: fullName,
      phone,
      email: `marketing.test.${suffix}@example.com`,
      card_number: `NATUS-MKT-${suffix}`,
      store_id: storeId,
      loyalty_points: 120,
    })
    .select("id, full_name, phone, card_number")
    .single();

  if (error) throw error;
  return data;
}

async function createWinbackPromo(supabase, customerId, storeId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomPromoCode();
    const { data, error } = await supabase
      .from("winback_promo_codes")
      .insert({
        code,
        customer_id: customerId,
        store_id: storeId,
        expires_at: expiresAt,
      })
      .select("code, expires_at")
      .single();

    if (!error && data) return data;
    if (error && !/unique|duplicate/i.test(error.message)) throw error;
  }

  throw new Error("Impossible de générer un code promo unique");
}

async function createSale(supabase, { cashierId, storeId, customerId, product, createdAt }) {
  const total = Number(product.price);
  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      cashier_id: cashierId,
      store_id: storeId,
      customer_id: customerId,
      total,
      payment_method: "card",
      loyalty_points_earned: 10,
      created_at: createdAt,
      whatsapp_cross_sell_sent_at: null,
      whatsapp_service_feedback_sent_at: null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: itemError } = await supabase.from("sale_items").insert({
    sale_id: sale.id,
    product_id: product.id,
    quantity: 1,
    unit_price: product.price,
  });

  if (itemError) throw itemError;
  return sale;
}

async function createShopifyOrder(supabase, {
  store,
  customerName,
  customerPhone,
  products,
  deliveredAt,
  feedbackSentAt,
  crossSellSentAt,
  orderNumber,
}) {
  const lineItems = products.map((p, i) => ({
    id: 88000 + i,
    title: p.name,
    sku: p.barcode,
    quantity: 1,
    price: String(p.price),
    variant_id: 880000 + i,
  }));
  const total = lineItems.reduce((s, i) => s + Number(i.price), 0);
  const trackingToken = randomUUID();

  const { data, error } = await supabase
    .from("shopify_orders")
    .insert({
      shopify_order_id: 8800000000 + Math.floor(Math.random() * 999999),
      order_number: orderNumber,
      store_id: store.id,
      city: store.city || "Marrakech",
      customer_name: customerName,
      customer_email: `mk.${Date.now()}@example.com`,
      customer_phone: customerPhone,
      shipping_address: "12 Rue de la Liberté, Guéliz, Marrakech",
      shipping_lat: 31.6345,
      shipping_lng: -8.0089,
      financial_status: "paid",
      fulfillment_status: "fulfilled",
      order_status: "closed",
      payment_type: "online",
      workflow_status: "delivered",
      payment_gateway: "shopify_payments",
      total,
      currency: "MAD",
      line_items: lineItems,
      shopify_created_at: hoursAgo(72),
      tracking_token: trackingToken,
      customer_confirmed_at: hoursAgo(48),
      whatsapp_confirmation_sent_at: hoursAgo(48),
      whatsapp_status_notifications: {
        preparing: hoursAgo(50),
        ready: hoursAgo(49),
        shipping: hoursAgo(48),
        delivered: deliveredAt,
      },
      whatsapp_delivery_feedback_sent_at: feedbackSentAt,
      whatsapp_cross_sell_sent_at: crossSellSentAt,
      loyalty_points_earned: 15,
    })
    .select("id, order_number, tracking_token")
    .single();

  if (error) throw error;
  return data;
}

async function main() {
  const sendWhatsApp = process.argv.includes("--whatsapp");
  const env = loadEnv();
  const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const sandboxRaw = env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "0719750914";
  const customerPhone = toLocalPhone(sandboxRaw);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\n" + "═".repeat(60));
  console.log("  SEED MARKETING WHATSAPP — Test complet");
  console.log("═".repeat(60));

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, city, google_review_url, promo_code, promo_label, geo_offer_text")
    .eq("is_active", true)
    .eq("name", "Natus Guéliz")
    .maybeSingle();

  if (!store) {
    console.error("\n❌ Magasin Natus Guéliz introuvable — lancez : npm run seed:users");
    process.exit(1);
  }

  await supabase
    .from("stores")
    .update({
      google_review_url: GOOGLE_GUELIZ,
      promo_code: "NATUS10",
      promo_label: "-10%",
      geo_offer_text:
        "Offre Guéliz : livraison offerte dès 300 DH avec le code promo win-back",
    })
    .eq("id", store.id);

  const { data: storeFresh } = await supabase
    .from("stores")
    .select("id, name, city, google_review_url, promo_code, promo_label, geo_offer_text")
    .eq("id", store.id)
    .single();

  const { data: cashier } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "cashier@natus.ma")
    .maybeSingle();

  if (!cashier) {
    console.error("\n❌ Profil cashier@natus.ma introuvable — lancez : npm run seed:users");
    process.exit(1);
  }

  const { data: parfum } = await supabase
    .from("products")
    .select("id, name, price, barcode, category")
    .eq("category", "Parfum")
    .limit(1)
    .maybeSingle();

  const { data: soin } = await supabase
    .from("products")
    .select("id, name, price, barcode, category, image_url")
    .eq("category", "Soin visage")
    .limit(1)
    .maybeSingle();

  if (!parfum || !soin) {
    console.error("\n❌ Produits Parfum + Soin visage requis — lancez : npm run seed:users");
    process.exit(1);
  }

  console.log("\n👤 Client test (sandbox WhatsApp)…");
  const customer = await upsertTestCustomer(supabase, {
    phone: customerPhone,
    storeId: storeFresh.id,
    fullName: "Youssef Benali",
  });
  console.log(`   ✅ ${customer.full_name} — ${customer.phone} (carte ${customer.card_number})`);

  console.log("\n🛍️ Ventes POS test…");
  const saleOld = await createSale(supabase, {
    cashierId: cashier.id,
    storeId: storeFresh.id,
    customerId: customer.id,
    product: parfum,
    createdAt: daysAgo(70),
  });
  console.log(`   ✅ Vente ${saleOld.id.slice(0, 8)}… — il y a 70 j (éligible win-back)`);

  const saleRecent = await createSale(supabase, {
    cashierId: cashier.id,
    storeId: storeFresh.id,
    customerId: customer.id,
    product: parfum,
    createdAt: hoursAgo(6),
  });
  console.log(`   ✅ Vente ${saleRecent.id.slice(0, 8)}… — il y a 6 h (cross-sell POS)`);

  console.log("\n🎟️ Code promo win-back unique (24h)…");
  const promo = await createWinbackPromo(supabase, customer.id, storeFresh.id);
  console.log(`   ✅ ${promo.code} — expire ${formatPromoExpiryFr(promo.expires_at)}`);

  const suffix = Date.now().toString().slice(-5);
  console.log("\n📦 Commandes Shopify test…");

  const orderFeedback = await createShopifyOrder(supabase, {
    store: storeFresh,
    customerName: customer.full_name,
    customerPhone,
    products: [parfum],
    deliveredAt: hoursAgo(3),
    feedbackSentAt: null,
    crossSellSentAt: null,
    orderNumber: `#MK-FB-${suffix}`,
  });
  console.log(`   ✅ ${orderFeedback.order_number} — livrée, avis WhatsApp pas encore envoyé`);

  const orderCrossSell = await createShopifyOrder(supabase, {
    store: storeFresh,
    customerName: customer.full_name,
    customerPhone,
    products: [parfum],
    deliveredAt: hoursAgo(30),
    feedbackSentAt: hoursAgo(28),
    crossSellSentAt: null,
    orderNumber: `#MK-XS-${suffix}`,
  });
  console.log(`   ✅ ${orderCrossSell.order_number} — cross-sell Shopify éligible`);

  console.log("\n⭐ Avis WhatsApp enregistrés (exemples)…");
  await supabase.from("customer_whatsapp_reviews").delete().eq("customer_phone", customerPhone);

  const sampleReviews = [
    { rating: 5, message: "⭐⭐⭐⭐⭐ Service parfait !" },
    { rating: 4, message: "⭐⭐⭐⭐ Très bon produit" },
    { rating: 3, message: "⭐⭐⭐ Correct" },
  ];

  for (const r of sampleReviews) {
    await supabase.from("customer_whatsapp_reviews").insert({
      store_id: storeFresh.id,
      customer_phone: customerPhone,
      customer_name: customer.full_name,
      rating: r.rating,
      message: r.message,
      sale_id: saleRecent.id,
    });
    console.log(`   ✅ ${r.message}`);
  }

  const { data: productCode } = await supabase.rpc("get_or_create_short_link", {
    p_kind: "product",
    p_token: soin.id,
  });
  const productShortUrl = productCode ? `${appUrl}/p/${productCode}` : `${appUrl}/produit/${soin.id}`;

  const googleReviewUrl = toDirectGoogleReviewUrl(storeFresh.google_review_url);

  console.log("\n" + "─".repeat(60));
  console.log("  GUIDE DE TEST");
  console.log("─".repeat(60));
  console.log(`
📱 Numéro sandbox : ${customerPhone}
   (KAPSO_SANDBOX_OVERRIDE_TO dans .env.local)

1️⃣  WIN-BACK (60 j sans achat)
   • Client éligible : ${customer.full_name}
   • Code promo seed : ${promo.code} (expire 24h)
   • Forcer le cron :
     curl -H "Authorization: Bearer \$CRON_SECRET" ${appUrl}/api/cron/winback

2️⃣  CROSS-SELL (après achat parfum → soin visage)
   • Vente POS récente : ${saleRecent.id.slice(0, 8)}…
   • Commande Shopify : ${orderCrossSell.order_number}
   • Lien produit : ${productShortUrl}

3️⃣  AVIS LIVRAISON (boutons Très bien / Réclamation)
   • Commande : ${orderFeedback.order_number}
   • Cron avis 2h après livraison :
     curl -H "Authorization: Bearer \$CRON_SECRET" ${appUrl}/api/cron/delivery-feedback
   • Ou : npm run seed:marketing-test -- --whatsapp

4️⃣  AVIS ÉTOILES + GOOGLE (texte WhatsApp)
   • Envoyez au bot : ⭐⭐⭐⭐⭐
   • Ou : ⭐⭐⭐ (3 étoiles)
   • Réponse : note exacte + bouton « Laisser mon avis » → Google
   • URL directe : ${googleReviewUrl}

5️⃣  STORY PRODUIT
   • ${productShortUrl}
   • ${appUrl}/produit/${soin.id}

6️⃣  RÉCLAMATIONS (dashboard gérant)
   • ${appUrl}/manager/reclamations
   • Login : manager@natus.ma / Natus2026!

7️⃣  PAGE AVIS GOOGLE (site public natusmarrakech.com)
   • FR : ${appUrl}/avis-google
   • EN : ${appUrl}/EN/google-reviews
   • Lien à ajouter sur https://natusmarrakech.com/EN
`);

  if (sendWhatsApp) {
    const apiKey = env.KAPSO_API_KEY?.trim();
    const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID?.trim();
    const recipient = toWhatsAppRecipient(sandboxRaw);

    if (!apiKey || !phoneNumberId || !recipient) {
      console.warn("\n⚠️ --whatsapp ignoré : KAPSO_API_KEY / KAPSO_PHONE_NUMBER_ID manquant");
    } else {
      console.log("\n📲 Envoi 4 messages WhatsApp réels (sandbox)…\n");

      const steps = [
        {
          label: "Win-back + code promo 24h",
          run: () =>
            sendText({
              apiKey,
              phoneNumberId,
              to: recipient,
              body: winbackBody(
                storeFresh,
                "Youssef",
                promo.code,
                promo.expires_at
              ),
            }),
        },
        {
          label: "Cross-sell soin visage",
          run: () =>
            sendText({
              apiKey,
              phoneNumberId,
              to: recipient,
              body: crossSellBody(soin, productShortUrl, storeFresh),
            }),
        },
        {
          label: "Avis livraison (boutons)",
          run: () =>
            sendFeedbackButtons({
              apiKey,
              phoneNumberId,
              to: recipient,
              body: [
                `Bonjour Youssef, comment avez-vous trouvé votre commande ${orderFeedback.order_number} ?`,
                "",
                "Merci de nous dire si tout s'est bien passé :",
              ].join("\n"),
              orderId: orderFeedback.id,
            }),
        },
        {
          label: "Avis Google CTA (4 étoiles)",
          run: () =>
            sendCtaUrl({
              apiKey,
              phoneNumberId,
              to: recipient,
              body: googleReviewCtaBody(4, storeFresh.name),
              displayText: "Laisser mon avis",
              url: googleReviewUrl,
            }),
        },
      ];

      for (const step of steps) {
        const result = await step.run();
        console.log(
          result.ok
            ? `   ✅ ${step.label}`
            : `   ❌ ${step.label} (${result.status}) ${result.body.slice(0, 120)}`
        );
        await new Promise((r) => setTimeout(r, 2000));
      }

      await supabase
        .from("shopify_orders")
        .update({ whatsapp_delivery_feedback_sent_at: new Date().toISOString() })
        .eq("id", orderFeedback.id);

      console.log(`
💬 Tests manuels sur WhatsApp :
   • Cliquez « Très bien » → bouton Google avis
   • Cliquez « Réclamation » → saisissez votre plainte
   • Envoyez un message : ⭐⭐⭐⭐⭐
   • Envoyez : réclamation (sans détail)
`);
    }
  } else {
    console.log("💡 Recevoir les 4 messages sur WhatsApp :");
    console.log("   npm run seed:marketing-test -- --whatsapp");
  }

  console.log("\n✅ Seed marketing terminée.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
