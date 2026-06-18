import { createAdminClient } from "@/lib/supabase/admin";

export type StoreMarketing = {
  id: string;
  name: string;
  city: string;
  google_review_url: string | null;
  promo_code: string | null;
  promo_label: string | null;
  geo_offer_text: string | null;
};

export async function getStoreMarketing(
  storeId: string
): Promise<StoreMarketing | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stores")
    .select(
      "id, name, city, google_review_url, promo_code, promo_label, geo_offer_text"
    )
    .eq("id", storeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoreMarketing;
}
