import {
  loadInventoryForStores,
  orderLineItemsToRequirements,
  resolveOrderStoreByStock,
  storeCanFulfillOrder,
} from "@/lib/shopify/assign-order-by-stock";
import { isOrderTransferable } from "@/lib/shopify/order-transfer";
import type { ShopifyLineItemRow, ShopifyWorkflowStatus } from "@/lib/types";

type AdminClient = ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;

export type ShopifyOrderForRouting = {
  id: string;
  store_id: string | null;
  city: string;
  line_items: ShopifyLineItemRow[];
  shipping_address: string | null;
  shipping_lat: number | null;
  shipping_lng: number | null;
  store_assignment_locked: boolean;
  workflow_status: ShopifyWorkflowStatus;
  fulfilled_at: string | null;
  sale_id: string | null;
  order_status: string;
};

const ROUTABLE_WORKFLOW_STATUSES = ["pending", "preparing", "ready"] as const;

const ORDER_SELECT_FOR_ROUTING =
  "id, store_id, city, line_items, shipping_address, shipping_lat, shipping_lng, store_assignment_locked, workflow_status, fulfilled_at, sale_id, order_status";

export function canAutoRouteOrder(
  order: Pick<
    ShopifyOrderForRouting,
    | "store_assignment_locked"
    | "store_id"
    | "workflow_status"
    | "fulfilled_at"
    | "sale_id"
    | "order_status"
  >
): boolean {
  if (order.store_assignment_locked) return false;
  if (!order.store_id) return false;
  if (order.order_status === "cancelled") return false;
  if (order.fulfilled_at || order.sale_id) return false;
  return isOrderTransferable(order);
}

export async function resolveShopifyOrderRoute(
  supabase: AdminClient,
  order: ShopifyOrderForRouting,
  currentStoreId?: string | null
) {
  const storeId = currentStoreId ?? order.store_id;
  if (!storeId) {
    return { error: "Commande sans magasin assigné" as const };
  }

  const { data: fromStore } = await supabase
    .from("stores")
    .select("id, name, city, address, lat, lng, is_hub")
    .eq("id", storeId)
    .maybeSingle();

  if (!fromStore) {
    return { error: "Magasin introuvable" as const };
  }

  const { data: cityStores } = await supabase
    .from("stores")
    .select("id, name, city, address, lat, lng, is_hub")
    .eq("is_active", true)
    .eq("city", fromStore.city);

  const { data: hubStore } = await supabase
    .from("stores")
    .select("id, name, city, is_hub")
    .eq("is_active", true)
    .eq("is_hub", true)
    .eq("city", fromStore.city)
    .maybeSingle();

  const { data: products } = await supabase.from("products").select("id, name, barcode");

  async function updateStoreCoords(id: string, lat: number, lng: number) {
    await supabase.from("stores").update({ lat, lng }).eq("id", id);
  }

  const route = await resolveOrderStoreByStock({
    supabase,
    lineItems: order.line_items,
    products: products || [],
    retailStores: cityStores || [],
    hubStore,
    shippingAddress: order.shipping_address || fromStore.city,
    shippingLat: order.shipping_lat,
    shippingLng: order.shipping_lng,
    updateStoreCoords,
    currentStoreId: storeId,
  });

  return { route, fromStore, hubStore };
}

/** Réaffecte automatiquement si le magasin actuel ne peut pas préparer la commande. */
export async function maybeAutoRouteShopifyOrder(
  supabase: AdminClient,
  order: ShopifyOrderForRouting,
  options?: { transferredBy?: string | null }
): Promise<
  | { routed: false; reason: string }
  | { routed: true; fromStoreId: string; targetStoreId: string; targetStoreName: string; reason: string }
