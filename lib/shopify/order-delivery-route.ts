import type { ShopifyOrder } from "@/lib/types";
import { formatTransferSiteLabel } from "@/lib/transfer-route-labels";

export function orderDeliverySource(order: ShopifyOrder): string | null {
  const storeName = (order.stores as { name: string; city?: string } | null)?.name?.trim();
  const storeCity = (order.stores as { name: string; city?: string } | null)?.city?.trim();
  if (storeName) {
    return formatTransferSiteLabel(storeName, { city: storeCity });
  }

  const transferOrigin = order.transferred_from_store?.name?.trim();
  const transferCity = order.transferred_from_store?.city?.trim();
  if (transferOrigin) {
    return formatTransferSiteLabel(transferOrigin, { city: transferCity });
  }

  return null;
}

export function orderDeliveryDestination(order: ShopifyOrder): string | null {
  const address = order.shipping_address?.trim();
  const city = order.city?.trim();

  if (address && city && !address.toLowerCase().includes(city.toLowerCase())) {
    return `${address}, ${city}`;
  }
  if (address) return address;
  if (city) return city;
  return null;
}

export function formatOrderDeliveryRoute(order: ShopifyOrder): string | null {
  const source = orderDeliverySource(order);
  const destination = orderDeliveryDestination(order);
  if (source && destination) return `${source} → ${destination}`;
  return source ?? destination;
}
