import type { Product, ShopifyLineItemRow, Store } from "@/lib/types";
import { assignClosestStore } from "@/lib/shopify/assign-store";
import { resolveProductForLineItem, type ProductLineLookup } from "@/lib/shopify/order-cart";

export type OrderStockRequirement = { productId: string; quantity: number };

type StoreWithCoords = Pick<Store, "id" | "name" | "city" | "address" | "is_hub"> & {
  lat: number | null;
  lng: number | null;
};

type InventoryRow = { store_id: string; product_id: string; stock: number };

export function orderLineItemsToRequirements(
  lineItems: ShopifyLineItemRow[],
  products: ProductLineLookup[]
): { requirements: OrderStockRequirement[]; unresolved: string[] } {
  const qtyByProduct = new Map<string, number>();
  const unresolved: string[] = [];

  for (const item of lineItems) {
    const product = resolveProductForLineItem(item, products);
    if (!product) {
      unresolved.push(item.title);
      continue;
    }
    const qty = Math.max(1, item.quantity);
    qtyByProduct.set(product.id, (qtyByProduct.get(product.id) ?? 0) + qty);
  }

  return {
    requirements: [...qtyByProduct.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    })),
    unresolved,
  };
}

function buildInventoryByStore(
  rows: InventoryRow[]
): Map<string, Map<string, number>> {
  const byStore = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!byStore.has(row.store_id)) byStore.set(row.store_id, new Map());
    byStore.get(row.store_id)!.set(row.product_id, row.stock);
  }
  return byStore;
}

export function storeCanFulfillOrder(
  storeId: string,
  requirements: OrderStockRequirement[],
  inventoryByStore: Map<string, Map<string, number>>
): boolean {
  if (requirements.length === 0) return false;
  const stock = inventoryByStore.get(storeId);
  if (!stock) return false;
  return requirements.every((req) => (stock.get(req.productId) ?? 0) >= req.quantity);
}

export async function loadInventoryForStores(
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  storeIds: string[],
  productIds: string[]
): Promise<Map<string, Map<string, number>>> {
  if (storeIds.length === 0 || productIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("store_inventory")
    .select("store_id, product_id, stock")
    .in("store_id", storeIds)
    .in("product_id", productIds);

  if (error) {
    console.error("loadInventoryForStores:", error.message);
    return new Map();
  }

  return buildInventoryByStore(data || []);
}

export type OrderRouteSuggestion = {
  targetStoreId: string | null;
  targetStoreName: string | null;
  routedToHub: boolean;
  currentStoreCanFulfill: boolean;
  reason: string;
};

/** Affectation : magasin le plus proche (même ville) → autre magasin ville si stock complet → hub. */
export async function resolveOrderStoreByStock(opts: {
  supabase: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>;
  lineItems: ShopifyLineItemRow[];
  products: ProductLineLookup[];
  retailStores: StoreWithCoords[];
  hubStore: Pick<Store, "id" | "name" | "is_hub"> | null;
  shippingAddress: string;
  shippingLat: number | null;
  shippingLng: number | null;
  updateStoreCoords: (id: string, lat: number, lng: number) => Promise<void>;
  currentStoreId?: string | null;
}): Promise<OrderRouteSuggestion> {
  const {
    supabase,
    lineItems,
    products,
    retailStores,
    hubStore,
    shippingAddress,
    shippingLat,
    shippingLng,
    updateStoreCoords,
    currentStoreId,
  } = opts;

  const retail = retailStores.filter((s) => !s.is_hub);
  const { requirements, unresolved } = orderLineItemsToRequirements(lineItems, products);

  if (requirements.length === 0) {
    const fallbackId = await assignClosestStore(
      retail,
      shippingAddress,
      shippingLat,
      shippingLng,
      updateStoreCoords
    );
    const fallback = retail.find((s) => s.id === fallbackId);
    return {
      targetStoreId: fallbackId,
      targetStoreName: fallback?.name ?? null,
      routedToHub: false,
      currentStoreCanFulfill: false,
      reason:
        unresolved.length > 0
          ? `Produits non référencés (${unresolved.join(", ")}) — affectation par proximité`
          : "Affectation par proximité",
    };
  }

  const storeIds = [
    ...retail.map((s) => s.id),
    ...(hubStore ? [hubStore.id] : []),
  ];
  const productIds = requirements.map((r) => r.productId);
  const inventoryByStore = await loadInventoryForStores(supabase, storeIds, productIds);

  if (currentStoreId && storeCanFulfillOrder(currentStoreId, requirements, inventoryByStore)) {
    const current = retail.find((s) => s.id === currentStoreId) ?? hubStore;
    return {
      targetStoreId: currentStoreId,
      targetStoreName: current?.name ?? null,
      routedToHub: hubStore?.id === currentStoreId,
      currentStoreCanFulfill: true,
      reason: "Stock suffisant dans ce magasin",
    };
  }

  const closestId = await assignClosestStore(
    retail,
    shippingAddress,
    shippingLat,
    shippingLng,
    updateStoreCoords
  );

  const cityCandidates = retail.filter(
    (s) =>
      s.id !== currentStoreId &&
      storeCanFulfillOrder(s.id, requirements, inventoryByStore)
  );

  if (cityCandidates.length > 0) {
    const targetId = await assignClosestStore(
      cityCandidates,
      shippingAddress,
      shippingLat,
      shippingLng,
      updateStoreCoords
    );
    const target = cityCandidates.find((s) => s.id === targetId);
    const isClosest =
      Boolean(closestId && targetId === closestId) &&
      storeCanFulfillOrder(closestId!, requirements, inventoryByStore);

    return {
      targetStoreId: targetId,
      targetStoreName: target?.name ?? null,
      routedToHub: false,
      currentStoreCanFulfill: false,
      reason: isClosest
        ? "Magasin le plus proche — stock complet"
        : "Autre magasin de la ville — stock complet",
    };
  }

  if (
    hubStore &&
    storeCanFulfillOrder(hubStore.id, requirements, inventoryByStore)
  ) {
    return {
      targetStoreId: hubStore.id,
      targetStoreName: hubStore.name,
      routedToHub: true,
      currentStoreCanFulfill: false,
      reason: "Hub ville — stock complet pour toute la commande",
    };
  }

  if (hubStore && currentStoreId && currentStoreId !== hubStore.id) {
    return {
      targetStoreId: hubStore.id,
      targetStoreName: hubStore.name,
      routedToHub: true,
      currentStoreCanFulfill: false,
      reason: "Aucun magasin retail avec stock complet — routage hub",
    };
  }

  if (hubStore && !currentStoreId) {
    return {
      targetStoreId: hubStore.id,
      targetStoreName: hubStore.name,
      routedToHub: true,
      currentStoreCanFulfill: false,
      reason: "Aucun magasin avec stock complet — routage hub en attente",
    };
  }

  const fallbackId = await assignClosestStore(
    retail,
    shippingAddress,
    shippingLat,
    shippingLng,
    updateStoreCoords
  );
  const fallback = retail.find((s) => s.id === fallbackId);

  return {
    targetStoreId: fallbackId,
    targetStoreName: fallback?.name ?? null,
    routedToHub: false,
    currentStoreCanFulfill: false,
    reason: "Aucun magasin avec stock complet — affectation par proximité",
  };
}
