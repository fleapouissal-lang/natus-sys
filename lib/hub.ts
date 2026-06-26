import { createClient } from "@/lib/supabase/server";
import type { Profile, Store } from "@/lib/types";

export async function getHubStoreByCity(city: string): Promise<Store | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true)
    .eq("city", city)
    .maybeSingle();
  return data;
}

export async function getHubAccounts(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "hub")
    .order("city")
    .order("full_name");
  return (data || []) as Profile[];
}

export async function getHubStoreAssignmentsMap(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_store_assignments")
    .select("hub_user_id, store_id");

  const map: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!map[row.hub_user_id]) map[row.hub_user_id] = [];
    map[row.hub_user_id].push(row.store_id);
  }
  return map;
}

export async function getHubAssignedStores(hubUserId: string): Promise<Store[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_store_assignments")
    .select("store_id, stores:store_id(*)")
    .eq("hub_user_id", hubUserId);

  return (data || [])
    .map((row) => row.stores as Store | null)
    .filter((store): store is Store => Boolean(store?.is_active && !store.is_hub));
}

/** Magasins retail associés au dépôt (destinations de transfert). */
export async function getHubRetailStoresForTransfer(hubUserId: string): Promise<Store[]> {
  const stores = await getHubAssignedStores(hubUserId);
  return stores.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRetailStoresByCity(city: string): Promise<Store[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("city", city)
    .eq("is_hub", false)
    .order("name");
  return data || [];
}

export async function getHubCityStaff(city: string): Promise<{
  managers: Profile[];
  cashiers: Profile[];
  stores: Store[];
}> {
  const supabase = await createClient();

  const [{ data: managers }, { data: cashiers }, { data: stores }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "manager")
      .eq("city", city)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("*, stores:store_id(name)")
      .eq("role", "cashier")
      .eq("city", city)
      .order("full_name"),
    supabase.from("stores").select("*").eq("city", city).eq("is_active", true).order("name"),
  ]);

  return {
    managers: (managers || []) as Profile[],
    cashiers: (cashiers || []) as Profile[],
    stores: (stores || []) as Store[],
  };
}
