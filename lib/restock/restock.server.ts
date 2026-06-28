import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getHubStoreForRetailStore } from "@/lib/hub";
import {
  getAllActiveTransferSites,
  getProductsWithStoreStockForTransfer,
} from "@/lib/transfer-sites.server";
import { isSellableProduct } from "@/lib/products/product-utils";
import type { Product, Store } from "@/lib/types";

export type RestockSource = {
  id: string;
  name: string;
  city: string | null;
  is_hub: boolean;
};

export type RestockContext = {
  storeId: string;
  defaultSourceId: string | null;
  sources: RestockSource[];
  /** Produits en rupture au magasin, hors produits déjà commandés (transfert entrant en cours). */
  outOfStockProductIds: string[];
  /** Produits déjà commandés (transfert entrant non encore reçu). */
  pendingProductIds: string[];
};

function toSource(store: Store): RestockSource {
  return {
    id: store.id,
    name: store.name,
    city: store.city ?? null,
    is_hub: Boolean(store.is_hub),
  };
}

/** Produits ayant un transfert entrant non encore reçu vers ce magasin. */
export async function getPendingIncomingProductIds(
  storeId: string
): Promise<string[]> {
  if (!storeId) return [];
  const admin = createAdminClient();

  const [storeTransfers, hubTransfers] = await Promise.all([
    admin
      .from("store_stock_transfers")
      .select("id")
      .eq("to_store_id", storeId)
      .neq("status", "received"),
    admin
      .from("hub_stock_transfers")
      .select("id")
      .eq("to_store_id", storeId)
      .neq("status", "received"),
  ]);

  const storeIds = (storeTransfers.data || []).map((t) => t.id as string);
  const hubIds = (hubTransfers.data || []).map((t) => t.id as string);

  const productIds = new Set<string>();

  if (storeIds.length > 0) {
    const { data } = await admin
      .from("store_stock_transfer_items")
      .select("product_id")
      .in("transfer_id", storeIds);
    (data || []).forEach((row) => productIds.add(row.product_id as string));
  }

  if (hubIds.length > 0) {
    const { data } = await admin
      .from("hub_stock_transfer_items")
      .select("product_id")
      .in("transfer_id", hubIds);
    (data || []).forEach((row) => productIds.add(row.product_id as string));
  }

  return [...productIds];
}

/** Identifiants des produits en rupture (stock <= 0) au magasin. */
async function getOutOfStockProductIds(storeId: string): Promise<string[]> {
  if (!storeId) return [];
  const admin = createAdminClient();

  const { data } = await admin
    .from("store_inventory")
    .select("product_id, stock, products(product_kind)")
    .eq("store_id", storeId)
    .lte("stock", 0);

  return (data || [])
    .filter((row) => {
      const product = row.products as { product_kind?: string | null } | null;
      return product?.product_kind !== "parent";
    })
    .map((row) => row.product_id as string);
}

/**
 * Nombre de produits en rupture commandables (rupture - déjà commandés).
 * Utilisé pour le badge du bouton « Commander » en caisse.
 */
export async function getRestockBadgeCount(storeId: string): Promise<number> {
  if (!storeId) return 0;
  const [outOfStock, pending] = await Promise.all([
    getOutOfStockProductIds(storeId),
    getPendingIncomingProductIds(storeId),
  ]);
  const pendingSet = new Set(pending);
  return outOfStock.filter((id) => !pendingSet.has(id)).length;
}

/** Contexte serveur pour la page « Commander » du caissier. */
export async function getCashierRestockContext(
  storeId: string,
  storeCity: string | null
): Promise<RestockContext> {
  const [outOfStock, pending, defaultHub, allSites] = await Promise.all([
    getOutOfStockProductIds(storeId),
    getPendingIncomingProductIds(storeId),
    getHubStoreForRetailStore(storeId),
    getAllActiveTransferSites(),
  ]);

  const pendingSet = new Set(pending);
  const orderableOutOfStock = outOfStock.filter((id) => !pendingSet.has(id));

  // Sources : tous les magasins/dépôts actifs sauf le magasin du caissier.
  // Priorité : dépôt rattaché en premier, puis dépôts de la ville, puis magasins.
  const sources = allSites
    .filter((s) => s.id !== storeId)
    .map(toSource)
    .sort((a, b) => {
      const aHub = a.is_hub ? 0 : 1;
      const bHub = b.is_hub ? 0 : 1;
      if (aHub !== bHub) return aHub - bHub;
      const aSameCity = a.city === storeCity ? 0 : 1;
      const bSameCity = b.city === storeCity ? 0 : 1;
      if (aSameCity !== bSameCity) return aSameCity - bSameCity;
      return a.name.localeCompare(b.name, "fr");
    });

  let defaultSourceId: string | null = null;
  if (defaultHub && sources.some((s) => s.id === defaultHub.id)) {
    defaultSourceId = defaultHub.id;
  } else {
    defaultSourceId = sources[0]?.id ?? null;
  }

  return {
    storeId,
    defaultSourceId,
    sources,
    outOfStockProductIds: orderableOutOfStock,
    pendingProductIds: pending,
  };
}

/** Produits du catalogue avec le stock disponible à la source sélectionnée. */
export async function getRestockSourceProducts(
  sourceId: string
): Promise<Product[]> {
  if (!sourceId) return [];
  const products = await getProductsWithStoreStockForTransfer(sourceId);
  return products.filter(isSellableProduct);
}
