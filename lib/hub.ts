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

export async function getHubAssignedManagers(hubUserId: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("hub_manager_assignments")
    .select("manager_id")
    .eq("hub_user_id", hubUserId);

  const ids = (links || []).map((l) => l.manager_id);
  if (ids.length === 0) return [];

  const { data: managers } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .order("full_name");

  return (managers || []) as Profile[];
}

/** Magasins retail de la ville (destinations de transfert hub). */
export async function getHubRetailStoresForTransfer(city: string): Promise<Store[]> {
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

export async function getManagersForCity(city: string): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "manager")
    .eq("city", city)
    .eq("is_active", true)
    .order("full_name");
  return (data || []) as Profile[];
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
