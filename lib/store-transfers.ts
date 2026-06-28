import { createClient } from "@/lib/supabase/server";
import type { StoreStockTransfer } from "@/lib/types";

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapTransferRow(row: Record<string, unknown>): StoreStockTransfer {
  const fromStore = unwrapOne(
    row.from_store as { name: string; city: string } | { name: string; city: string }[] | null
  );
  const toStore = unwrapOne(
    row.to_store as { name: string; city: string } | { name: string; city: string }[] | null
  );
  const creator = unwrapOne(
    row.creator as { full_name: string | null; email: string } | null
  );
  const receiver = unwrapOne(
    row.receiver as { full_name: string | null; email: string } | null
  );
  const shipper = unwrapOne(
    row.shipper as { full_name: string | null; email: string } | null
  );
  const livreur = unwrapOne(
    row.livreur as { full_name: string | null; email: string } | null
  );
  const rawItems = (row.items as Array<Record<string, unknown>>) || [];

  return {
    id: row.id as string,
    from_store_id: row.from_store_id as string,
    to_store_id: row.to_store_id as string,
    status: row.status as StoreStockTransfer["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    received_by: (row.received_by as string | null) ?? null,
    assigned_livreur_id: (row.assigned_livreur_id as string | null) ?? null,
    sent_at: row.sent_at as string,
    ready_at: (row.ready_at as string | null) ?? null,
    shipped_at: (row.shipped_at as string | null) ?? null,
    picked_up_at: (row.picked_up_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
    received_at: (row.received_at as string | null) ?? null,
    from_store_name: fromStore?.name ?? null,
    to_store_name: toStore?.name ?? null,
    from_store_city: fromStore?.city ?? null,
    to_store_city: toStore?.city ?? null,
    creator_name: creator?.full_name || creator?.email || null,
    receiver_name: receiver?.full_name || receiver?.email || null,
    shipper_name: shipper?.full_name || shipper?.email || null,
    assigned_livreur_name: livreur?.full_name || livreur?.email || null,
    items: rawItems.map((item) => {
      const product = unwrapOne(
        item.products as
          | { name: string; barcode: string | null; product_code: string | null; image_url: string | null }
          | null
      );
      return {
        id: item.id as string,
        product_id: item.product_id as string,
        quantity: item.quantity as number,
        product_name: product?.name ?? "Produit",
        product_barcode: product?.barcode ?? "",
        product_code: product?.product_code ?? null,
        product_image_url: product?.image_url ?? null,
      };
    }),
    total_units: rawItems.reduce((sum, item) => sum + (item.quantity as number), 0),
  };
}

const TRANSFER_SELECT = `
  id,
  from_store_id,
  to_store_id,
  status,
  notes,
  created_by,
  received_by,
  assigned_livreur_id,
  sent_at,
  ready_at,
  shipped_at,
  picked_up_at,
  delivered_at,
  received_at,
  from_store:from_store_id(name, city),
  to_store:to_store_id(name, city),
  creator:created_by(full_name, email),
  receiver:received_by(full_name, email),
  shipper:shipped_by(full_name, email),
  livreur:assigned_livreur_id(full_name, email),
  items:store_stock_transfer_items(
    id,
    product_id,
    quantity,
    products:product_id(name, barcode, product_code, image_url)
  )
`;

export async function getStoreStockTransfers(options: {
  fromStoreId?: string;
  fromStoreIds?: string[];
  toStoreId?: string;
  storeIds?: string[];
  limit?: number;
}): Promise<StoreStockTransfer[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_stock_transfers")
    .select(TRANSFER_SELECT)
    .order("sent_at", { ascending: false })
    .limit(options.limit ?? 100);

  if (options.fromStoreId) {
    query = query.eq("from_store_id", options.fromStoreId);
  }
  if (options.fromStoreIds?.length) {
    query = query.in("from_store_id", options.fromStoreIds);
  }
  if (options.toStoreId) {
    query = query.eq("to_store_id", options.toStoreId);
  }
  if (options.storeIds?.length) {
    const ids = options.storeIds.join(",");
    query = query.or(`from_store_id.in.(${ids}),to_store_id.in.(${ids})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getStoreStockTransfers:", error.message);
    return [];
  }

  return (data || []).map((row) => mapTransferRow(row as Record<string, unknown>));
}

/** Commandes inter-magasins envoyées par des magasins sources (lecture dépôt). */
export async function getOutgoingStoreStockTransfers(
  fromStoreIds: string[]
): Promise<StoreStockTransfer[]> {
  if (fromStoreIds.length === 0) return [];
  return getStoreStockTransfers({ fromStoreIds, limit: 100 });
}

export async function getDirectorStoreStockTransfers(): Promise<StoreStockTransfer[]> {
  return getStoreStockTransfers({ limit: 200 });
}

export function filterInterStoreOutgoingTransfers(
  transfers: StoreStockTransfer[],
  retailStoreIds: string[]
): StoreStockTransfer[] {
  const ids = new Set(retailStoreIds);
  return transfers.filter(
    (transfer) =>
      ids.has(transfer.from_store_id) &&
      ids.has(transfer.to_store_id) &&
      transfer.from_store_id !== transfer.to_store_id
  );
}

/** Transferts inter-magasins reçus par les magasins retail du périmètre. */
export function filterInterStoreIncomingTransfers(
  transfers: StoreStockTransfer[],
  retailStoreIds: string[]
): StoreStockTransfer[] {
  const ids = new Set(retailStoreIds);
  return transfers.filter(
    (transfer) =>
      ids.has(transfer.to_store_id) &&
      ids.has(transfer.from_store_id) &&
      transfer.from_store_id !== transfer.to_store_id
  );
}

export async function getManagerStoreStockTransfers(
  storeIds: string[]
): Promise<StoreStockTransfer[]> {
  if (storeIds.length === 0) return [];
  return getStoreStockTransfers({ storeIds, limit: 100 });
}

export async function getCashierStoreStockTransfers(
  storeId: string
): Promise<StoreStockTransfer[]> {
  if (!storeId) return [];
  return getStoreStockTransfers({ storeIds: [storeId], limit: 100 });
}

/** Transferts inter-magasins envoyés depuis le magasin caissier. */
export async function getCashierOutgoingStoreTransfers(
  storeId: string
): Promise<StoreStockTransfer[]> {
  if (!storeId) return [];
  return getStoreStockTransfers({ fromStoreId: storeId, limit: 100 });
}

/** Transferts inter-magasins reçus par le magasin caissier. */
export async function getCashierIncomingStoreTransfers(
  storeId: string
): Promise<StoreStockTransfer[]> {
  if (!storeId) return [];
  return getStoreStockTransfers({ toStoreId: storeId, limit: 100 });
}

export async function getLivreurStoreStockTransfers(
  livreurId: string
): Promise<StoreStockTransfer[]> {
  if (!livreurId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_stock_transfers")
    .select(TRANSFER_SELECT)
    .eq("assigned_livreur_id", livreurId)
    .in("status", ["pret", "en_livraison", "livre"])
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getLivreurStoreStockTransfers:", error.message);
    return [];
  }

  return (data || []).map((row) => mapTransferRow(row as Record<string, unknown>));
}
