import { createAdminClient } from "@/lib/supabase/admin";
import { sendFeedbackPrompt } from "@/lib/kapso/feedback/messages";
import { getBotSession } from "@/lib/kapso/whatsapp-bot/sessions";

const FEEDBACK_DELAY_MS = 2 * 60 * 60 * 1000;

type DeliveredOrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string;
  whatsapp_status_notifications: Record<string, string> | null;
};

export async function processDeliveryFeedbackReminders(): Promise<{
  sent: number;
  skipped: number;
}> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - FEEDBACK_DELAY_MS).toISOString();

  const { data, error } = await admin
    .from("shopify_orders")
    .select(
      "id, order_number, customer_name, customer_phone, whatsapp_status_notifications"
    )
    .eq("workflow_status", "delivered")
    .is("whatsapp_delivery_feedback_sent_at", null)
    .not("customer_phone", "is", null)
    .limit(100);

  if (error || !data) {
    console.error("[feedback] delivery query:", error?.message);
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const row of data as DeliveredOrderRow[]) {
    const deliveredAt = row.whatsapp_status_notifications?.delivered;
    if (!deliveredAt || deliveredAt > cutoff) {
      skipped++;
      continue;
    }

    const session = await getBotSession(row.customer_phone);
    const ok = await sendFeedbackPrompt(row.customer_phone, {
      kind: "order",
      resourceId: row.id,
      customerName: row.customer_name?.trim() || "Client",
      orderNumber: row.order_number,
      history: session?.history ?? [],
    });

    if (!ok) {
      skipped++;
      continue;
    }

    await admin
      .from("shopify_orders")
      .update({ whatsapp_delivery_feedback_sent_at: new Date().toISOString() })
      .eq("id", row.id);

    sent++;
  }

  return { sent, skipped };
}

export async function sendPosServiceFeedback(saleId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: sale } = await admin
    .from("sales")
    .select(
      `
      id,
      whatsapp_service_feedback_sent_at,
      customers ( full_name, phone )
    `
    )
    .eq("id", saleId)
    .maybeSingle();

  if (!sale || sale.whatsapp_service_feedback_sent_at) return false;

  const customer = sale.customers as { full_name: string; phone: string } | null;
  if (!customer?.phone) return false;

  const session = await getBotSession(customer.phone);
  const ok = await sendFeedbackPrompt(customer.phone, {
    kind: "sale",
    resourceId: saleId,
    customerName: customer.full_name?.trim() || "Client",
    history: session?.history ?? [],
  });

  if (!ok) return false;

  await admin
    .from("sales")
    .update({ whatsapp_service_feedback_sent_at: new Date().toISOString() })
    .eq("id", saleId);

  return true;
}
