/**
 * Seed commandes Shopify livrées + réclamations test (dashboard gérant).
 *
 * Usage :
 *   npm run seed:shopify-feedback
 *   npm run seed:shopify-feedback -- --whatsapp   (envoie aussi le msg avis WhatsApp)
 *
 * Prérequis : npm run db:migrate && npm run seed:users
 *
 * Connexion gérant : manager@natus.ma / Natus2026!
 * Dashboard : /manager/reclamations
 */
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const KAPSO_API = "https://api.kapso.ai/meta/whatsapp/v24.0";

function hoursAgo(h) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function formatCurrency(amount) {
  return `${Number(amount).toFixed(2).replace(".", ",")} DH`;
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

async function sendFeedbackWhatsApp({ apiKey, phoneNumberId, to, body, orderId }) {
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
    }),
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

async function main() {
  const sendWhatsApp = process.argv.includes("--whatsapp");
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, city")
    .eq("is_active", true)
    .eq("name", "Natus Guéliz")
    .maybeSingle();

  if (!store) {
    console.error("❌ Magasin Natus Guéliz introuvable — lancez npm run seed:users");
    process.exit(1);
  }

  const { data: products } = await supabase
    .from("products")
    .select("name, barcode, price")
    .order("name")
    .limit(2);

  if (!products?.length) {
    console.error("❌ Aucun produit en base");
    process.exit(1);
  }

  const sandboxTo = env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "0719750914";
  const customerPhone = sandboxTo.startsWith("0") ? sandboxTo : `0${sandboxTo.slice(-9)}`;

  const lineItems = products.map((p, i) => ({
    id: 99000 + i,
    title: p.name,
    sku: p.barcode,
    quantity: 1,
    price: String(p.price),
    variant_id: 990000 + i,
  }));

  const total = lineItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const delivered3h = hoursAgo(3);
  const delivered1d = hoursAgo(26);
  const suffix = Date.now().toString().slice(-6);

  const ordersSpec = [
    {
      label: "Commande livrée (avis WhatsApp pas encore envoyé — éligible cron 2h)",
      orderNumber: `#FB-PENDING-${suffix}`,
      customerName: "Youssef Benali",
      customerPhone,
      deliveredAt: delivered3h,
      feedbackSentAt: null,
      confirmedAt: hoursAgo(48),
    },
    {
      label: "Commande livrée (avis déjà demandé + réclamation)",
      orderNumber: `#FB-RECLAM-${suffix}`,
      customerName: "Sara Alami",
      customerPhone: "0661122334",
      deliveredAt: delivered1d,
      feedbackSentAt: hoursAgo(24),
      confirmedAt: hoursAgo(72),
    },
    {
      label: "Commande livrée (réclamation traitée)",
      orderNumber: `#FB-DONE-${suffix}`,
      customerName: "Karim Bennani",
      customerPhone: "0677889900",
      deliveredAt: hoursAgo(96),
      feedbackSentAt: hoursAgo(94),
      confirmedAt: hoursAgo(120),
    },
  ];

  console.log("🛒 Création commandes Shopify livrées (test avis / réclamations)…\n");

  const createdOrders = [];

  for (const spec of ordersSpec) {
    const trackingToken = randomUUID();
    const shopifyOrderId = 9100099000 + Math.floor(Math.random() * 99999);
    const notifications = {
      preparing: hoursAgo(50),
      ready: hoursAgo(49),
      shipping: hoursAgo(48),
      delivered: spec.deliveredAt,
    };

    const { data: order, error } = await supabase
      .from("shopify_orders")
      .insert({
        shopify_order_id: shopifyOrderId,
        order_number: spec.orderNumber,
        store_id: store.id,
        city: store.city || "Marrakech",
        customer_name: spec.customerName,
        customer_email: `test.${suffix}@example.com`,
        customer_phone: spec.customerPhone,
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
        customer_confirmed_at: spec.confirmedAt,
        whatsapp_confirmation_sent_at: spec.confirmedAt,
        whatsapp_status_notifications: notifications,
        whatsapp_delivery_feedback_sent_at: spec.feedbackSentAt,
        loyalty_points_earned: 15,
      })
      .select("id, order_number, tracking_token")
      .single();

    if (error) {
      console.error(`❌ ${spec.orderNumber}:`, error.message);
      process.exit(1);
    }

    createdOrders.push({ ...spec, ...order });
    console.log(`   ✅ ${spec.orderNumber} — ${spec.label}`);
  }

  const [orderPending, orderReclam, orderDone] = createdOrders;

  const complaints = [
    {
      store_id: store.id,
      source: "shopify_delivery",
      shopify_order_id: orderReclam.id,
      sale_id: null,
      customer_phone: orderReclam.customerPhone,
      customer_name: orderReclam.customerName,
      message:
        "Colis abîmé à la livraison — le flacon de parfum a coulé dans le carton.",
      status: "new",
    },
    {
      store_id: store.id,
      source: "shopify_delivery",
      shopify_order_id: orderPending.id,
      sale_id: null,
      customer_phone: orderPending.customerPhone,
      customer_name: orderPending.customerName,
      message: "Retard de livraison — commande arrivée avec 1 jour de retard.",
      status: "new",
    },
    {
      store_id: store.id,
      source: "shopify_delivery",
      shopify_order_id: orderDone.id,
      sale_id: null,
      customer_phone: orderDone.customerPhone,
      customer_name: orderDone.customerName,
      message: "Produit manquant dans le colis (1 article sur 2 absent).",
      status: "resolved",
      resolved_at: hoursAgo(48),
    },
  ];

  console.log("\n📋 Insertion réclamations test…");

  const { data: insertedComplaints, error: complaintsError } = await supabase
    .from("store_complaints")
    .insert(complaints)
    .select("id, status, message");

  if (complaintsError) {
    console.error("❌ store_complaints:", complaintsError.message);
    process.exit(1);
  }

  for (const c of insertedComplaints || []) {
    console.log(`   ✅ [${c.status}] ${c.message.slice(0, 60)}…`);
  }

  if (sendWhatsApp) {
    const apiKey = env.KAPSO_API_KEY?.trim();
    const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID?.trim();
    const recipient = toWhatsAppRecipient(sandboxTo);

    if (!apiKey || !phoneNumberId || !recipient) {
      console.warn("\n⚠️ --whatsapp ignoré (KAPSO_* ou sandbox invalide)");
    } else {
      const body = [
        `Bonjour Youssef, comment avez-vous trouvé votre commande ${orderPending.orderNumber} ?`,
        "",
        "Merci de nous dire si tout s'est bien passé :",
      ].join("\n");

      console.log("\n📱 Envoi message avis WhatsApp (commande éligible)…");
      const result = await sendFeedbackWhatsApp({
        apiKey,
        phoneNumberId,
        to: recipient,
        body,
        orderId: orderPending.id,
      });

      if (result.ok) {
        await supabase
          .from("shopify_orders")
          .update({ whatsapp_delivery_feedback_sent_at: new Date().toISOString() })
          .eq("id", orderPending.id);
        console.log("   ✅ Message avis envoyé — testez « Très bien » ou « Réclamation »");
      } else {
        console.error("   ❌ Kapso:", result.status, result.body.slice(0, 200));
      }
    }
  }

  console.log("\n" + "═".repeat(56));
  console.log("✅ Seed avis / réclamations terminé");
  console.log("═".repeat(56));
  console.log(`\n📊 Dashboard gérant : ${appUrl}/manager/reclamations`);
  console.log("   Login : manager@natus.ma / Natus2026!");
  console.log(`   Magasin livraison : ${store.name} (${store.city})`);
  console.log("\n📦 Commandes créées :");
  console.log(`   • ${orderPending.orderNumber} → avis WhatsApp PAS encore envoyé (cron 2h)`);
  console.log(`   • ${orderReclam.orderNumber} → réclamation NOUVELLE (colis abîmé)`);
  console.log(`   • ${orderDone.orderNumber} → réclamation TRAITÉE`);
  console.log("\n💡 Réclamations visibles : 2 nouvelles + 1 traitée");
  console.log("   Les avis « Très bien » ne créent pas de ligne dashboard.");
  console.log("\n🔁 Tester le msg avis WhatsApp :");
  console.log("   npm run seed:shopify-feedback -- --whatsapp");
  console.log("\n⏱ Forcer le cron avis 2h (local) :");
  console.log(`   curl -H "Authorization: Bearer $CRON_SECRET" ${appUrl}/api/cron/delivery-feedback`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
