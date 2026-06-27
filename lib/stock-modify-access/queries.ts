import { createClient } from "@/lib/supabase/server";
import { toLocalDateKey } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { isDirector } from "@/lib/permissions";
import type {
  ActiveStockModifyGrant,
  StockModifyAccessMovement,
  StockModifyAccessRequest,
} from "@/lib/stock-modify-access/types";
import { resolveEffectiveStockModifyGrant } from "@/lib/stock-modify-access/utils";

export {
  isAccessRequestActive,
  formatAccessPeriod,
  resolveEffectiveStockModifyGrant,
  hasRejectedAccessForStore,
  isRequestEffectiveGrant,
  requestAppliesToStore,
  isDateInAccessPeriod,
} from "@/lib/stock-modify-access/utils";

const REQUEST_SELECT =
  "*, requester:requester_id(full_name, email, city), reviewer:reviewed_by(full_name, email), stores:stock_modify_access_request_stores(store_id, stores:store_id(id, name, city)), hub_store:hub_store_id(id, name, city)";

function mapRequest(row: Record<string, unknown>): StockModifyAccessRequest {
  const storeLinks = row.stores as
    | { store_id: string; stores: { id: string; name: string; city: string } | null }[]
    | null;
  const stores = (storeLinks || [])
    .map((link) => link.stores)
    .filter((s): s is { id: string; name: string; city: string } => Boolean(s));

  return {
    id: row.id as string,
    requester_id: row.requester_id as string,
    requester_role: row.requester_role as "manager" | "hub",
    status: row.status as StockModifyAccessRequest["status"],
    valid_from: row.valid_from as string,
    valid_to: row.valid_to as string,
    hub_store_id: (row.hub_store_id as string | null) ?? null,
    request_note: (row.request_note as string | null) ?? null,
    review_note: (row.review_note as string | null) ?? null,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
    store_ids: stores.map((s) => s.id),
    requester: row.requester as StockModifyAccessRequest["requester"],
    reviewer: row.reviewer as StockModifyAccessRequest["reviewer"],
    stores,
    hub_store: row.hub_store as StockModifyAccessRequest["hub_store"],
  };
}

export async function getActiveStockModifyGrant(
  profile: Profile,
  storeId: string
): Promise<ActiveStockModifyGrant | null> {
  if (isDirector(profile)) return null;

  const supabase = await createClient();
  const today = toLocalDateKey(new Date());

  const { data, error } = await supabase
    .from("stock_modify_access_requests")
    .select(
      "id, status, valid_from, valid_to, hub_store_id, reviewed_at, requester_role, stores:stock_modify_access_request_stores(store_id)"
    )
    .eq("requester_id", profile.id)
    .lte("valid_from", today)
    .gte("valid_to", today);

  if (error || !data?.length) return null;

  const requests: StockModifyAccessRequest[] = data.map((row) => {
    const storeLinks = row.stores as { store_id: string }[] | null;
    return {
      id: row.id as string,
      requester_id: profile.id,
      requester_role: row.requester_role as StockModifyAccessRequest["requester_role"],
      status: row.status as StockModifyAccessRequest["status"],
      valid_from: row.valid_from as string,
      valid_to: row.valid_to as string,
      hub_store_id: (row.hub_store_id as string | null) ?? null,
      request_note: null,
      review_note: null,
      reviewed_by: null,
      reviewed_at: (row.reviewed_at as string | null) ?? null,
      created_at: "",
      store_ids: (storeLinks || []).map((link) => link.store_id),
    };
  });

  const effective = resolveEffectiveStockModifyGrant(requests, storeId, today);
  if (!effective) return null;

  return {
    requestId: effective.requestId,
    storeId,
    validFrom: effective.validFrom,
    validTo: effective.validTo,
    canEditTotal: true,
  };
}

export async function listStockModifyAccessRequests(input?: {
  status?: StockModifyAccessRequest["status"];
  requesterId?: string;
}): Promise<StockModifyAccessRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from("stock_modify_access_requests")
    .select(REQUEST_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);

  if (input?.status) query = query.eq("status", input.status);
  if (input?.requesterId) query = query.eq("requester_id", input.requesterId);

  const { data, error } = await query;
  if (error) {
    if (!error.message.includes("schema cache") && !error.message.includes("does not exist")) {
      console.error("[stock-modify-access] list:", error.message);
    }
    return [];
  }

  return (data || []).map((row) => mapRequest(row as Record<string, unknown>));
}

export async function listStockModifyAccessMovements(input?: {
  limit?: number;
}): Promise<StockModifyAccessMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select(
      "id, product_id, quantity, type, notes, created_at, store_id, access_request_id, products(name, barcode), stores!stock_movements_store_id_fkey(name, city), profiles:created_by(full_name, email, role), access_request:access_request_id(valid_from, valid_to, requester_role)"
    )
    .not("access_request_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(input?.limit ?? 100);

  if (error) {
    if (!error.message.includes("schema cache") && !error.message.includes("does not exist")) {
      console.error("[stock-modify-access] movements:", error.message);
    }
    return [];
  }

  return (data || []).map((row) => {
    const products = row.products as { name: string; barcode: string | null } | { name: string; barcode: string | null }[] | null;
    const stores = row.stores as { name: string; city: string } | { name: string; city: string }[] | null;
    const profiles = row.profiles as
      | { full_name: string | null; email: string; role: string }
      | { full_name: string | null; email: string; role: string }[]
      | null;
    const accessRequest = row.access_request as
      | { valid_from: string; valid_to: string; requester_role: string }
      | { valid_from: string; valid_to: string; requester_role: string }[]
      | null;

    return {
      id: row.id as string,
      product_id: row.product_id as string,
      quantity: row.quantity as number,
      type: row.type as string,
      notes: (row.notes as string | null) ?? null,
      created_at: row.created_at as string,
      store_id: (row.store_id as string | null) ?? null,
      access_request_id: (row.access_request_id as string | null) ?? null,
      product: Array.isArray(products) ? products[0] : products,
      store: Array.isArray(stores) ? stores[0] : stores,
      actor: Array.isArray(profiles) ? profiles[0] : profiles,
      access_request: Array.isArray(accessRequest) ? accessRequest[0] : accessRequest,
    } satisfies StockModifyAccessMovement;
  });
}
