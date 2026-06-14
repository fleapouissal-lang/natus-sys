import { NATUS_CITIES } from "@/lib/constants/cities";

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CITY_ALIASES: Record<string, string> = {
  marrakech: "Marrakech",
  marrakesh: "Marrakech",
  casablanca: "Casablanca",
  casa: "Casablanca",
  rabat: "Rabat",
  fes: "Fès",
  fez: "Fès",
  tanger: "Tanger",
  tangier: "Tanger",
  agadir: "Agadir",
};

export function matchNatusCity(rawCity: string | null | undefined): string | null {
  if (!rawCity?.trim()) return null;

  const normalized = normalizeCity(rawCity);
  if (CITY_ALIASES[normalized]) return CITY_ALIASES[normalized];

  for (const city of NATUS_CITIES) {
    if (normalizeCity(city) === normalized) return city;
  }

  for (const city of NATUS_CITIES) {
    if (normalized.includes(normalizeCity(city)) || normalizeCity(city).includes(normalized)) {
      return city;
    }
  }

  return null;
}

export function formatShippingAddress(parts: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
}): string {
  return [
    parts.address1,
    parts.address2,
    parts.city,
    parts.province,
    parts.zip,
    parts.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", `${address}, Morocco`);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "Natus-POS/1.0 (shopify-sync)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      geocodeCache.set(key, null);
      return null;
    }

    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) {
      geocodeCache.set(key, null);
      return null;
    }

    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(key, coords);
    return coords;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
