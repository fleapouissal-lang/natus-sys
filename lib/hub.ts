import { createClient } from "@/lib/supabase/server";
import type { Profile, Store } from "@/lib/types";

export async function getHubStoreByCity(city: string): Promise<Store | null> {
  const stores = await getHubStoresByCity(city);
  return stores[0] ?? null;
}

export async function getHubStoresByCity(city: string): Promise<Store[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("is_active", true)
    .eq("is_hub", true)
    .eq("city", city)
    .order("name");
  return data || [];
}

/** Dépôt hub rattaché à un magasin retail (via hub_store_assignments). */
export async function getHubStoreForRetailStore(storeId: string): Promise<Store | null> {
  if (!storeId) return null;

  const supabase = await createClient();
  const { data: hubStoreId, error } = await supabase.rpc("hub_depot_store_for_retail", {
    p_store_id: storeId,
  });

  if (error || !hubStoreId) {
    if (error) console.error("getHubStoreForRetailStore:", error.message);
    return null;
  }

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", hubStoreId as string)
    .maybeSingle();

  return (store as Store | null) ?? null;
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
    .map((row) => {
      const raw = row.stores;
      const store = (Array.isArray(raw) ? raw[0] : raw) as Store | null;
      return store;
    })
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

/** Livreurs disponibles pour assigner une commande Shopify (par nom). */
export async function getOrderAssignmentLivreurs(
  profile: Profile,
  options?: { city?: string | null; storeId?: string | null }
): Promise<Profile[]> {
  let city = options?.city?.trim() || null;

  if (!city && profile.role === "manager") {
    city = profile.city;
  }

  if (!city && profile.role === "cashier" && profile.store_id) {
    const { getHubDepotCityForStore } = await import("@/lib/shopify/assign-livreur");
    city = await getHubDepotCityForStore(profile.store_id);
    if (!city) {
      const { getStoreById } = await import("@/lib/inventory");
      const store = await getStoreById(profile.store_id);
      city = store?.city ?? null;
    }
  }

  if (!city && options?.storeId) {
    const { getHubDepotCityForStore } = await import("@/lib/shopify/assign-livreur");
    city = await getHubDepotCityForStore(options.storeId);
    if (!city) {
      const { getStoreById } = await import("@/lib/inventory");
      const store = await getStoreById(options.storeId);
      city = store?.city ?? null;
    }
  }

  if (city) {
    return getHubCityLivreurs(city);
  }

  const { isDirector } = await import("@/lib/permissions");
  if (isDirector(profile)) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, email, role, city, is_active")
      .eq("role", "livreur")
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      console.error("getOrderAssignmentLivreurs:", error.message);
      return [];
    }

    return (data || []) as Profile[];
  }

  return [];
}

export async function getHubCityLivreurs(city: string): Promise<Profile[]> {
  if (!city?.trim()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_city_livreurs", {
    p_city: city.trim(),
  });

  if (error) {
    console.error("getHubCityLivreurs:", error.message);
    return [];
  }

  if (!Array.isArray(data)) return [];
  return data as Profile[];
}
