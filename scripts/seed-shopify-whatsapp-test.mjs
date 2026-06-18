/**
 * Seed une commande Shopify test + envoi WhatsApp Kapso (bouton Confirmer).
 *
 * Usage : npm run seed:shopify-whatsapp
 *
 * Prérequis :
 * - npm run db:migrate (migration 041)
 * - KAPSO_* dans .env.local
 * - KAPSO_SANDBOX_OVERRIDE_TO = numéro Sandbox Kapso (ex. 0719750914)
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const KAPSO_API = "https://api.kapso.ai/meta/whatsapp/v24.0";

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

function formatCurrency(amount) {
  return `${Number(amount).toFixed(2).replace(".", ",")} DH`;
}

async function sendKapsoCtaUrlMessage({ apiKey, phoneNumberId, to, body, displayText, url }) {
  const apiUrl = `${KAPSO_API}/${phoneNumberId}/messages`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "cta_url",
        body: { text: body },
        action: {
          name: "cta_url",
          parameters: {
            display_text: displayText.slice(0, 20),
            url,
          },
        },
      },
    }),
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

async function sendKapsoTextMessage({ apiKey, phoneNumberId, to, body }) {
  const apiUrl = `${KAPSO_API}/${phoneNumberId}/messages`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

async function main() {
  const env = loadEnv();
  const apiKey = env.KAPSO_API_KEY?.trim();
  const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID?.trim();
  const sandboxTo = env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "0719750914";

  if (!apiKey || !phoneNumberId) {
    console.error("❌ KAPSO_API_KEY et KAPSO_PHONE_NUMBER_ID requis dans .env.local");
    process.exit(1);
  }

  const recipient = toWhatsAppRecipient(sandboxTo);
  if (!recipient) {
    console.error("❌ KAPSO_SANDBOX_OVERRIDE_TO invalide:", sandboxTo);
    process.exit(1);
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("is_active", true)
    .eq("name", "Natus Guéliz")
    .maybeSingle();

  if (!store) {
    console.error("❌ Magasin Natus Guéliz introuvable — lancez npm run db:migrate && npm run seed:users");
    process.exit(1);
  }

  const { data: products } = await supabase
    .from("products")
    .select("name, barcode, price")
    .order("name")
    .limit(3);

  if (!products?.length) {
    console.error("❌ Aucun produit en base");
    process.exit(1);
  }

  const lineItems = products.map((p, i) => ({
    id: 88000 + i,
    title: p.name,
    sku: p.barcode,
    quantity: i === 0 ? 2 : 1,
    price: String(p.price),
    variant_id: 880000 + i,
  }));

  const total = lineItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const trackingToken = randomUUID();
  const shopifyOrderId = 9000099000 + Math.floor(Math.random() * 999);
  const orderNumber = `#TEST${Date.now().toString().slice(-6)}`;
  const customerName = "Youssef Benali";
  const customerPhone = sandboxTo.startsWith("0") ? sandboxTo : `0${sandboxTo.slice(-9)}`;

  console.log("🛒 Création commande Shopify test…");
  console.log(`   Commande : ${orderNumber}`);
  console.log(`   Téléphone client (DB) : ${customerPhone}`);
  console.log(`   WhatsApp Sandbox → : ${recipient}`);

  const { data: order, error: insertError } = await supabase
    .from("shopify_orders")
    .insert({
      shopify_order_id: shopifyOrderId,
      order_number: orderNumber,
      store_id: store.id,
      city: "Marrakech",
      customer_name: customerName,
      customer_email: "test.whatsapp@example.com",
      customer_phone: customerPhone,
      shipping_address: "12 Rue de la Liberté, Guéliz, Marrakech",
      shipping_lat: 31.6345,
      shipping_lng: -8.0089,
      financial_status: "paid",
      fulfillment_status: null,
      order_status: "open",
      payment_type: "online",
      workflow_status: "preparing",
      payment_gateway: "shopify_payments",
      total,
      currency: "MAD",
      line_items: lineItems,
      shopify_created_at: new Date().toISOString(),
      tracking_token: trackingToken,
    })
    .select("id, order_number, tracking_token")
    .single();

  if (insertError) {
    if (insertError.message.includes("tracking_token")) {
      console.error(
        "❌ Colonne tracking_token manquante — lancez : npm run db:migrate"
      );
    } else {
      console.error("❌ Insert commande:", insertError.message);
    }
    process.exit(1);
  }

  const linesSummary = lineItems
    .map(
      (item) =>
        `• ${item.title} × ${item.quantity} — ${formatCurrency(Number(item.price) * item.quantity)}`
    )
    .join("\n");

  const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const messageBody = [
    `Bonjour ${customerName} 👋`,
    "",
    `Nous avons bien reçu votre commande Shopify ${orderNumber}.`,
    "",
    linesSummary,
    "",
    `Total : ${formatCurrency(total)}`,
  ].join("\n");

  const confirmUrl = `${appUrl.replace(/\/$/, "")}/commande/${order.tracking_token}/confirmer`;

  console.log("\n📱 Envoi WhatsApp Kapso (détails + bouton lien)…");

  const textResult = await sendKapsoTextMessage({
    apiKey,
    phoneNumberId,
    to: recipient,
    body: messageBody,
  });

  if (!textResult.ok) {
    console.error("❌ Kapso texte:", textResult.status, textResult.body);
    process.exit(1);
  }

  const result = await sendKapsoCtaUrlMessage({
    apiKey,
    phoneNumberId,
    to: recipient,
    body: "Appuyez sur le bouton pour confirmer votre commande.",
    displayText: "Confirmer",
    url: confirmUrl,
  });

  if (!result.ok) {
    console.error("❌ Kapso:", result.status, result.body);
    process.exit(1);
  }

  await supabase
    .from("shopify_orders")
    .update({ whatsapp_confirmation_sent_at: new Date().toISOString() })
    .eq("id", order.id);

  console.log("\n✅ Commande test créée + WhatsApp envoyé");
  console.log(`   ID commande : ${order.id}`);
  console.log(`   Token suivi : ${order.tracking_token}`);
  console.log(`   Lien suivi (après confirmation) : ${appUrl}/commande/${order.tracking_token}`);
  console.log(`   Dashboard : ${appUrl}/manager/orders ou /cashier/orders`);
  console.log(`\n👉 Sur WhatsApp (${sandboxTo}), cliquez le bouton « Confirmer » (2e message)`);
  console.log(`   Lien direct : ${confirmUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
