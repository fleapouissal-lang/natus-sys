import { createAdminClient } from "@/lib/supabase/admin";

/** Ville du dépôt rattaché au magasin (via hub_store_assignments). */
export async function getHubDepotCityForStore(storeId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("hub_store_assignments")
    .select("hub_user_id, profiles:hub_user_id(city, role, is_active)")
    .eq("store_id", storeId)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  if (!profile || profile.role !== "hub" || !profile.is_active) return null;
  return (profile.city as string | null) ?? null;
}

/** Premier livreur actif de la ville du dépôt — plusieurs livreurs possibles. */
export async function getCityLivreurId(city: string): Promise<string | null> {
  if (!city) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "livreur")
    .eq("city", city)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/** Tous les livreurs actifs d'une ville. */
export async function getCityLivreurIds(city: string): Promise<string[]> {
  if (!city) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "livreur")
    .eq("city", city)
    .eq("is_active", true)
    .order("full_name");

  return (data || []).map((row) => row.id as string);
}

/** @deprecated Préférer getHubDepotCityForStore + getCityLivreurId */
export async function getStoreLivreurId(storeId: string): Promise<string | null> {
  const hubCity = await getHubDepotCityForStore(storeId);
  if (hubCity) return getCityLivreurId(hubCity);

  const supabase = createAdminClient();
  const { data: store } = await supabase
    .from("stores")
    .select("city")
    .eq("id", storeId)
    .maybeSingle();

  if (!store?.city) return null;
  return getCityLivreurId(store.city);
}

export async function resolveLivreurForReadyOrder(
  storeId: string | null,
  orderCity?: string | null
): Promise<string | null> {
  if (storeId) {
    const hubCity = await getHubDepotCityForStore(storeId);
    if (hubCity) return getCityLivreurId(hubCity);
  }
  if (orderCity) return getCityLivreurId(orderCity);
  if (!storeId) return null;

  const supabase = createAdminClient();
  const { data: store } = await supabase
    .from("stores")
    .select("city")
    .eq("id", storeId)
    .maybeSingle();

  return store?.city ? getCityLivreurId(store.city) : null;
}

export async function resolveHubCityForOrder(
  storeId: string | null,
  orderCity?: string | null
): Promise<string | null> {
  if (storeId) {
    const hubCity = await getHubDepotCityForStore(storeId);
    if (hubCity) return hubCity;
  }
  if (orderCity) return orderCity;
  if (!storeId) return null;

  const supabase = createAdminClient();
  const { data: store } = await supabase
    .from("stores")
    .select("city")
    .eq("id", storeId)
    .maybeSingle();

  return (store?.city as string | null) ?? null;
}

/** Affecte un livreur choisi à une commande (validation ville dépôt). */
export async function assignOrderToLivreur(
  orderId: string,
  livreurId: string,
  order: {
    store_id: string | null;
    city: string | null;
    workflow_status: string;
  }
): Promise<{ success: true; livreurName: string } | { error: string }> {
  if (!livreurId?.trim()) {
    return { error: "Choisissez un livreur" };
  }

  if (order.workflow_status !== "ready" && order.workflow_status !== "shipping") {
    return {
      error: "Assignation possible uniquement pour commandes prêtes ou en livraison",
    };
  }

  const targetCity = await resolveHubCityForOrder(order.store_id, order.city);
  if (!targetCity) {
    return { error: "Ville de livraison introuvable pour cette commande" };
  }

  const supabase = createAdminClient();
  const { data: livreur, error: livreurError } = await supabase
    .from("profiles")
    .select("id, role, city, is_active, full_name, email")
    .eq("id", livreurId)
    .maybeSingle();

  if (livreurError || !livreur) {
    return { error: "Livreur introuvable" };
  }

  if (livreur.role !== "livreur" || !livreur.is_active) {
    return { error: "Livreur invalide ou inactif" };
  }

  if ((livreur.city as string | null) !== targetCity) {
    return { error: "Ce livreur n'est pas disponible pour cette commande" };
  }

  const { error } = await supabase
    .from("shopify_orders")
    .update({
      assigned_livreur_id: livreurId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("assignOrderToLivreur:", error.message);
    return { error: error.message };
  }

  return {
    success: true,
    livreurName: (livreur.full_name as string | null) || (livreur.email as string),
  };
}

/** Affecte un livreur du dépôt (ville hub) à une commande prête. */
export async function assignOrderToStoreLivreur(
  orderId: string,
  storeId: string | null,
  city?: string | null
): Promise<string | null> {
  const livreurId = await resolveLivreurForReadyOrder(storeId, city);
  if (!livreurId) return null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("shopify_orders")
    .update({
      assigned_livreur_id: livreurId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) {
    console.error("assignOrderToStoreLivreur:", error.message);
    return null;
  }

  return livreurId;
}

/** Rattrapage : commandes prêtes/en livraison sans livreur affecté. */
export async function backfillLivreurAssignments(): Promise<number> {
  const supabase = createAdminClient();

  const { data: livreurs } = await supabase
    .from("profiles")
    .select("id, city")
    .eq("role", "livreur")
    .eq("is_active", true)
    .not("city", "is", null);

  const livreurByCity = new Map<string, string>();
  for (const row of livreurs || []) {
    const c = row.city as string;
    if (c && !livreurByCity.has(c)) {
      livreurByCity.set(c, row.id as string);
    }
  }

  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("id, store_id, city")
    .in("workflow_status", ["ready", "shipping"])
    .is("assigned_livreur_id", null);

  let count = 0;
  for (const order of orders || []) {
    const livreurId = await resolveLivreurForReadyOrder(
      order.store_id as string | null,
      order.city as string | null
    );
    if (!livreurId) continue;

    const { error } = await supabase
      .from("shopify_orders")
      .update({ assigned_livreur_id: livreurId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (!error) count++;
  }

  return count;
}
