import { createAdminClient } from "@/lib/supabase/admin";
import { assignClosestStore } from "@/lib/shopify/assign-store";
import {
  formatShippingAddress,
  geocodeAddress,
  matchNatusCity,
} from "@/lib/shopify/geocode";
import type { ShopifyOrderPayload } from "@/lib/shopify/types";
import {
  detectPaymentType,
  resolvePaymentGateway,
  resolveWorkflowStatus,
} from "@/lib/shopify/payment-type";

function resolveOrderStatus(order: ShopifyOrderPayload): string {
  if (order.cancelled_at) return "cancelled";
  if (order.closed_at) return "closed";
  return "open";
}

function resolveCustomerName(order: ShopifyOrderPayload): string | null {
  const shipping = order.shipping_address?.name;
  if (shipping) return shipping;

  const c = order.customer;
  if (c?.first_name || c?.last_name) {
    return [c.first_name, c.last_name].filter(Boolean).join(" ");
  }
  return null;
}

export async function processShopifyOrder(
  order: ShopifyOrderPayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const shipping = order.shipping_address;

  const rawCity = shipping?.city || shipping?.province;
  const city = matchNatusCity(rawCity);

  if (!city) {
    return {
      ok: false,
      error: `Ville non reconnue: ${rawCity ?? "inconnue"}`,
    };
  }

  const shippingAddress = shipping
    ? formatShippingAddress(shipping)
    : city;

  let shippingLat = shipping?.latitude ?? null;
  let shippingLng = shipping?.longitude ?? null;

  if (shippingLat == null || shippingLng == null) {
    const coords = await geocodeAddress(shippingAddress);
    if (coords) {
      shippingLat = coords.lat;
      shippingLng = coords.lng;
    }
  }

  const { data: cityStores } = await supabase
    .from("stores")
    .select("id, name, city, address, lat, lng")
    .eq("is_active", true)
    .eq("city", city);

  async function updateStoreCoords(id: string, lat: number, lng: number) {
    await supabase.from("stores").update({ lat, lng }).eq("id", id);
  }

  const storeId = await assignClosestStore(
    cityStores || [],
    shippingAddress,
    shippingLat,
    shippingLng,
    updateStoreCoords
  );

  const lineItems = order.line_items.map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    price: item.price,
    sku: item.sku,
    variant_id: item.variant_id,
  }));

  const paymentType = detectPaymentType(order);
  const workflowStatus = resolveWorkflowStatus(order);

  const row = {
    shopify_order_id: order.id,
    order_number: order.name || `#${order.order_number}`,
    store_id: storeId,
    city,
    customer_name: resolveCustomerName(order),
    customer_email: order.email || order.customer?.email || null,
    customer_phone: order.phone || shipping?.phone || order.customer?.phone || null,
    shipping_address: shippingAddress,
    shipping_lat: shippingLat,
    shipping_lng: shippingLng,
    financial_status: order.financial_status,
    fulfillment_status: order.fulfillment_status,
    order_status: resolveOrderStatus(order),
    payment_type: paymentType,
    workflow_status:
      paymentType === "online" && order.financial_status === "paid"
        ? "preparing"
        : workflowStatus,
    payment_gateway: resolvePaymentGateway(order),
    total: parseFloat(order.total_price) || 0,
    currency: order.currency || "MAD",
    line_items: lineItems,
    shopify_created_at: order.created_at,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("shopify_orders")
    .upsert(row, { onConflict: "shopify_order_id" })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, id: data.id };
}
