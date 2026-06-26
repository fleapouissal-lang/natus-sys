import { createClient } from "@/lib/supabase/server";
import type { HubStockTransfer } from "@/lib/types";

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapTransferRow(row: Record<string, unknown>): HubStockTransfer {
  const fromStore = unwrapOne(
    row.from_store as { id: string; name: string; city: string } | { id: string; name: string; city: string }[] | null
  );
  const toStore = unwrapOne(
    row.to_store as { id: string; name: string; city: string } | { id: string; name: string; city: string }[] | null
  );
  const creator = unwrapOne(
    row.creator as { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
  );
  const receiver = unwrapOne(
    row.receiver as { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
  );
  const livreur = unwrapOne(
    row.livreur as { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
  );
  const rawItems = (row.items as Array<Record<string, unknown>>) || [];

  return {
    id: row.id as string,
    from_store_id: row.from_store_id as string,
    to_store_id: row.to_store_id as string,
    status: row.status as HubStockTransfer["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    received_by: (row.received_by as string | null) ?? null,
    assigned_livreur_id: (row.assigned_livreur_id as string | null) ?? null,
    sent_at: row.sent_at as string,
    ready_at: (row.ready_at as string | null) ?? null,
    picked_up_at: (row.picked_up_at as string | null) ?? null,
    delivered_at: (row.delivered_at as string | null) ?? null,
    received_at: (row.received_at as string | null) ?? null,
    from_store_name: fromStore?.name ?? null,
    to_store_name: toStore?.name ?? null,
    creator_name: creator?.full_name || creator?.email || null,
    receiver_name: receiver?.full_name || receiver?.email || null,
    assigned_livreur_name: livreur?.full_name || livreur?.email || null,
    items: rawItems.map((item) => {
      const product = unwrapOne(
        item.products as
          | { name: string; barcode: string; image_url: string | null }
          | { name: string; barcode: string; image_url: string | null }[]
          | null
      );
      return {
        id: item.id as string,
        product_id: item.product_id as string,
        quantity: item.quantity as number,
        product_name: product?.name ?? "Produit",
        product_barcode: product?.barcode ?? "",
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
  picked_up_at,
  delivered_at,
  received_at,
  from_store:from_store_id(id, name, city),
  to_store:to_store_id(id, name, city),
  creator:created_by(full_name, email),
  receiver:received_by(full_name, email),
  livreur:assigned_livreur_id(full_name, email),
  items:hub_stock_transfer_items(
    id,
    product_id,
    quantity,
    products:product_id(name, barcode, image_url)
  )
`;

export async function getHubStockTransfers(options: {
  fromStoreId?: string;
  toStoreId?: string;
  toStoreIds?: string[];
  status?: HubStockTransfer["status"];
  limit?: number;
}): Promise<HubStockTransfer[]> {
  const supabase = await createClient();
  let query = supabase
    .from("hub_stock_transfers")
    .select(TRANSFER_SELECT)
    .order("sent_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.fromStoreId) {
    query = query.eq("from_store_id", options.fromStoreId);
  }
  if (options.toStoreId) {
    query = query.eq("to_store_id", options.toStoreId);
  }
  if (options.toStoreIds?.length) {
    query = query.in("to_store_id", options.toStoreIds);
  }
  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getHubStockTransfers:", error.message);
    return [];
  }

  return (data || []).map((row) => mapTransferRow(row as Record<string, unknown>));
}

export async function getCashierPendingTransfers(storeId: string): Promise<HubStockTransfer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_stock_transfers")
    .select(TRANSFER_SELECT)
    .eq("to_store_id", storeId)
    .in("status", ["en_cours", "pret", "en_livraison", "livre", "sent"])
    .order("sent_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("getCashierPendingTransfers:", error.message);
    return [];
  }

  return (data || []).map((row) => mapTransferRow(row as Record<string, unknown>));
}

export async function getLivreurHubTransfers(livreurId: string): Promise<HubStockTransfer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hub_stock_transfers")
    .select(TRANSFER_SELECT)
    .eq("assigned_livreur_id", livreurId)
    .in("status", ["pret", "en_livraison", "livre"])
    .order("sent_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("getLivreurHubTransfers:", error.message);
    return [];
  }

  return (data || []).map((row) => mapTransferRow(row as Record<string, unknown>));
}

export async function getHubTransferById(transferId: string): Promise<HubStockTransfer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("hub_stock_transfers")
    .select(TRANSFER_SELECT)
    .eq("id", transferId)
    .maybeSingle();

  if (!data) return null;
  return mapTransferRow(data as Record<string, unknown>);
}

/** Commandes dépôt → magasins visibles par le gérant (lecture seule). */
export async function getManagerHubStockTransfers(storeIds: string[]): Promise<HubStockTransfer[]> {
  if (storeIds.length === 0) return [];
  return getHubStockTransfers({ toStoreIds: storeIds, limit: 100 });
}
