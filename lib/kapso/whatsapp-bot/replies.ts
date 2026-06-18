import type { CustomerOrderRow } from "@/lib/kapso/whatsapp-bot/orders";
import type { BotLanguage } from "@/lib/kapso/whatsapp-bot/language";
import { clientFirstName } from "@/lib/kapso/whatsapp-bot/language";
import { workflowStatusLabel } from "@/lib/shopify/order-status";
import { orderTrackingShortUrl } from "@/lib/short-url";
import type { ShopifyWorkflowStatus } from "@/lib/types";

/** « imta atwslni », « quand je reçois », etc. */
export function isDeliveryEtaQuestion(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(imta|qach|qachman|wa9tach|wa9ta)\b.*\b(atwsl|twsl|twasl|noussel|wsel|wsal)\b/i.test(t) ||
    /\b(quand|délai|delai|reçois|recois|livraison)\b/i.test(t) ||
    /متى|إمتى|غادي توصل|وقتاش/i.test(t)
  );
}

function etaByStatus(status: ShopifyWorkflowStatus, lang: BotLanguage): string {
  const fr: Record<string, string> = {
    pending: "Votre commande est enregistrée. Vous la recevrez sous 48 h après confirmation.",
    preparing:
      "Votre commande est en cours de préparation. Livraison estimée sous 48 h.",
    ready: "Votre commande est prête. Vous la recevrez sous 48 h.",
    shipping: "Votre commande est en livraison. Arrivée prévue très bientôt (sous 48 h max).",
    delivered: "Votre commande a déjà été livrée.",
    returned: "Votre commande est en retour. Un conseiller Natus vous contactera.",
    paid: "Votre commande est finalisée.",
    cancelled: "Votre commande a été annulée.",
  };

  const darija: Record<string, string> = {
    pending: "Commande dyalek tsjjelat. Ghadi twslk f 48 sa3a mn ba3d confirmation.",
    preparing: "Commande dyalek f préparation daba. Ghadi twslk f 48 sa3a.",
    ready: "Commande dyalek wajda. Ghadi twslk f 48 sa3a.",
    shipping: "Commande dyalek f livraison daba. Ghadi twslk 9rib (48 sa3a max).",
    delivered: "Commande dyalek wslat deja.",
    returned: "Commande dyalek rja3at retour. Conseiller Natus ghadi ycontactik.",
    paid: "Commande dyalek tkmlat.",
    cancelled: "Commande dyalek t annulat.",
  };

  const map = lang === "darija" ? darija : fr;
  return map[status] || (lang === "darija" ? "Ma3andnach ma3louma daba." : "Information indisponible.");
}

function statusLine(status: ShopifyWorkflowStatus, lang: BotLanguage): string {
  if (lang === "darija") {
    const map: Partial<Record<ShopifyWorkflowStatus, string>> = {
      pending: "f l'intizar",
      preparing: "f préparation",
      ready: "wajda",
      shipping: "f livraison",
      delivered: "wslat",
      returned: "retour",
      paid: "payée",
      cancelled: "annulée",
    };
    return map[status] || workflowStatusLabel(status);
  }
  return workflowStatusLabel(status);
}

export async function buildStructuredReply(
  order: CustomerOrderRow,
  lang: BotLanguage,
  opts: { etaQuestion?: boolean; problem?: boolean }
): Promise<string> {
  const name = clientFirstName(order.customer_name);
  const tracking = order.tracking_token
    ? await orderTrackingShortUrl(order.tracking_token)
    : null;

  if (opts.problem) {
    if (lang === "darija") {
      return name
        ? `${name}, smah lina! Commande ${order.order_number} — ghadi nchoufou m3ak d'urgence.`
        : `Smah lina! Commande ${order.order_number} — ghadi nchoufou m3ak d'urgence.`;
    }
    return name
      ? `${name}, nous sommes désolés. Commande ${order.order_number} — un conseiller Natus vous recontacte rapidement.`
      : `Nous sommes désolés. Commande ${order.order_number} — un conseiller Natus vous recontacte rapidement.`;
  }

  if (opts.etaQuestion) {
    const eta = etaByStatus(order.workflow_status, lang);
    if (lang === "darija") {
      const head = name ? `${name}, ${order.order_number}:` : `${order.order_number}:`;
      return tracking && order.workflow_status !== "delivered"
        ? `${head} ${eta}\nSuivi: ${tracking}`
        : `${head} ${eta}`;
    }
    const head = name ? `${name}, ${order.order_number} :` : `${order.order_number} :`;
    return tracking && order.workflow_status !== "delivered"
      ? `${head} ${eta}\nSuivi : ${tracking}`
      : `${head} ${eta}`;
  }

  const st = statusLine(order.workflow_status, lang);
  if (lang === "darija") {
    const head = name
      ? `${name}, commande ${order.order_number} daba ${st}.`
      : `Commande ${order.order_number} daba ${st}.`;
    return tracking ? `${head}\nSuivi: ${tracking}` : head;
  }

  const head = name
    ? `${name}, commande ${order.order_number} : ${st}.`
    : `Commande ${order.order_number} : ${st}.`;
  return tracking ? `${head}\nSuivi : ${tracking}` : head;
}

export function buildNoOrderReply(lang: BotLanguage): string {
  if (lang === "darija") {
    return "Ma lqina hta commande b had numéro. Jarb mn Shopify Natus wla 3iyet lina f magasin.";
  }
  return "Aucune commande récente avec ce numéro. Passez commande sur Shopify Natus ou contactez le magasin.";
}
