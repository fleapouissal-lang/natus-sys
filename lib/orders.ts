import { createClient } from "@/lib/supabase/server";
import type { CartItem, Product, Profile, ShopifyOrder } from "@/lib/types";
import { getCityFilter, isDirector } from "@/lib/permissions";
import { canAccessShopifyOrder } from "@/lib/shopify/order-access";
import { mapShopifyLineItemsToCart } from "@/lib/shopify/order-cart";
import { applyShopifyOrderWorkflowStatus } from "@/lib/shopify/set-workflow-status";

export interface ShopifyOrderPosContext {
  id: string;
  orderNumber: string;
  paymentType: ShopifyOrder["payment_type"];
  customerName: string | null;
  defaultPayment: "cash" | "card";
  workflowStatus: ShopifyOrder["workflow_status"];
}

export interface ShopifyOrderPosLoad {
  cart: CartItem[];
  context: ShopifyOrderPosContext;
  missingProducts: string[];
}

export interface OrdersQuery {
  city?: string | null;
  storeId?: string | null;
  limit?: number;
}

export async function getShopifyOrders(
  profile: Profile,
  query: OrdersQuery = {}
): Promise<ShopifyOrder[]> {
  const supabase = await createClient();
  const limit = query.limit ?? 100;

  let dbQuery = supabase
    .from("shopify_orders")
    .select("*, stores(name, city)")
    .order("shopify_created_at", { ascending: false })
    .limit(limit);

  if (profile.role === "cashier") {
    if (!profile.store_id) return [];
    dbQuery = dbQuery.eq("store_id", profile.store_id);
  } else if (profile.role === "manager") {
    const city = profile.city;
    if (!city) return [];
    dbQuery = dbQuery.eq("city", city);
    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
  } else if (isDirector(profile)) {
    if (query.city) dbQuery = dbQuery.eq("city", query.city);
    if (query.storeId) dbQuery = dbQuery.eq("store_id", query.storeId);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("getShopifyOrders:", error.message);
    return [];
  }

  return (data || []) as ShopifyOrder[];
}

export async function loadShopifyOrderForPos(
  profile: Profile,
  orderId: string,
  products: Product[]
): Promise<{ data: ShopifyOrderPosLoad } | { error: string }> {
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("shopify_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Commande introuvable" };

  if (!(await canAccessShopifyOrder(profile, order))) {
    return { error: "Accès refusé" };
  }

  if (order.sale_id) {
    return { error: "Cette commande a déjà été encaissée en caisse" };
  }

  if (order.workflow_status === "cancelled") {
    return { error: "Commande annulée" };
  }

  const { cart, missing } = mapShopifyLineItemsToCart(order.line_items, products);

  if (cart.length === 0) {
    return {
      error:
        missing.length > 0
          ? `Produits non trouvés : ${missing.join(", ")}`
          : "Aucun produit dans la commande",
    };
  }

  const prepResult = await applyShopifyOrderWorkflowStatus(orderId, "preparing", profile);
  const workflowStatus =
    "success" in prepResult ? prepResult.status : order.workflow_status;

  return {
    data: {
      cart,
      missingProducts: missing,
      context: {
        id: order.id,
        orderNumber: order.order_number,
        paymentType: order.payment_type,
        customerName: order.customer_name,
        defaultPayment: order.payment_type === "cod" ? "cash" : "card",
        workflowStatus,
      },
    },
  };
}

export function resolveOrdersStoreIds(
  stores: { id: string; city: string }[],
  opts: { city?: string | null; storeId?: string | null }
): string[] {
  if (opts.storeId) return [opts.storeId];
  if (opts.city) return stores.filter((s) => s.city === opts.city).map((s) => s.id);
  return stores.map((s) => s.id);
}

export function getOrdersScopeLabel(
  profile: Profile,
  opts: {
    city?: string;
    storeName?: string;
  }
): string {
  if (profile.role === "cashier") {
    return opts.storeName ? `Magasin — ${opts.storeName}` : "Mon magasin";
  }
  if (opts.storeName) return `${opts.storeName}${opts.city ? ` — ${opts.city}` : ""}`;
  if (opts.city) return `Tous les magasins — ${opts.city}`;
  if (isDirector(profile)) return "Toutes les commandes";
  return profile.city ? `Ville — ${profile.city}` : "Commandes";
}

export { getCityFilter };