> {
  if (!canAutoRouteOrder(order)) {
    return { routed: false, reason: "Réaffectation non autorisée pour cette commande" };
  }

  const resolved = await resolveShopifyOrderRoute(supabase, order);
  if ("error" in resolved) {
    return { routed: false, reason: resolved.error };
  }

  const { route } = resolved;

  if (route.currentStoreCanFulfill) {
    return { routed: false, reason: "Stock suffisant dans le magasin actuel" };
  }

  if (!route.targetStoreId || route.targetStoreId === order.store_id) {
    const { hubStore, fromStore } = resolved;

    if (
      hubStore &&
      fromStore &&
      !fromStore.is_hub &&
      order.store_id !== hubStore.id
    ) {
      const now = new Date().toISOString();
      const { error: hubError } = await supabase
        .from("shopify_orders")
        .update({
          store_id: hubStore.id,
          city: hubStore.city,
          transferred_from_store_id: order.store_id,
          transferred_at: now,
          transferred_by: options?.transferredBy ?? null,
          assigned_livreur_id: null,
          workflow_status: "pending",
          updated_at: now,
        })
        .eq("id", order.id);

      if (!hubError) {
        console.info(
          `Commande ${order.id} routée auto vers hub: ${order.store_id} → ${hubStore.id}`
        );
        return {
          routed: true,
          fromStoreId: order.store_id!,
          targetStoreId: hubStore.id,
          targetStoreName: hubStore.name,
          reason: "Aucun magasin retail avec stock — routage hub",
        };
      }
    }

    return {
      routed: false,
      reason: route.reason || "Aucun autre magasin ou hub avec stock complet",
    };
  }

  const { data: targetStore } = await supabase
    .from("stores")
    .select("id, name, city")
    .eq("id", route.targetStoreId)
    .maybeSingle();

  if (!targetStore) {
    return { routed: false, reason: "Magasin destination introuvable" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("shopify_orders")
    .update({
      store_id: route.targetStoreId,
      city: targetStore.city,
      transferred_from_store_id: order.store_id,
      transferred_at: now,
      transferred_by: options?.transferredBy ?? null,
      assigned_livreur_id: null,
      workflow_status: "pending",
      updated_at: now,
    })
    .eq("id", order.id);

  if (error) {
    console.error("maybeAutoRouteShopifyOrder:", error.message);
    return { routed: false, reason: error.message };
  }

  console.info(
    `Commande ${order.id} routée auto: ${order.store_id} → ${route.targetStoreId} (${route.reason})`
  );

  return {
    routed: true,
    fromStoreId: order.store_id!,
    targetStoreId: route.targetStoreId,
    targetStoreName: route.targetStoreName || targetStore.name,
    reason: route.reason,
  };
}

/** Réaffecte les commandes encore assignées à un magasin en rupture. */
export async function autoRouteOrdersAtStore(
  supabase: AdminClient,
  storeId: string,
  limit = 30
): Promise<number> {
  const { data: orders, error } = await supabase
    .from("shopify_orders")
    .select(ORDER_SELECT_FOR_ROUTING)
    .eq("store_id", storeId)
    .eq("store_assignment_locked", false)
    .in("workflow_status", [...ROUTABLE_WORKFLOW_STATUSES])
    .is("fulfilled_at", null)
    .is("sale_id", null)
    .neq("order_status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("autoRouteOrdersAtStore:", error.message);
    return 0;
  }

  let routed = 0;
  for (const order of orders || []) {
    const result = await maybeAutoRouteShopifyOrder(
      supabase,
      order as ShopifyOrderForRouting
    );
    if (result.routed) routed += 1;
  }

  return routed;
}

/** Réaffecte en lot les commandes en attente dont le magasin actuel est en rupture. */
export async function autoRoutePendingShopifyOrders(
  supabase: AdminClient,
  options?: { city?: string | null; limit?: number }
): Promise<number> {
  let query = supabase
    .from("shopify_orders")
    .select(ORDER_SELECT_FOR_ROUTING)
    .eq("store_assignment_locked", false)
    .in("workflow_status", [...ROUTABLE_WORKFLOW_STATUSES])
    .is("fulfilled_at", null)
    .is("sale_id", null)
    .neq("order_status", "cancelled")
    .not("store_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 25);

  if (options?.city) {
    query = query.eq("city", options.city);
  }

  const { data: orders, error } = await query;
  if (error) {
    console.error("autoRoutePendingShopifyOrders:", error.message);
    return 0;
  }

  let routed = 0;
  for (const order of orders || []) {
    const result = await maybeAutoRouteShopifyOrder(
      supabase,
      order as ShopifyOrderForRouting
    );
    if (result.routed) routed += 1;
  }

  return routed;
}

/** Exclut les commandes encore assignées à un magasin qui ne peut pas les préparer. */
export async function filterOrdersFulfillableAtStore<T extends ShopifyOrderForRouting>(
  supabase: AdminClient,
  orders: T[],
  storeId: string
): Promise<T[]> {
  if (orders.length === 0) return orders;

  const { data: products } = await supabase.from("products").select("id, name, barcode");
  const productList = products || [];

  const requirementsByOrder = orders.map((order) =>
    orderLineItemsToRequirements(order.line_items, productList)
  );

  const productIds = [
    ...new Set(
      requirementsByOrder.flatMap((r) => r.requirements.map((req) => req.productId))
    ),
  ];

  if (productIds.length === 0) return orders;

  const inventoryByStore = await loadInventoryForStores(supabase, [storeId], productIds);

  return orders.filter((order, index) => {
    const { requirements } = requirementsByOrder[index];
    if (requirements.length === 0) return true;
    if (order.store_id !== storeId) return true;
    return storeCanFulfillOrder(storeId, requirements, inventoryByStore);
  });
}
