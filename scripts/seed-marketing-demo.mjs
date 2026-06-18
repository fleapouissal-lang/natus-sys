/**
 * Démo marketing — affiche des exemples de messages + envoi WhatsApp optionnel.
 *
 * Usage :
 *   npm run seed:marketing-demo              (exemples à l'écran)
 *   npm run seed:marketing-demo -- --whatsapp  (envoie 4 msgs démo sur sandbox)
 *
 * Prérequis : npm run db:migrate && npm run seed:users
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib/env.mjs";

const KAPSO_API = "https://api.kapso.ai/meta/whatsapp/v24.0";

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
  }
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 9 ? digits : null;
}

async function sendText({ apiKey, phoneNumberId, to, body }) {
  const res = await fetch(`${KAPSO_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

function formatPromoExpiryFr(isoDate) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

function exampleWinbackFr(store) {
  const code = "NATUS-K7M2P4";
  const expiry = formatPromoExpiryFr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return [
    "Youssef, vous nous avez manqué !",
    "",
    "Cela fait un moment — redécouvrez Natus avec une offre spéciale :",
    "",
    `${store.promo_label} avec le code ${code}`,
    `⏱ Code valable 24h — expire le ${expiry}`,
    `📍 ${store.name} (${store.city}) — ${store.geo_offer_text}`,
    "",
    "À bientôt chez Natus ✨",
  ].join("\n");
}

function exampleWinbackDarija(store) {
  const code = "NATUS-K7M2P4";
  const expiry = formatPromoExpiryFr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return [
    "Youssef, bse7tek 3lina !",
    "",
    "Ma khdmnach m3ak mn 60 yom — nchoufou bghiti chi haja mn Natus.",
    "",
    `Promo dyalek : ${store.promo_label} b code ${code}`,
    `⏱ Code khass ytsala f 24h — valid hta ${expiry}`,
    store.geo_offer_text,
    "",
    "Natus Cosmétiques",
  ].join("\n");
}

function exampleCrossSellFr(product, shortUrl, store) {
  return [
    "Complétez votre routine Natus avec :",
    "",
    `✨ ${product.name} — ${formatCurrency(Number(product.price))}`,
    shortUrl,
    "",
    `📍 Offre ${store.name} : ${store.geo_offer_text}`,
  ].join("\n");
}

function exampleGoogleReviewFr(store, rating = 4) {
  const stars = "⭐".repeat(rating);
  return [
    "Merci pour votre avis !",
    "",
    `Votre note : ${stars} (${rating}/5)`,
    "",
    "Cliquez sur le bouton ci-dessous pour publier votre avis directement sur Google :",
    "",
    `[ Bouton WhatsApp : Laisser mon avis → ${toDirectGoogleReviewUrl(store.google_review_url)} ]`,
    "",
    `Magasin : ${store.name}`,
  ].join("\n");
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

function printBlock(title, body) {
  console.log("\n" + "─".repeat(56));
  console.log(`📱 ${title}`);
  console.log("─".repeat(56));
  console.log(body);
}

async function main() {
  const sendWhatsApp = process.argv.includes("--whatsapp");
  const env = loadEnv();
  const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, city, google_review_url, promo_code, promo_label, geo_offer_text")
    .eq("is_active", true)
    .in("name", ["Natus Guéliz", "Natus Médina"]);

  const gueliz = stores?.find((s) => s.name.includes("Guéliz"));
  const medina = stores?.find((s) => s.name.includes("Médina"));

  if (!gueliz) {
    console.error("❌ Magasin Natus Guéliz introuvable — lancez npm run seed:users");
    process.exit(1);
  }

  const GOOGLE_GUELIZ =
    "https://www.google.com/maps/place/Natus+Marrakech+Gueliz/@31.6343832,-8.3152771,11z/data=!4m12!1m2!2m1!1snatus+marrakech+avis!3m8!1s0xdafee8e56ef5e69:0x22e615f0786def6a!8m2!3d31.6344872!4d-8.0103539!9m1!1b1!15sChRuYXR1cyBtYXJyYWtlY2ggYXZpcyICOAFaFiIUbmF0dXMgbWFycmFrZWNoIGF2aXOSAQ9jb3NsZXRpY3Nfc3RvcmXgAQA!16s%2Fg%2F11df0fndtm?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D";

  await supabase
    .from("stores")
    .update({
      google_review_url: GOOGLE_GUELIZ,
      promo_code: "NATUS10",
      promo_label: "-10%",
      geo_offer_text:
        "Offre Guéliz : livraison offerte dès 300 DH avec le code promo win-back",
    })
    .eq("id", gueliz.id);

  if (medina) {
    await supabase
      .from("stores")
      .update({
        google_review_url: "https://g.page/r/natus-medina-marrakech/review",
        promo_code: "MEDINA10",
        promo_label: "-10%",
        geo_offer_text:
          "Offre Médina : -10% sur votre prochain achat en magasin avec MEDINA10",
      })
      .eq("id", medina.id);
  }

  const { data: storeFresh } = await supabase
    .from("stores")
    .select("id, name, city, google_review_url, promo_code, promo_label, geo_offer_text")
    .eq("id", gueliz.id)
    .single();

  const store = storeFresh;

  const { data: parfum } = await supabase
    .from("products")
    .select("id, name, price, category, image_url")
    .eq("category", "Parfum")
    .limit(1)
    .maybeSingle();

  const { data: soin } = await supabase
    .from("products")
    .select("id, name, price, category")
    .eq("category", "Soin visage")
    .limit(1)
    .maybeSingle();

  let productShortUrl = `${appUrl}/produit/…`;
  if (soin?.id) {
    const { data: code } = await supabase.rpc("get_or_create_short_link", {
      p_kind: "product",
      p_token: soin.id,
    });
    if (code) productShortUrl = `${appUrl}/p/${code}`;
  }

  console.log("\n" + "═".repeat(56));
  console.log("  EXEMPLES MARKETING NATUS — Ce que reçoit le client");
  console.log("═".repeat(56));

  printBlock(
    "1️⃣  WIN-BACK (client inactif 60 jours) — Français · Guéliz",
    exampleWinbackFr(store)
  );

  printBlock(
    "1️⃣  WIN-BACK — Darija · Guéliz",
    exampleWinbackDarija(store)
  );

  if (medina) {
    const medinaOffer = {
      ...store,
      name: medina.name,
      city: medina.city,
      promo_code: "MEDINA10",
      geo_offer_text:
        "Offre Médina : -10% sur votre prochain achat en magasin avec MEDINA10",
    };
    printBlock(
      "5️⃣  OFFRE GÉOLOCALISÉE — Win-back Médina (autre ville/magasin)",
      exampleWinbackFr(medinaOffer)
    );
  }

  if (soin && parfum) {
    printBlock(
      `2️⃣  CROSS-SELL (après achat ${parfum.name}) → suggère ${soin.category}`,
      exampleCrossSellFr(soin, productShortUrl, store)
    );
  }

  printBlock(
    "3️⃣  AVIS GOOGLE (après clic « Très bien »)",
    exampleGoogleReviewFr(store)
  );

  if (soin) {
    printBlock(
      "4️⃣  STORY PRODUIT (page ouverte par le client)",
      [
        `Lien court WhatsApp : ${productShortUrl}`,
        `Page complète       : ${appUrl}/produit/${soin.id}`,
        "",
        "── Aperçu page ──",
        `[Photo produit]`,
        `${soin.category}`,
        `${soin.name}`,
        formatCurrency(Number(soin.price)),
        "",
        "Disponible en magasin Natus — Marrakech",
      ].join("\n")
    );
  }

  console.log("\n" + "═".repeat(56));
  console.log("  FLUX COMPLET (exemple commande Shopify parfum)");
  console.log("═".repeat(56));
  console.log(`
  1. Client confirme commande parfum
  2. → Cross-sell : crème / soin (lien /p/xxx)
  3. Commande livrée → +2h : « Comment avez-vous trouvé… ? »
  4. Client clique « Très bien » → lien avis Google Guéliz
  5. Si inactif 60 j → Win-back + code NATUS10
  `);

  if (sendWhatsApp) {
    const apiKey = env.KAPSO_API_KEY?.trim();
    const phoneNumberId = env.KAPSO_PHONE_NUMBER_ID?.trim();
    const sandboxTo = env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "0719750914";
    const recipient = toWhatsAppRecipient(sandboxTo);

    if (!apiKey || !phoneNumberId || !recipient) {
      console.warn("\n⚠️ --whatsapp ignoré (KAPSO_* manquant)");
    } else if (!soin) {
      console.warn("\n⚠️ Pas de produit Soin visage pour la démo cross-sell");
    } else {
      console.log(`\n📲 Envoi 4 messages démo → ${sandboxTo}…\n`);

      const demos = [
        { label: "Win-back", body: exampleWinbackFr(store) },
        {
          label: "Cross-sell",
          body: exampleCrossSellFr(
            soin,
            productShortUrl,
            store
          ),
        },
        { label: "Avis Google", body: exampleGoogleReviewFr(store) },
        {
          label: "Story produit (lien)",
          body: [
            "✨ Découvrez ce produit Natus :",
            "",
            `${soin.name} — ${formatCurrency(Number(soin.price))}`,
            productShortUrl,
          ].join("\n"),
        },
      ];

      for (const demo of demos) {
        const result = await sendText({
          apiKey,
          phoneNumberId,
          to: recipient,
          body: demo.body,
        });
        console.log(result.ok ? `   ✅ ${demo.label}` : `   ❌ ${demo.label} (${result.status})`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } else {
    console.log("\n💡 Pour recevoir ces exemples sur WhatsApp :");
    console.log("   npm run seed:marketing-demo -- --whatsapp");
  }

  console.log("\n🔗 Ouvrir story produit dans le navigateur :");
  console.log(`   ${productShortUrl}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
