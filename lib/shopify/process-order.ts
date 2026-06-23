import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOrderStoreByStock } from "@/lib/shopify/assign-order-by-stock";
import type { ProductLineLookup } from "@/lib/shopify/order-cart";
import { maybeAutoRouteShopifyOrder } from "@/lib/shopify/auto-route-order";
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
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("shopify_orders")
    .select(
      "id, store_id, store_assignment_locked, city, workflow_status, fulfilled_at, sale_id, order_status, shipping_address, shipping_lat, shipping_lng"
    )
    .eq("shopify_order_id", order.id)
    .maybeSingle();

  if (existing?.store_assignment_locked) {
    const { data, error } = await supabase
      .from("shopify_orders")
      .update({
        order_number: order.name || `#${order.order_number}`,
        customer_name: resolveCustomerName(order),
        customer_email: order.email || order.customer?.email || null,
        customer_phone: order.phone || shipping?.phone || order.customer?.phone || null,
        shipping_address: shippingAddress,
        shipping_lat: shippingLat,
        shipping_lng: shippingLng,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        order_status: resolveOrderStatus(order),
        payment_gateway: resolvePaymentGateway(order),
        total: parseFloat(order.total_price) || 0,
        currency: order.currency || "MAD",
        line_items: lineItems,
        shopify_created_at: order.created_at,
        updated_at: now,
      })
      .eq("shopify_order_id", order.id)
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    const customerPhone = order.phone || shipping?.phone || order.customer?.phone || null;
    if (customerPhone) {
      try {
        const { syncShopifyOrderNoteToLoyaltyCard } = await import(
          "@/lib/loyalty/customer-notes"
        );
        await syncShopifyOrderNoteToLoyaltyCard(supabase, {
          shopifyOrderId: data.id,
          orderNumber: order.name || `#${order.order_number}`,
          customerPhone,
          lineItems,
          total: parseFloat(order.total_price) || 0,
          shippingAddress,
          shopifyNote: order.note,
        });
      } catch (loyaltyNoteError) {
        console.error("processShopifyOrder loyalty note:", loyaltyNoteError);
      }
    }

    return { ok: true, id: data.id };
  }

  const { data: cityStores } = await supabase
    .from("stores")
    .select("id, name, city, address, lat, lng, is_hub")
    .eq("is_active", true)
    .eq("city", city);

  const { data: hubStore } = await supabase
    .from("stores")
    .select("id, name, city, is_hub")
    .eq("is_active", true)
    .eq("is_hub", true)
    .eq("city", city)
    .maybeSingle();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, barcode, product_kind, parent_id");

  async function updateStoreCoords(id: string, lat: number, lng: number) {
    await supabase.from("stores").update({ lat, lng }).eq("id", id);
  }

  const route = await resolveOrderStoreByStock({
    supabase,
    lineItems,
    products: (products || []) as ProductLineLookup[],
    retailStores: cityStores || [],
    hubStore,
    shippingAddress,
    shippingLat,
    shippingLng,
    updateStoreCoords,
    currentStoreId: existing?.store_id ?? undefined,
  });

  const storeId = route.targetStoreId;
  const orderCity = route.routedToHub && hubStore ? hubStore.city : city;
  const storeChanged =
    Boolean(existing?.store_id && storeId && existing.store_id !== storeId);

  const row = {
    shopify_order_id: order.id,
    order_number: order.name || `#${order.order_number}`,
    store_id: storeId,
    city: orderCity,
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
    workflow_status: storeChanged
      ? ("pending" as const)
      : paymentType === "online" && order.financial_status === "paid"
        ? ("preparing" as const)
        : workflowStatus,
    payment_gateway: resolvePaymentGateway(order),
    total: parseFloat(order.total_price) || 0,
    currency: order.currency || "MAD",
    line_items: lineItems,
    shopify_created_at: order.created_at,
    updated_at: now,
    transferred_from_store_id: storeChanged ? existing!.store_id : null,
    transferred_at: storeChanged ? now : null,
    transferred_by: null as string | null,
    assigned_livreur_id: null,
  };

  const { data, error } = await supabase
    .from("shopify_orders")
    .upsert(row, { onConflict: "shopify_order_id" })
    .select(
      "id, store_id, city, line_items, shipping_address, shipping_lat, shipping_lng, store_assignment_locked, workflow_status, fulfilled_at, sale_id, order_status"
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  await maybeAutoRouteShopifyOrder(supabase, {
    id: data.id,
    store_id: data.store_id,
    city: data.city,
    line_items: data.line_items,
    shipping_address: data.shipping_address,
    shipping_lat: data.shipping_lat,
    shipping_lng: data.shipping_lng,
    store_assignment_locked: data.store_assignment_locked,
    workflow_status: data.workflow_status,
    fulfilled_at: data.fulfilled_at,
    sale_id: data.sale_id,
    order_status: data.order_status,
  });

  if (row.customer_phone) {
    try {
      const { syncShopifyOrderNoteToLoyaltyCard } = await import(
        "@/lib/loyalty/customer-notes"
      );
      await syncShopifyOrderNoteToLoyaltyCard(supabase, {
        shopifyOrderId: data.id,
        orderNumber: row.order_number,
        customerPhone: row.customer_phone,
        lineItems,
        total: row.total,
        shippingAddress: shippingAddress,
        shopifyNote: order.note,
      });
    } catch (loyaltyNoteError) {
      console.error("processShopifyOrder loyalty note:", loyaltyNoteError);
    }

    try {
      const { sendShopifyOrderConfirmationRequest } = await import(
        "@/lib/kapso/shopify-order-whatsapp"
      );
      await sendShopifyOrderConfirmationRequest(data.id);
    } catch (whatsappError) {
      console.error("processShopifyOrder WhatsApp:", whatsappError);
    }
  }

  return { ok: true, id: data.id };
}
