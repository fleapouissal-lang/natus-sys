import { createAdminClient } from "@/lib/supabase/admin";
import {
  getKapsoConfig,
  getKapsoTemplateConfig,
  isKapsoSandboxMode,
} from "@/lib/kapso/config";
import { sendKapsoTemplateMessage, sendKapsoTextMessage } from "@/lib/kapso/client";
import { toWhatsAppRecipient } from "@/lib/kapso/phone";
import { getCustomerByPhone } from "@/lib/loyalty/customers";
import { formatCurrency } from "@/lib/utils";
import type { ShopifyLineItemRow } from "@/lib/types";

type SaleLine = {
  name: string;
  quantity: number;
  lineTotal: number;
};

type LoyaltySummary = {
  pointsEarned?: number;
  totalPoints?: number;
  pointsRedeemed?: number;
  discount?: number;
};

function appendLoyaltyLines(lines: string[], loyalty: LoyaltySummary | null) {
  if (!loyalty) return;
  lines.push("");
  if (loyalty.pointsEarned != null) {
    lines.push(
      loyalty.pointsEarned > 0
        ? `⭐ Points gagnés : +${loyalty.pointsEarned}`
        : "⭐ Points gagnés : 0"
    );
  }
  if (loyalty.totalPoints != null) {
    lines.push(`🏆 Total points fidélité : ${loyalty.totalPoints}`);
  }
  if (loyalty.pointsRedeemed && loyalty.pointsRedeemed > 0) {
    lines.push(`Points utilisés : -${loyalty.pointsRedeemed}`);
  }
}

export function buildPurchaseWhatsAppMessage(input: {
  customerName: string;
  storeName?: string | null;
  orderLabel: string;
  lines: SaleLine[];
  total: number;
  loyalty?: LoyaltySummary | null;
}): string {
  const messageLines: string[] = [
    `Bonjour ${input.customerName} 👋`,
    "",
    "Merci pour votre achat chez Natus !",
    input.orderLabel,
  ];

  if (input.storeName) {
    messageLines.push(`Magasin : ${input.storeName}`);
  }

  messageLines.push("", "📦 Détails de la commande :");
  for (const line of input.lines) {
    messageLines.push(
      `• ${line.name} × ${line.quantity} — ${formatCurrency(line.lineTotal)}`
    );
  }

  messageLines.push("", `💰 Total : ${formatCurrency(input.total)}`);

  if (input.loyalty?.discount && input.loyalty.discount > 0) {
    messageLines.push(
      `Réduction fidélité : -${formatCurrency(input.loyalty.discount)}`
    );
  }

  appendLoyaltyLines(messageLines, input.loyalty ?? null);
  messageLines.push("", "À bientôt chez Natus ✨");
  return messageLines.join("\n");
}

function buildOrderSummaryText(lines: SaleLine[]): string {
  const text = lines
    .map((line) => `${line.name} × ${line.quantity} — ${formatCurrency(line.lineTotal)}`)
    .join("\n");
  if (text.length <= 900) return text;
  return `${text.slice(0, 897)}...`;
}

function resolveWhatsAppRecipient(customerPhone: string): string | null {
  if (isKapsoSandboxMode()) {
    const override = process.env.KAPSO_SANDBOX_OVERRIDE_TO!.trim();
    const recipient = toWhatsAppRecipient(override);
    if (recipient) {
      console.info("[Kapso] mode SANDBOX — envoi vers KAPSO_SANDBOX_OVERRIDE_TO");
      return recipient;
    }
  }
  return toWhatsAppRecipient(customerPhone);
}

async function dispatchWhatsApp(
  customerPhone: string,
  input: {
    customerName: string;
    storeName?: string | null;
    orderLabel: string;
    lines: SaleLine[];
    total: number;
    loyalty?: LoyaltySummary | null;
  }
): Promise<boolean> {
  const config = getKapsoConfig();
  if (!config) {
    console.warn("[Kapso] ignoré — KAPSO_API_KEY ou KAPSO_PHONE_NUMBER_ID manquant");
    return false;
  }

  const recipient = resolveWhatsAppRecipient(customerPhone);
  if (!recipient) {
    console.error("[Kapso] téléphone client invalide:", customerPhone);
    return false;
  }

  const template = getKapsoTemplateConfig();
  if (template && !isKapsoSandboxMode()) {
    const pointsEarned = input.loyalty?.pointsEarned ?? 0;
    const totalPoints = input.loyalty?.totalPoints ?? 0;
    const result = await sendKapsoTemplateMessage(
      config,
      recipient,
      template.name,
      template.language,
      [
        input.customerName,
        input.orderLabel,
        buildOrderSummaryText(input.lines),
        formatCurrency(input.total),
        String(pointsEarned),
        String(totalPoints),
      ]
    );
    return result.ok;
  }

  if (!template && !isKapsoSandboxMode()) {
    console.warn(
      "[Kapso] production sans modèle — définissez KAPSO_TEMPLATE_NAME (Meta exige un modèle approuvé)"
    );
  }

  const body = buildPurchaseWhatsAppMessage({
    customerName: input.customerName,
    storeName: input.storeName,
    orderLabel: input.orderLabel,
    lines: input.lines,
    total: input.total,
    loyalty: input.loyalty,
  });
  const result = await sendKapsoTextMessage(config, recipient, body);
  return result.ok;
}

