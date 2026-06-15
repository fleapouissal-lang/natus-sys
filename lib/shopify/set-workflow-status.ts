import { createClient } from "@/lib/supabase/server";
import type { Profile, ShopifyWorkflowStatus } from "@/lib/types";
import { getShopifyOrderById, canAccessShopifyOrder } from "@/lib/shopify/order-access";
import { resolveWorkflowStatusUpdate } from "@/lib/shopify/order-status";

export async function applyShopifyOrderWorkflowStatus(
  orderId: string,
  workflowStatus: ShopifyWorkflowStatus,
  profile: Profile
): Promise<{ success: true; status: ShopifyWorkflowStatus } | { error: string }> {
  const order = await getShopifyOrderById(orderId);
  if (!order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (
    order.workflow_status === "cancelled" ||
    order.workflow_status === "returned" ||
    order.workflow_status === "paid"
  ) {
    return { error: "Commande déjà clôturée" };
  }

  const effectiveStatus = resolveWorkflowStatusUpdate(workflowStatus);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    workflow_status: effectiveStatus,
    updated_at: now,
  };

  if (effectiveStatus === "paid") {
    updates.financial_status = "paid";
    updates.paid_at = now;
    updates.paid_by = profile.id;
  }

  const { error } = await supabase.from("shopify_orders").update(updates).eq("id", orderId);

  if (error) return { error: error.message };

  if (effectiveStatus === "ready" && order.store_id) {
    const { assignOrderToStoreLivreur } = await import("@/lib/shopify/assign-livreur");
    await assignOrderToStoreLivreur(orderId, order.store_id);
  }

  const { syncShopifyWorkflowStatus, markShopifyOrderPaid } = await import(
    "@/lib/shopify/update-order"
  );

  if (effectiveStatus === "paid" && order.payment_type === "cod") {
    await markShopifyOrderPaid(
      order.shopify_order_id,
      Number(order.total),
      order.currency || "MAD"
    );
  }
  await syncShopifyWorkflowStatus(order.shopify_order_id, effectiveStatus);

  return { success: true, status: effectiveStatus };
}
