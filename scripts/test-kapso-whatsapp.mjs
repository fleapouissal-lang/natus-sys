/**
 * Test envoi WhatsApp Kapso — usage : node scripts/test-kapso-whatsapp.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
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
  return normalized.replace(/\D/g, "");
}

loadEnv();

const apiKey = process.env.KAPSO_API_KEY?.trim();
const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID?.trim();
const toRaw =
  process.env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "0719750914";
const to = toWhatsAppRecipient(toRaw);

if (!apiKey || !phoneNumberId || !to) {
  console.error("Config manquante:", { apiKey: !!apiKey, phoneNumberId, toRaw, to });
  process.exit(1);
}

console.log("Envoi test Kapso...");
console.log("  Phone Number ID:", phoneNumberId);
console.log("  Destinataire:", to, `(depuis ${toRaw})`);

const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: {
      body: "Test Natus POS — si vous recevez ceci, Kapso fonctionne ✅",
    },
  }),
});

const body = await res.text();
console.log("Status:", res.status);
console.log("Réponse:", body);
