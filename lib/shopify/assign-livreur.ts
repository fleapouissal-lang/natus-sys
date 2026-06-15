import { createAdminClient } from "@/lib/supabase/admin";

/** Livreur actif du magasin (1 par magasin) — service role pour bypass RLS. */
export async function getStoreLivreurId(storeId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "livreur")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function resolveLivreurForReadyOrder(
  storeId: string | null
): Promise<string | null> {
  if (!storeId) return null;
  return getStoreLivreurId(storeId);
}

/** Affecte le livreur du magasin à une commande prête (ou en livraison). */
export async function assignOrderToStoreLivreur(
  orderId: string,
  storeId: string | null
): Promise<string | null> {
  const livreurId = await resolveLivreurForReadyOrder(storeId);
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
    .select("id, store_id")
    .eq("role", "livreur")
    .eq("is_active", true)
    .not("store_id", "is", null);

  const livreurByStore = new Map(
    (livreurs || []).map((row) => [row.store_id as string, row.id as string])
  );

  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("id, store_id")
    .in("workflow_status", ["ready", "shipping"])
    .is("assigned_livreur_id", null)
    .not("store_id", "is", null);

  let count = 0;
  for (const order of orders || []) {
    const livreurId = livreurByStore.get(order.store_id as string);
    if (!livreurId) continue;
    const { error } = await supabase
      .from("shopify_orders")
      .update({ assigned_livreur_id: livreurId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (!error) count++;
  }

  return count;
}
