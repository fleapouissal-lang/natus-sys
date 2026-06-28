import type { CustomerOrderRow } from "@/lib/kapso/whatsapp-bot/orders";
import {
  isDarijaOrderStatusQuestion,
  isDarijaProblem,
} from "@/lib/kapso/whatsapp-bot/darija";
import {
  clientFirstName,
  detectConversationLanguage,
  type BotLanguage,
} from "@/lib/kapso/whatsapp-bot/language";
import {
  buildNoOrderReply,
  buildStructuredReply,
  isDeliveryEtaQuestion,
} from "@/lib/kapso/whatsapp-bot/replies";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import { orderTrackingShortUrl } from "@/lib/short-url";

export type ChatTurn = { role: "user" | "model"; text: string };

export type GeminiBotResult = {
  reply: string;
  logProblem: boolean;
};

function getGeminiConfig(): { apiKey: string; model: string } | null {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
  };
}

async function buildOrderContext(order: CustomerOrderRow | null): Promise<string> {
  if (!order) {
    return "Aucune commande récente liée à ce numéro WhatsApp.";
  }
  const tracking = order.tracking_token
    ? await orderTrackingShortUrl(order.tracking_token)
    : null;
  const firstName = clientFirstName(order.customer_name);
  return [
    `Prénom client (utiliser en réponse) : ${firstName || order.customer_name || "—"}`,
    `Commande : ${order.order_number}`,
    `Statut actuel : ${workflowStatusLabel(order.workflow_status)}`,
    `Total : ${order.total} MAD`,
    tracking ? `Lien suivi : ${tracking}` : null,
    "",
    "Règles délai livraison (si client demande quand il reçoit) :",
    "- pending / preparing / ready → livraison sous 48 h",
    "- shipping → très bientôt, max 48 h",
    "- delivered → déjà livrée",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

const SYSTEM_PROMPT = `Tu es l'assistant WhatsApp de Natus (parfumerie, Maroc).

LANGUE — règle stricte :
- UNE SEULE langue par message : darija OU français, jamais les deux mélangés.
- Darija si le client écrit en darija (latin ou arabe). Français sinon.
- Garde la même langue que l'historique de conversation.

PRÉNOM :
- Commence par le prénom du client (fourni dans le contexte). Jamais « Salam Client » ni « khouya/khtii ».
- Ex. darija : « Youssef, commande #TEST123 daba f préparation. Ghadi twslk f 48 sa3a. »
- Ex. français : « Youssef, votre commande #TEST123 est en préparation. Livraison sous 48 h. »

Comprends le darija : « fin wslat commande dyli », « imta atwslni commande », « wach wslat », etc.

Délai livraison (imta atwslni / quand je reçois) :
- preparing, pending, ready → réponse : livraison sous 48 h
- shipping → en livraison, très bientôt (48 h max)
- delivered → déjà livrée

Messages courts (2-4 lignes). Pas de questions inutiles. Infos commande = vérité uniquement.

JSON uniquement :
{"reply":"...","log_problem":false}`;

export async function generateCustomerReply(
  userMessage: string,
  order: CustomerOrderRow | null,
  history: ChatTurn[]
): Promise<GeminiBotResult | null> {
  const config = getGeminiConfig();
  if (!config) return null;

  const lang = detectConversationLanguage(userMessage, history);
  const orderBlock = await buildOrderContext(order);
  const historyBlock =
    history.length > 0
      ? history
          .slice(-6)
          .map((t) => `${t.role === "user" ? "Client" : "Natus"} : ${t.text}`)
          .join("\n")
      : "(premier message)";

  const userPrompt = [
    `Langue à utiliser pour la réponse : ${lang === "darija" ? "darija uniquement" : "français uniquement"}`,
    "",
    "=== Commande client ===",
    orderBlock,
    "",
    "=== Historique récent ===",
    historyBlock,
    "",
    "=== Nouveau message client ===",
    userMessage,
  ].join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 400,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.error("[Kapso bot] Gemini:", response.status, err.slice(0, 300));
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { reply?: string; log_problem?: boolean };
    const reply = parsed.reply?.trim();
    if (!reply) return null;

    return {
      reply: reply.slice(0, 1200),
      logProblem: Boolean(parsed.log_problem),
    };
  } catch (error) {
    console.error("[Kapso bot] Gemini:", error);
    return null;
  }
}

export async function fallbackReply(
  userMessage: string,
  order: CustomerOrderRow | null,
  history: ChatTurn[] = []
): Promise<GeminiBotResult> {
  const lang: BotLanguage = detectConversationLanguage(userMessage, history);

  if (!order) {
    return { reply: buildNoOrderReply(lang), logProblem: false };
  }

  const isProblem =
    isDarijaProblem(userMessage) ||
    /probl|retard|r[eé]clam|pas re[cç]u|colis|ab[iî]m|cass/i.test(userMessage.toLowerCase());

  const etaQ = isDeliveryEtaQuestion(userMessage);
  const statusQ =
    isDarijaOrderStatusQuestion(userMessage) ||
    /état|statut|commande|suivi|where|status/i.test(userMessage.toLowerCase());

  return {
    reply: await buildStructuredReply(order, lang, {
      problem: isProblem,
      etaQuestion: etaQ || statusQ,
    }),
    logProblem: isProblem,
  };
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiConfig());
}