export async function sendSaleWhatsAppNotification(saleId: string): Promise<void> {
  const config = getKapsoConfig();
  if (!config) return;

  const admin = createAdminClient();
  const { data: sale, error } = await admin
    .from("sales")
    .select(
      `
      id,
      total,
      loyalty_points_earned,
      loyalty_points_redeemed,
      loyalty_discount,
      customer_id,
      customers ( full_name, phone, loyalty_points ),
      sale_items ( quantity, unit_price, products ( name ) ),
      stores ( name )
    `
    )
    .eq("id", saleId)
    .maybeSingle();

  if (error || !sale) {
    console.error("[Kapso] vente introuvable:", error?.message);
    return;
  }

  const customer = sale.customers as {
    full_name: string;
    phone: string;
    loyalty_points: number;
  } | null;

  if (!customer?.phone) {
    if (isKapsoSandboxMode()) {
      console.info("[Kapso] mode SANDBOX sans client — numéro override utilisé");
    } else {
      console.warn(
        "[Kapso] vente sans client fidélité — liez le client (scan QR / téléphone) avant de payer"
      );
      return;
    }
  }

  const customerPhone =
    customer?.phone || process.env.KAPSO_SANDBOX_OVERRIDE_TO?.trim() || "";

  console.info(
    "[Kapso] préparation WhatsApp vente",
    saleId.slice(0, 8),
    isKapsoSandboxMode() ? "(sandbox)" : "→ client"
  );

  const saleItems = (sale.sale_items || []) as {
    quantity: number;
    unit_price: number;
    products: { name: string } | null;
  }[];

  await dispatchWhatsApp(customerPhone, {
    customerName: customer?.full_name?.trim() || "Client",
    storeName: (sale.stores as { name: string } | null)?.name,
    orderLabel: `Référence : ${saleId.slice(0, 8).toUpperCase()}`,
    lines: saleItems.map((item) => ({
      name: item.products?.name?.trim() || "Produit",
      quantity: item.quantity,
      lineTotal: item.quantity * Number(item.unit_price),
    })),
    total: Number(sale.total),
    loyalty: customer
      ? {
          pointsEarned: Number(sale.loyalty_points_earned),
          totalPoints: customer.loyalty_points,
          pointsRedeemed: Number(sale.loyalty_points_redeemed),
          discount: Number(sale.loyalty_discount),
        }
      : null,
  });
}

export async function sendShopifyOrderWhatsAppNotification(
  shopifyOrderId: string,
  items: { product_id: string; quantity: number }[]
): Promise<void> {
  const config = getKapsoConfig();
  if (!config) return;

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, total, line_items, stores ( name )"
    )
    .eq("id", shopifyOrderId)
    .maybeSingle();

  if (error || !order) {
    console.error("[Kapso] commande Shopify introuvable:", error?.message);
    return;
  }

  if (!order.customer_phone) {
    console.warn(
      "[Kapso] commande Shopify sans téléphone client — WhatsApp ignoré:",
      order.order_number
    );
    return;
  }

  const productIds = items.map((item) => item.product_id);
  const { data: products } = await admin
    .from("products")
    .select("id, name, price")
    .in("id", productIds);

  const productById = Object.fromEntries(
    (products || []).map((product) => [product.id, product])
  );

  const shopifyLines = (order.line_items || []) as ShopifyLineItemRow[];
  const saleLines: SaleLine[] = items.map((item) => {
    const product = productById[item.product_id];
    const shopifyLine = shopifyLines.find(
      (line) => line.title === product?.name || line.sku
    );
    const unitPrice = product
      ? Number(product.price)
      : shopifyLine
        ? Number(shopifyLine.price)
        : 0;
    return {
      name: product?.name || shopifyLine?.title || "Produit",
      quantity: item.quantity,
      lineTotal: unitPrice * item.quantity,
    };
  });

  const loyaltyCustomer = await getCustomerByPhone(admin, order.customer_phone);

  await dispatchWhatsApp(order.customer_phone, {
    customerName: order.customer_name?.trim() || "Client",
    storeName: (order.stores as { name: string } | null)?.name,
    orderLabel: `Commande Shopify #${order.order_number}`,
    lines: saleLines,
    total: Number(order.total),
    loyalty: loyaltyCustomer
      ? {
          totalPoints: loyaltyCustomer.loyalty_points,
        }
      : null,
  });
}
