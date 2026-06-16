import { createClient } from "@/lib/supabase/server";
import { getCityFilter } from "@/lib/permissions";
import type { Profile, LoyaltyStats } from "@/lib/types";

export async function getLoyaltyStats(profile: Profile): Promise<LoyaltyStats> {
  const supabase = await createClient();
  const city = getCityFilter(profile);

  let customerQuery = supabase.from("customers").select("id, full_name, card_number, loyalty_points, phone, store_id");

  if (city) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id")
      .eq("city", city);
    const storeIds = (stores || []).map((s) => s.id);
    if (storeIds.length > 0) {
      customerQuery = customerQuery.in("store_id", storeIds);
    }
  }

  const { data: customers } = await customerQuery;
  const memberList = customers || [];

  let txQuery = supabase.from("loyalty_transactions").select("type, points, customer_id");

  const { data: transactions } = await txQuery;
  const customerIds = new Set(memberList.map((c) => c.id));

  const filteredTx = (transactions || []).filter((tx) =>
    profile.role === "directeur" || profile.role === "admin"
      ? true
      : customerIds.has(tx.customer_id)
  );

  const pointsDistributed = filteredTx
    .filter((t) => t.type === "earn")
    .reduce((sum, t) => sum + t.points, 0);

  const pointsRedeemed = filteredTx
    .filter((t) => t.type === "redeem")
    .reduce((sum, t) => sum + t.points, 0);

  const topCustomers = [...memberList]
    .sort((a, b) => b.loyalty_points - a.loyalty_points)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      full_name: c.full_name,
      card_number: c.card_number,
      loyalty_points: c.loyalty_points,
      phone: c.phone,
    }));

  return {
    totalMembers: memberList.length,
    pointsDistributed,
    pointsRedeemed,
    topCustomers,
  };
}
