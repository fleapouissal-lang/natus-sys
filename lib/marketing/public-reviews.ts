import { createAdminClient } from "@/lib/supabase/admin";
import { toDirectGoogleReviewUrl } from "@/lib/marketing/google-review-url";

export type PublicReview = {
  customerName: string | null;
  rating: number;
  message: string | null;
  createdAt: string;
};

export type PublicGoogleReviewsData = {
  storeName: string;
  city: string;
  mapsUrl: string;
  writeReviewUrl: string;
  reviews: PublicReview[];
  averageRating: number;
  totalReviews: number;
};

const DEFAULT_STORE = "Natus Guéliz";
const GOOGLE_MAPS_GUELIZ =
  "https://www.google.com/maps/place/Natus+Marrakech+Gueliz/@31.6344872,-8.0103539,17z/data=!4m8!3m7!1s0xdafee8e56ef5e69:0x22e615f0786def6a!8m2!3d31.6344872!4d-8.0103539!9m1!1b1";

export const NATUS_WEBSITE_URL = "https://natusmarrakech.com";

function displayName(name: string | null): string | null {
  if (!name?.trim()) return null;
  return name.trim().split(/\s+/)[0] || null;
}

export async function getPublicGoogleReviewsData(
  storeName = DEFAULT_STORE
): Promise<PublicGoogleReviewsData> {
  const admin = createAdminClient();

  const { data: storeRows } = await admin.rpc("get_public_store_review_store", {
    p_store_name: storeName,
  });

  const storeRow = storeRows?.[0] as
    | { store_name: string; city: string; google_review_url: string | null }
    | undefined;

  const mapsUrl = storeRow?.google_review_url || GOOGLE_MAPS_GUELIZ;
  const writeReviewUrl = toDirectGoogleReviewUrl(mapsUrl);

  const { data: reviewRows } = await admin.rpc("get_public_store_reviews", {
    p_store_name: storeName,
  });

  const reviews: PublicReview[] = (reviewRows || []).map(
    (row: {
      customer_name: string | null;
      rating: number;
      message: string | null;
      created_at: string;
    }) => ({
      customerName: displayName(row.customer_name),
      rating: row.rating,
      message: row.message,
      createdAt: row.created_at,
    })
  );

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 5;

  return {
    storeName: storeRow?.store_name || storeName,
    city: storeRow?.city || "Marrakech",
    mapsUrl,
    writeReviewUrl,
    reviews,
    averageRating,
    totalReviews,
  };
}

export function formatReviewDate(iso: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-MA", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function starsText(rating: number): string {
  const n = Math.min(5, Math.max(1, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}
