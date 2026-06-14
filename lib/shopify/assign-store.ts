import type { Store } from "@/lib/types";
import { geocodeAddress, haversineKm } from "@/lib/shopify/geocode";

type StoreWithCoords = Pick<Store, "id" | "name" | "city" | "address"> & {
  lat: number | null;
  lng: number | null;
};

async function ensureStoreCoords(
  store: StoreWithCoords,
  adminUpdate: (id: string, lat: number, lng: number) => Promise<void>
): Promise<{ lat: number; lng: number } | null> {
  if (store.lat != null && store.lng != null) {
    return { lat: store.lat, lng: store.lng };
  }

  if (!store.address) return null;

  const coords = await geocodeAddress(`${store.address}, ${store.city}, Morocco`);
  if (coords) {
    await adminUpdate(store.id, coords.lat, coords.lng);
  }
  return coords;
}

export async function assignClosestStore(
  cityStores: StoreWithCoords[],
  shippingAddress: string,
  shippingLat: number | null,
  shippingLng: number | null,
  adminUpdateStoreCoords: (id: string, lat: number, lng: number) => Promise<void>
): Promise<string | null> {
  if (cityStores.length === 0) return null;
  if (cityStores.length === 1) return cityStores[0].id;

  let orderLat = shippingLat;
  let orderLng = shippingLng;

  if (orderLat == null || orderLng == null) {
    const coords = await geocodeAddress(shippingAddress);
    if (coords) {
      orderLat = coords.lat;
      orderLng = coords.lng;
    }
  }

  if (orderLat == null || orderLng == null) {
    return cityStores[0].id;
  }

  let bestId = cityStores[0].id;
  let bestDistance = Infinity;

  for (const store of cityStores) {
    const storeCoords = await ensureStoreCoords(store, adminUpdateStoreCoords);
    if (!storeCoords) continue;

    const distance = haversineKm(orderLat, orderLng, storeCoords.lat, storeCoords.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = store.id;
    }
  }

  return bestId;
}
