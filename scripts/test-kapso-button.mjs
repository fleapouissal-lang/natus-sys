import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

loadEnv();

const apiKey = process.env.KAPSO_API_KEY?.trim();
const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID?.trim();
const to = "212719750914";

async function send(payload, label) {
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        ...payload,
      }),
    }
  );
  const text = await res.text();
  console.log(`--- ${label} status ${res.status}`);
  console.log(text);
}

await send(
  {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: "Confirmer votre commande ?" },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "test_btn_min", title: "Confirmer" },
          },
        ],
      },
    },
  },
  "minimal button"
);

await send(
  {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: [
          "Bonjour Client Test WhatsApp 👋",
          "",
          "Nous avons bien reçu votre commande Shopify #TEST549938.",
          "",
          "• Crème hydratante visage × 2 — 59,80 DH",
          "• Eau micellaire × 1 — 15,90 DH",
          "• Mascara volume × 1 — 18,90 DH",
          "",
          "Total : 94,60 DH",
          "",
          "Merci de confirmer votre commande en cliquant ci-dessous :",
        ].join("\n"),
      },
      action: {
        buttons: [
          {
            type: "reply",
            reply: { id: "test_btn_long", title: "Confirmer" },
          },
        ],
      },
    },
  },
  "long body (same as seed)"
);
