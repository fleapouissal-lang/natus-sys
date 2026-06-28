"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRestockSourceProducts } from "@/lib/restock/restock.server";
import type { Product } from "@/lib/types";

export type RestockOrderItem = { productId: string; quantity: number };

/** Catalogue + stock disponible pour une source (dépôt ou magasin). */
export async function fetchRestockSourceProducts(
  sourceId: string
): Promise<{ products: Product[] } | { error: string }> {
  const profile = await requireRole(["cashier", "manager", "directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };
  if (!sourceId) return { error: "Source requise" };

  try {
    const products = await getRestockSourceProducts(sourceId);
    return { products };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Chargement du stock impossible",
    };
  }
}

/** Crée une commande de réapprovisionnement depuis une source vers le magasin du caissier. */
export async function submitCashierRestockOrder(
  sourceId: string,
  items: RestockOrderItem[],
  notes?: string
): Promise<
  { success: true; transferId: string; sourceName: string; kind: string } | { error: string }
> {
  const profile = await requireRole(["cashier", "manager", "directeur", "admin"]);
  if (!profile) return { error: "Non autorisé" };
  if (!profile.store_id) return { error: "Aucun magasin associé à votre compte" };
  if (!sourceId) return { error: "Sélectionnez une source de commande" };

  const cleaned = items
    .map((item) => ({
      product_id: item.productId,
      quantity: Math.floor(item.quantity),
    }))
    .filter((item) => item.product_id && item.quantity > 0);

  if (cleaned.length === 0) {
    return { error: "Indiquez au moins une quantité à commander" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_cashier_restock_order", {
    p_source_id: sourceId,
    p_items: cleaned,
    p_notes: notes?.trim() || null,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes("Stock insuffisant")) {
      return {
        error: "Stock insuffisant à la source pour un ou plusieurs produits",
      };
    }
    if (msg.includes("invalide") || msg.includes("introuvable")) {
      return { error: "Source de commande invalide" };
    }
    return { error: msg };
  }

  revalidatePath("/cashier/commander");
  revalidatePath("/cashier/transfers/received");
  revalidatePath("/cashier/transfers/sent");
  revalidatePath("/cashier/pos");

  const payload =
    typeof data === "object" && data !== null
      ? (data as { transfer_id?: string; source?: string; kind?: string })
      : {};

  return {
    success: true,
    transferId: String(payload.transfer_id || ""),
    sourceName: String(payload.source || ""),
    kind: String(payload.kind || ""),
  };
}
