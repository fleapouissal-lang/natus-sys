import type { Profile, ShopifyOrder, ShopifyWorkflowStatus, Store } from "@/lib/types";
import { isDirector, isManager } from "@/lib/permissions";

/** Statuts où le transfert est interdit (livraison en cours / terminée ou clôturée). */
const NON_TRANSFERABLE_STATUSES: ShopifyWorkflowStatus[] = [
  "shipping",
  "delivered",
  "returned",
  "paid",
  "cancelled",
];

/** Transfert autorisé : en attente, en préparation, prête — pas une fois en livraison. */
export function isOrderTransferable(order: Pick<
  ShopifyOrder,
  "workflow_status" | "fulfilled_at" | "sale_id"
>): boolean {
  return !NON_TRANSFERABLE_STATUSES.includes(order.workflow_status);
}

export function canTransferShopifyOrder(
  profile: Profile,
  order: Pick<ShopifyOrder, "store_id" | "city" | "workflow_status" | "fulfilled_at" | "sale_id">
): boolean {
  if (!isOrderTransferable(order)) return false;
  if (!order.store_id) return false;

  if (isDirector(profile)) return true;
  if (isManager(profile)) return profile.city === order.city;
  if (profile.role === "cashier") return profile.store_id === order.store_id;
  return false;
}

export function isValidTransferTarget(
  fromStore: Pick<Store, "id" | "city">,
  targetStore: Pick<Store, "id" | "city" | "is_hub">,
  hubStore: Pick<Store, "id"> | null
): boolean {
  if (targetStore.id === fromStore.id) return false;
  if (targetStore.is_hub) return true;
  if (targetStore.city === fromStore.city) return true;
  if (hubStore && targetStore.id === hubStore.id) return true;
  return false;
}

export async function filterTransferTargets(
  fromStore: Store,
  targets: Store[],
  hubStore: Store | null
): Promise<Store[]> {
  return targets.filter((store) =>
    isValidTransferTarget(fromStore, store, hubStore)
  );
}
