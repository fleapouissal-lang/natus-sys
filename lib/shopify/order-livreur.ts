import type { Profile, ShopifyOrder, ShopifyWorkflowStatus } from "@/lib/types";

/** Statuts pour lesquels le livreur assigné doit être visible. */
export function orderShowsDeliveredLivreur(
  status: ShopifyWorkflowStatus
): boolean {
  return status === "delivered" || status === "returned" || status === "paid";
}

export function resolveOrderLivreurName(
  order: Pick<ShopifyOrder, "assigned_livreur_id" | "assigned_livreur_name">,
  livreurs: Pick<Profile, "id" | "full_name" | "email">[] = []
): string | null {
  if (order.assigned_livreur_name?.trim()) {
    return order.assigned_livreur_name.trim();
  }
  if (!order.assigned_livreur_id) return null;
  const match = livreurs.find((livreur) => livreur.id === order.assigned_livreur_id);
  return match?.full_name || match?.email || null;
}

export function orderDeliveredLivreurName(
  order: Pick<
    ShopifyOrder,
    "workflow_status" | "assigned_livreur_id" | "assigned_livreur_name"
  >,
  livreurs: Pick<Profile, "id" | "full_name" | "email">[] = []
): string | null {
  if (!orderShowsDeliveredLivreur(order.workflow_status)) return null;
  return resolveOrderLivreurName(order, livreurs);
}
