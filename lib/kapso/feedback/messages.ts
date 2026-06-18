import { getKapsoConfig } from "@/lib/kapso/config";
import { sendKapsoButtonMessage, sendKapsoTextMessage } from "@/lib/kapso/client";
import { resolveKapsoRecipient } from "@/lib/kapso/recipient";
import {
  buildFeedbackButtonId,
  type FeedbackTargetKind,
} from "@/lib/kapso/feedback/constants";
import {
  clientFirstName,
  detectConversationLanguage,
  type BotLanguage,
} from "@/lib/kapso/whatsapp-bot/language";
import type { ChatTurn } from "@/lib/kapso/whatsapp-bot/gemini";

function feedbackCopy(
  lang: BotLanguage,
  kind: FeedbackTargetKind,
  customerName: string,
  orderNumber?: string
): { body: string; goodTitle: string; reclamTitle: string } {
  const name = customerName || (lang === "darija" ? "" : "Client");

  if (kind === "order") {
    if (lang === "darija") {
      return {
        body: name
          ? `${name}, kifach lqiti commande ${orderNumber || "dyalek"} ?`
          : `Kifach lqiti commande ${orderNumber || "dyalek"} ?`,
        goodTitle: "Mzyan",
        reclamTitle: "Réclamation",
      };
    }
    return {
      body: name
        ? `${name}, comment avez-vous trouvé votre commande ${orderNumber || ""} ?`
        : `Comment avez-vous trouvé votre commande ${orderNumber || ""} ?`,
      goodTitle: "Très bien",
      reclamTitle: "Réclamation",
    };
  }

  if (lang === "darija") {
    return {
      body: name
        ? `${name}, chno raeyk f service dyalna f magasin ?`
        : "Chno raeyk f service dyalna f magasin ?",
      goodTitle: "Mzyan",
      reclamTitle: "Réclamation",
    };
  }

  return {
    body: name
      ? `${name}, que pensez-vous de notre service en magasin ?`
      : "Que pensez-vous de notre service en magasin ?",
    goodTitle: "Très bien",
    reclamTitle: "Réclamation",
  };
}

export function thankYouMessage(lang: BotLanguage): string {
  return lang === "darija"
    ? "Shukran bzaf 3la avis dyalek — Natus"
    : "Merci pour votre avis — Natus";
}

export function askReclamationMessage(lang: BotLanguage): string {
  return lang === "darija"
    ? "Chno hiya réclamation dyalek ? Ktebha f chi jomlha :"
    : "Quelle est votre réclamation ? Décrivez-la en quelques mots :";
}

export function reclamationReceivedMessage(lang: BotLanguage): string {
  return lang === "darija"
    ? "Tslamna réclamation dyalek. Gérant dyal magasin ghadi ycontactik."
    : "Nous avons bien reçu votre réclamation. Le gérant du magasin vous recontactera.";
}

export async function sendFeedbackPrompt(
  recipientPhone: string,
  input: {
    kind: FeedbackTargetKind;
    resourceId: string;
    customerName: string;
    orderNumber?: string;
    history?: ChatTurn[];
  }
): Promise<boolean> {
  const config = getKapsoConfig();
  if (!config) return false;

  const recipient = resolveKapsoRecipient(recipientPhone);
  if (!recipient) return false;

  const lang = detectConversationLanguage("", input.history ?? []);
  const copy = feedbackCopy(
    lang,
    input.kind,
    clientFirstName(input.customerName) || input.customerName,
    input.orderNumber
  );

  const result = await sendKapsoButtonMessage(config, recipient, copy.body, [
    {
      id: buildFeedbackButtonId("good", input.kind, input.resourceId),
      title: copy.goodTitle,
    },
    {
      id: buildFeedbackButtonId("reclam", input.kind, input.resourceId),
      title: copy.reclamTitle,
    },
  ]);

  return result.ok;
}

export async function sendFeedbackText(
  recipientPhone: string,
  body: string
): Promise<boolean> {
  const config = getKapsoConfig();
  if (!config) return false;
  const recipient = resolveKapsoRecipient(recipientPhone);
  if (!recipient) return false;
  const result = await sendKapsoTextMessage(config, recipient, body);
  return result.ok;
}
