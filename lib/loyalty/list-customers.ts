import { createClient } from "@/lib/supabase/server";
import type { Profile, LoyaltyCustomer } from "@/lib/types";
import { getCityFilter, isDirector } from "@/lib/permissions";

export async function getLoyaltyCustomers(
  profile: Profile,
  opts: { storeOnly?: boolean; limit?: number } = {}
): Promise<LoyaltyCustomer[]> {
  const supabase = await createClient();
  const limit = opts.limit ?? 500;

  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts.storeOnly && profile.store_id) {
    query = query.eq("store_id", profile.store_id);
  } else if (!isDirector(profile)) {
    const city = getCityFilter(profile);
    if (city) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .eq("city", city);
      const storeIds = (stores || []).map((s) => s.id);
      if (storeIds.length > 0) {
        query = query.in("store_id", storeIds);
      }
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("getLoyaltyCustomers:", error.message);
    return [];
  }

  return (data || []) as LoyaltyCustomer[];
}
