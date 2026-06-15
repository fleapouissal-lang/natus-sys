import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { isDirector, isManager, isLivreur } from "@/lib/permissions";

export async function canAccessShopifyOrder(
  profile: Profile,
  order: { store_id: string | null; city: string; assigned_livreur_id?: string | null }
): Promise<boolean> {
  if (isDirector(profile)) return true;
  if (isManager(profile)) return profile.city === order.city;
  if (profile.role === "cashier") return profile.store_id === order.store_id;
  if (isLivreur(profile)) {
    return (
      profile.store_id === order.store_id &&
      order.assigned_livreur_id === profile.id
    );
  }
  return false;
}

export async function getShopifyOrderById(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopify_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !data) return null;
  return data;
}
