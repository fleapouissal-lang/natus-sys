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
  const rawItems = (row.items as Array<Record<string, unknown>>) || [];

  return {
    id: row.id as string,
    from_store_id: row.from_store_id as string,
    to_store_id: row.to_store_id as string,
    status: row.status as HubStockTransfer["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    received_by: (row.received_by as string | null) ?? null,
    sent_at: row.sent_at as string,
    received_at: (row.received_at as string | null) ?? null,
    from_store_name: fromStore?.name ?? null,
    to_store_name: toStore?.name ?? null,
    creator_name: creator?.full_name || creator?.email || null,
    receiver_name: receiver?.full_name || receiver?.email || null,
    items: rawItems.map((item) => {
      const product = unwrapOne(
        item.products as { name: string; barcode: string } | { name: string; barcode: string }[] | null
      );
      return {
        id: item.id as string,
        product_id: item.product_id as string,
        quantity: item.quantity as number,
        product_name: product?.name ?? "Produit",
        product_barcode: product?.barcode ?? "",
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
  sent_at,
  received_at,
  from_store:from_store_id(id, name, city),
  to_store:to_store_id(id, name, city),
  creator:created_by(full_name, email),
  receiver:received_by(full_name, email),
  items:hub_stock_transfer_items(
    id,
    product_id,
    quantity,
    products:product_id(name, barcode)
  )
`;

export async function getHubStockTransfers(options: {
  fromStoreId?: string;
  toStoreId?: string;
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
  return getHubStockTransfers({ toStoreId: storeId, status: "sent", limit: 30 });
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
